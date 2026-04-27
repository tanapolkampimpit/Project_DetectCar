import time
import asyncio
import threading
import logging
import concurrent.futures
from dataclasses import dataclass, field
import numpy as np
import torch
from fastapi.concurrency import run_in_threadpool
from app.core.config import settings
from app.services.analyzer import build_result

logger = logging.getLogger("analyze_api")

@dataclass
class BatchItem:
    request_id   : str
    expected_view: str
    img          : np.ndarray                  
    tensor       : torch.Tensor                
    future       : asyncio.Future              
    blur_score   : float = 0.0
    enqueue_at   : float = field(default_factory=time.monotonic)

class BackpressureGate:
    def __init__(self, max_depth: int):
        self._max   = max_depth
        self._count = 0
        self._lock  = threading.Lock()

    def acquire(self) -> bool:
        with self._lock:
            if self._count >= self._max: return False
            self._count += 1
            return True

    def release(self):
        with self._lock:
            self._count = max(0, self._count - 1)

backpressure = BackpressureGate(settings.MAX_QUEUE_DEPTH)

class TelemetryTracker:
    def __init__(self):
        self.total_processed = 0
        self.total_errors    = 0
        self.latency_sum     = 0.0
        self.batch_sizes     = []
        self._lock           = threading.Lock()
        self._start_time     = time.monotonic()

    def record_batch(self, size: int, avg_latency_ms: float, error_count: int):
        with self._lock:
            self.total_processed += size
            self.total_errors    += error_count
            self.latency_sum     += (avg_latency_ms * size)
            self.batch_sizes.append(size)
            if len(self.batch_sizes) > 100: self.batch_sizes.pop(0)

    def get_stats(self):
        with self._lock:
            avg_lat = self.latency_sum / self.total_processed if self.total_processed > 0 else 0
            avg_batch = sum(self.batch_sizes) / len(self.batch_sizes) if self.batch_sizes else 0
            return {
                "total_processed": self.total_processed,
                "total_errors": self.total_errors,
                "avg_latency_ms": round(avg_lat, 2),
                "avg_batch_efficiency": round(avg_batch, 2),
                "uptime_seconds": round(time.monotonic() - self._start_time, 1)
            }

metrics = TelemetryTracker()

MODEL_THREAD_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=6)

class BatchInferenceEngine:
    def __init__(self, convnext, yolo, loop: asyncio.AbstractEventLoop, max_queue: int):
        self.convnext = convnext
        self.yolo     = yolo
        self.loop     = loop
        self._queue: asyncio.Queue[BatchItem] = asyncio.Queue(maxsize=max_queue)
        self._tasks: list[asyncio.Task]       = []

    def start(self):
        for i in range(settings.NUM_BATCH_WORKERS):
            task = self.loop.create_task(self._worker(i))
            self._tasks.append(task)
        logger.info("Batch Engine started | workers=%d | batch_size=%d", settings.NUM_BATCH_WORKERS, settings.BATCH_MAX_SIZE)

    async def stop(self):
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        
        while not self._queue.empty():
            item = self._queue.get_nowait()
            if not item.future.done():
                item.future.set_exception(RuntimeError("Server shutting down"))
            backpressure.release()

    def submit_nowait(self, item: BatchItem):
        self._queue.put_nowait(item)

    async def _worker(self, worker_id: int):
        while True:
            batch: list[BatchItem] = []
            try:
                first = await self._queue.get()
                batch.append(first)
            except asyncio.CancelledError:
                break

            deadline = time.monotonic() + settings.BATCH_MAX_WAIT
            while len(batch) < settings.BATCH_MAX_SIZE:
                remaining = deadline - time.monotonic()
                if remaining <= 0: break
                try:
                    item = await asyncio.wait_for(self._queue.get(), timeout=remaining)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break  

            logger.debug("[Worker-%d] Dispatching batch | size=%d", worker_id, len(batch))
            await run_in_threadpool(self._run_batch_sync, batch)

    def _safe_set_future(self, future: asyncio.Future, result=None, exc=None):
        if not future.done():
            if exc: future.set_exception(exc)
            else:   future.set_result(result)

    def _run_batch_sync(self, batch: list[BatchItem]):
        t_start = time.monotonic()
        
        tensors = torch.stack([item.tensor for item in batch])
        if settings.USE_GPU:
            tensors = tensors.pin_memory().to(settings.DEVICE, non_blocking=True).half()
        else:
            tensors = tensors.to(settings.DEVICE)
            
        imgs = [item.img for item in batch]

        def run_convnext_task():
            with torch.inference_mode():
                c_out, _ = self.convnext(tensors)
                return torch.softmax(c_out, dim=1).float().cpu().numpy()

        def run_yolo_task():
            if self.yolo is None: return None
            try:
                return self.yolo(imgs, verbose=False)
            except Exception as e:
                logger.warning("YOLO error: %s", e)
                return None

        future_convnext = MODEL_THREAD_POOL.submit(run_convnext_task)
        future_yolo     = MODEL_THREAD_POOL.submit(run_yolo_task)

        probs_np     = future_convnext.result()
        yolo_results = future_yolo.result()

        t_end = time.monotonic()
        logger.debug(f" Batch done | size={len(batch)} | total_inference_time={(t_end - t_start) * 1000}")

        for i, item in enumerate(batch):
            try:
                result = build_result(
                    item       = item,
                    probs      = probs_np[i],
                    yolo_out   = yolo_results[i] if yolo_results else None,
                    total_ms   = (time.monotonic() - item.enqueue_at) * 1000,
                    settings   = settings
                )
                logger.info(
                    "[%s] Analyze done | expected='%s' → predicted='%s' | conf=%.1f | is_car=%s | match=%s | blur=%.1f | far=%s | %.0fms",
                    item.request_id, item.expected_view, result["prediction"]["label"], result["prediction"]["confidence"], result["is_car"], result["match"], item.blur_score, result["quality"]["is_too_far"], result["time_ms"]
                )
                self.loop.call_soon_threadsafe(self._safe_set_future, item.future, result, None)
            except Exception as exc:
                self.loop.call_soon_threadsafe(self._safe_set_future, item.future, None, exc)

        duration_ms = (time.monotonic() - t_start) * 1000
        metrics.record_batch(len(batch), duration_ms / len(batch), 0)

        for _ in batch:
            backpressure.release()
