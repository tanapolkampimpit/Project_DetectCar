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
from app.core.labels import LABELS, EXTERIOR_LABELS, THAI_TO_EN_CLASS_MAP
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

    @property
    def current_count(self) -> int:
        with self._lock:
            return self._count

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
    def __init__(self, convnext, yolo_gen, yolo_damage, loop: asyncio.AbstractEventLoop, max_queue: int):
        self.convnext  = convnext
        self.yolo_gen  = yolo_gen
        self.yolo_damage = yolo_damage
        self.loop      = loop
        self._queue: asyncio.Queue[BatchItem] = asyncio.Queue(maxsize=max_queue)
        self._tasks: list[asyncio.Task]       = []
        self.yolo_gen_lock = threading.Lock()
        self.yolo_damage_lock = threading.Lock()

    @property
    def queue_depth(self) -> int:
        return self._queue.qsize()

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
            await self.loop.run_in_executor(MODEL_THREAD_POOL, self._run_batch_sync, batch)

    def _safe_set_future(self, future: asyncio.Future, result=None, exc=None):
        if not future.done():
            try:
                if exc: future.set_exception(exc)
                else:   future.set_result(result)
            except asyncio.InvalidStateError:
                logger.debug("Future was already completed (likely timeout/cancellation)")

    def _run_batch_sync(self, batch: list[BatchItem]):
        t_start = time.monotonic()
        original_batch = batch

        try:
            # ============================================
            # FILTER CANCELLED
            # ============================================
            batch = [item for item in batch if not item.future.cancelled()]
            if not batch:
                return

            # ============================================
            # BUILD BATCH TENSOR
            # ============================================
            tensors = torch.stack([item.tensor for item in batch])

            if settings.USE_GPU:
                # Dynamic check: Only cast to half precision if the model is actually loaded in FP16
                is_half = next(self.convnext.parameters()).dtype == torch.float16
                if is_half:
                    tensors = tensors.to(
                        settings.DEVICE,
                        non_blocking=True
                    ).half()
                else:
                    tensors = tensors.to(
                        settings.DEVICE,
                        non_blocking=True
                    )
            else:
                tensors = tensors.to(settings.DEVICE)

            # ============================================
            # YOLO GATEKEEPER
            # ============================================
            yolo_gen_results = None
            imgs_bgr = None

            if self.yolo_gen is not None or self.yolo_damage is not None:
                imgs_bgr = [item.img[:, :, ::-1] for item in batch]

            if self.yolo_gen is not None:
                try:
                    with torch.inference_mode():
                        with self.yolo_gen_lock:
                            yolo_gen_results = self.yolo_gen(
                                imgs_bgr,
                                verbose=False,
                                device=settings.DEVICE
                            )

                except Exception as e:
                    logger.warning(
                        "YOLO gatekeeper failed: %s",
                        e
                    )

            # ============================================
            # YOLO DAMAGE DETECTION (Conditional)
            # ============================================
            yolo_damage_results = [None] * len(batch)
            damage_indices = []

            if self.yolo_gen is not None and yolo_gen_results is not None:
                for idx, yolo_out in enumerate(yolo_gen_results):
                    needs_damage = False
                    if hasattr(yolo_out, "probs") and yolo_out.probs is not None:
                        top_conf_idx = int(yolo_out.probs.top1)
                        class_name = yolo_out.names[top_conf_idx]
                        mapped_name = THAI_TO_EN_CLASS_MAP.get(class_name, class_name).lower()
                        if mapped_name in ["exterior", "roof", "others"]:
                            needs_damage = True
                    elif hasattr(yolo_out, "boxes") and yolo_out.boxes is not None and len(yolo_out.boxes.cls) > 0:
                        top_conf_idx = int(yolo_out.boxes.cls[0])
                        class_name = yolo_out.names[top_conf_idx]
                        mapped_name = THAI_TO_EN_CLASS_MAP.get(class_name, class_name).lower()
                        if mapped_name in ["exterior", "roof", "others"]:
                            needs_damage = True

                    if needs_damage:
                        damage_indices.append(idx)
            else:
                # Fallback to expected_view if YOLO gen is missing
                for idx, item in enumerate(batch):
                    if item.expected_view in EXTERIOR_LABELS + ["Roof", "Others"]:
                        damage_indices.append(idx)

            if self.yolo_damage is not None and len(damage_indices) > 0:
                try:
                    damage_imgs_bgr = [imgs_bgr[i] for i in damage_indices]
                    with torch.inference_mode():
                        with self.yolo_damage_lock:
                            partial_damage_results = self.yolo_damage(
                                damage_imgs_bgr,
                                verbose=False,
                                device=settings.DEVICE,
                                conf=settings.DAMAGE_CONFIDENCE_THRESHOLD,
                                imgsz=settings.DAMAGE_IMAGE_SIZE,
                            )

                    for i, batch_idx in enumerate(damage_indices):
                        yolo_damage_results[batch_idx] = partial_damage_results[i]

                except Exception as e:
                    logger.warning(
                        "YOLO damage failed: %s",
                        e
                    )

            # ============================================
            # DEFAULT PROBS
            # ============================================
            probs_np = np.zeros(
                (len(batch), len(LABELS)),
                dtype=np.float32
            )

            # ============================================
            # CONVNEXT CLASSIFICATION (Gated by YOLO)
            # ============================================

            cnn_indices = []
            if yolo_gen_results is not None:
                for idx, yolo_out in enumerate(yolo_gen_results):
                    item = batch[idx]
                    needs_cnn = False
                    if hasattr(yolo_out, "probs") and yolo_out.probs is not None:
                        # Classification model top-1
                        top_conf_idx = int(yolo_out.probs.top1)
                        class_name = yolo_out.names[top_conf_idx]
                        mapped_name = THAI_TO_EN_CLASS_MAP.get(class_name, class_name)
                        if mapped_name.lower() in ["exterior", "others"]:
                            needs_cnn = True
                    elif hasattr(yolo_out, "boxes") and yolo_out.boxes is not None and len(yolo_out.boxes.cls) > 0:
                        # Detection model top confidence
                        top_conf_idx = int(yolo_out.boxes.cls[0])
                        class_name = yolo_out.names[top_conf_idx]
                        mapped_name = THAI_TO_EN_CLASS_MAP.get(class_name, class_name)
                        if mapped_name.lower() in ["exterior", "others"]:
                            needs_cnn = True

                    if needs_cnn:
                        cnn_indices.append(idx)
            else:
                for idx, item in enumerate(batch):
                    if item.expected_view in EXTERIOR_LABELS:
                        cnn_indices.append(idx)

            if len(cnn_indices) > 0:
                cnn_tensors = tensors[cnn_indices]

                with torch.inference_mode():
                    if settings.USE_GPU:
                        with torch.amp.autocast("cuda"):
                            logits = self.convnext(cnn_tensors)
                    else:
                        logits = self.convnext(cnn_tensors)

                    probs_all = torch.softmax(
                        logits.float(),
                        dim=1
                    ).cpu().numpy()

                for cnn_i, batch_idx in enumerate(cnn_indices):
                    p = probs_all[cnn_i]
                    mapped = np.zeros(len(LABELS), dtype=np.float32)

                    mapped[0] = p[0]  # Front
                    mapped[1] = p[6]  # Front Left
                    mapped[2] = p[2]  # Left
                    mapped[3] = p[8]  # Back Left
                    mapped[4] = p[1]  # Back
                    mapped[5] = p[7]  # Back Right
                    mapped[6] = p[3]  # Right
                    mapped[7] = p[5]  # Front Right

                    probs_np[batch_idx] = mapped

            # ============================================
            # BUILD RESULTS
            # ============================================
            for i, item in enumerate(batch):

                try:
                    result = build_result(
                        item=item,
                        probs=probs_np[i],
                        yolo_gen_out=(
                            yolo_gen_results[i]
                            if yolo_gen_results is not None
                            else None
                        ),
                        yolo_damage_out=(
                            yolo_damage_results[i]
                            if yolo_damage_results is not None
                            else None
                        ),
                        total_ms=(
                            time.monotonic() - item.enqueue_at
                        ) * 1000,
                        settings=settings
                    )

                    logger.info(
                        "[%s] done | expected='%s' → pred='%s' | conf=%.1f | car=%s | match=%s | blur=%.1f | far=%s | %.0fms",
                        item.request_id,
                        item.expected_view,
                        result["prediction"]["label"],
                        result["prediction"]["confidence"],
                        result["is_car"],
                        result["match"],
                        item.blur_score,
                        result["quality"]["is_too_far"],
                        result["time_ms"]
                    )

                    self.loop.call_soon_threadsafe(
                        self._safe_set_future,
                        item.future,
                        result,
                        None
                    )

                except Exception as exc:

                    self.loop.call_soon_threadsafe(
                        self._safe_set_future,
                        item.future,
                        None,
                        exc
                    )

            # ============================================
            # METRICS
            # ============================================
            duration_ms = (
                time.monotonic() - t_start
            ) * 1000

            metrics.record_batch(
                len(batch),
                duration_ms / len(batch),
                0
            )

        except Exception as exc:

            logger.error(
                "Critical batch failure: %s",
                exc,
                exc_info=True
            )

            for item in batch:

                self.loop.call_soon_threadsafe(
                    self._safe_set_future,
                    item.future,
                    None,
                    exc
                )

            duration_ms = (
                time.monotonic() - t_start
            ) * 1000

            metrics.record_batch(
                len(batch),
                duration_ms / len(batch),
                len(batch)
            )

        finally:

            for item in original_batch:
                backpressure.release()

                item.img = None
                item.tensor = None

            del batch
