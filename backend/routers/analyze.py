import io
import time
import uuid
import asyncio
import logging
import threading
import concurrent.futures
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Optional
import cv2
import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form, Request
from fastapi.concurrency import run_in_threadpool
from torchvision import transforms
import timm

# ═══════════════════════════════════════════════════════════════════
# 1. Logging Setup
# ═══════════════════════════════════════════════════════════════════
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("analyze_api")

# ═══════════════════════════════════════════════════════════════════
# 2. Global Config & Tuning
# ═══════════════════════════════════════════════════════════════════
USE_GPU       = torch.cuda.is_available()
device        = torch.device("cuda" if USE_GPU else "cpu")
# Change these lines:
MODEL_PATH    = "./Services/Models_1.2.pth" 
YOLO_CLS_PATH = "./Services/yolov8n.pt"

# ปิด Autograd ทั่วทั้งโปรแกรมเพื่อประหยัด RAM/VRAM
torch.set_grad_enabled(False)

# ── Batching & Pipelining ───────────────────────────────────────
BATCH_MAX_SIZE    = 16      # จำนวนรูปสูงสุดต่อ 1 การคำนวณของ GPU
BATCH_MAX_WAIT    = 0.020   # รอนานสุด 20ms ถ้าคิวยังไม่เต็มให้รันเลย
NUM_BATCH_WORKERS = 3       # จำนวน Worker ที่คอยป้อนข้อมูลให้ GPU
MAX_QUEUE_DEPTH   = 200     # คิวสูงสุดที่รับได้ ถ้าเกินเด้งออกทันที (ป้องกัน OOM)
MAX_FILE_BYTES    = 10 * 1024 * 1024   # 10 MB

# ThreadPool สำหรับรัน ConvNeXt และ YOLO ขนานกัน
MODEL_THREAD_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=6)

# ── Business Logic ───────────────────────────────────────────────
LABELS = [
    "Front", "Front-Left", "Left", "Back-Left",
    "Back",  "Back-Right", "Right", "Front-Right",
]

INSURANCE_ANGLE_MAP: dict[str, list[str]] = {
    "Front":       ["Front", "Front-Left", "Front-Right"],
    "Front-Left":  ["Front-Left", "Front", "Left"],
    "Left":        ["Left", "Front-Left", "Back-Left"],
    "Back-Left":   ["Back-Left", "Left", "Back"],
    "Back":        ["Back", "Back-Left", "Back-Right"],
    "Back-Right":  ["Back-Right", "Back", "Right"],
    "Right":       ["Right", "Back-Right", "Front-Right"],
    "Front-Right": ["Front-Right", "Right", "Front"],
}

VEHICLE_KEYWORDS  = frozenset(["car", "truck", "bus", "suv", "van", "vehicle", "pickup"])
MATCH_THRESHOLD   = 55.0
YOLO_CONF_BYPASS  = 80.0

# ═══════════════════════════════════════════════════════════════════
# 3. Model Definition & Preprocessing
# ═══════════════════════════════════════════════════════════════════
class MultiTaskConvNeXt(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = timm.create_model("convnext_small", pretrained=False)
        in_features = self.backbone.head.fc.in_features
        self.backbone.head.fc = nn.Linear(in_features, 1024)
        self.class_prediction = nn.Linear(1024, 8)
        self.angle_prediction = nn.Linear(1024 + 8, 1)

    def forward(self, x):
        f = self.backbone(x)
        c = self.class_prediction(f)
        a = self.angle_prediction(torch.cat((f, c), dim=1))
        return c, a

preprocess = transforms.Compose([
    transforms.ToTensor(),
    transforms.Resize((224, 224), antialias=True),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

def _decode_image(content: bytes) -> Optional[np.ndarray]:
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
    if img is None: return None
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

# ═══════════════════════════════════════════════════════════════════
# 4. Engine Core Data Structures
# ═══════════════════════════════════════════════════════════════════
@dataclass
class BatchItem:
    request_id   : str
    expected_view: str
    img          : np.ndarray                  
    tensor       : torch.Tensor                
    future       : asyncio.Future              
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

backpressure = BackpressureGate(MAX_QUEUE_DEPTH)

# ═══════════════════════════════════════════════════════════════════
# 5. Parallel Batch Inference Engine
# ═══════════════════════════════════════════════════════════════════
class BatchInferenceEngine:
    def __init__(self, convnext, yolo, loop: asyncio.AbstractEventLoop, max_queue: int):
        self.convnext = convnext
        self.yolo     = yolo
        self.loop     = loop
        self._queue: asyncio.Queue[BatchItem] = asyncio.Queue(maxsize=max_queue)
        self._tasks: list[asyncio.Task]       = []

    def start(self):
        for i in range(NUM_BATCH_WORKERS):
            task = self.loop.create_task(self._worker(i))
            self._tasks.append(task)
        logger.info("⚙️  Batch Engine started | workers=%d | batch_size=%d", NUM_BATCH_WORKERS, BATCH_MAX_SIZE)

    async def stop(self):
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        
        # Cleanup คิวที่ค้างตอนเซิร์ฟเวอร์ปิด
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

            deadline = time.monotonic() + BATCH_MAX_WAIT
            while len(batch) < BATCH_MAX_SIZE:
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
        
        # ── 1. เตรียมข้อมูลเข้า GPU ──
        tensors = torch.stack([item.tensor for item in batch])
        if USE_GPU:
            tensors = tensors.pin_memory().to(device, non_blocking=True).half()
        else:
            tensors = tensors.to(device)
            
        imgs = [item.img for item in batch]

        # ── 2. ประมวลผลแบบขนาน (ConvNeXt & YOLO) ──
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
        logger.debug("⚡ Batch done | size=%d | total_inference_time=%.1fms", len(batch), (t_end - t_start) * 1000)

        # ── 3. กระจายผลลัพธ์กลับไปยัง Request ──
        for i, item in enumerate(batch):
            try:
                result = self._build_result(
                    item       = item,
                    probs      = probs_np[i],
                    yolo_out   = yolo_results[i] if yolo_results else None,
                    total_ms   = (time.monotonic() - item.enqueue_at) * 1000,
                )
                self.loop.call_soon_threadsafe(self._safe_set_future, item.future, result, None)
            except Exception as exc:
                self.loop.call_soon_threadsafe(self._safe_set_future, item.future, None, exc)

        # ── 4. คืนโควต้าให้ระบบ Backpressure ──
        for _ in batch:
            backpressure.release()

    def _build_result(self, item: BatchItem, probs: np.ndarray, yolo_out, total_ms: float) -> dict:
        results = [{"label": LABELS[i], "confidence": float(probs[i] * 100)} for i in range(8)]
        results.sort(key=lambda x: x["confidence"], reverse=True)
        best = results[0]

        if yolo_out is None:
            is_car = best["confidence"] >= 80.0
        else:
            names = yolo_out.names
            yolo_says_vehicle = False
            
            # ตรวจสอบว่าเป็นโมเดล Classification (มี .probs) หรือ Detection (มี .boxes)
            if hasattr(yolo_out, "probs") and yolo_out.probs is not None:
                # กรณีโมเดล Classification
                top5_names = [names[int(j)].lower() for j in yolo_out.probs.top5]
                yolo_says_vehicle = any(any(kw in name for kw in VEHICLE_KEYWORDS) for name in top5_names)
            elif hasattr(yolo_out, "boxes") and yolo_out.boxes is not None:
                # กรณีโมเดล Detection (เช่น yolov8n.pt)
                detected_classes = [names[int(c)].lower() for c in yolo_out.boxes.cls]
                yolo_says_vehicle = any(any(kw in name for kw in VEHICLE_KEYWORDS) for name in detected_classes)
                
            is_car = yolo_says_vehicle or best["confidence"] >= YOLO_CONF_BYPASS

        accepted = INSURANCE_ANGLE_MAP.get(item.expected_view, [item.expected_view])
        match = (best["label"] in accepted and best["confidence"] >= MATCH_THRESHOLD and is_car)

        logger.info(
            "[%s] Analyze done | expected='%s' → predicted='%s' | conf=%.1f | is_car=%s | match=%s | %.0fms",
            item.request_id, item.expected_view, best["label"], best["confidence"], is_car, match, total_ms,
        )

        return {
            "status"    : "success",
            "prediction": best,
            "is_car"    : is_car,
            "match"     : match,
            "time_ms"   : round(total_ms, 2),
        }

# ═══════════════════════════════════════════════════════════════════
# 6. Lifespan (Startup / Shutdown)
# ═══════════════════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 System Booting | device=%s", device)

    # โหลด ConvNeXt
    convnext = MultiTaskConvNeXt().to(device)
    state_dict = torch.load(MODEL_PATH, map_location=device, weights_only=True)
    convnext.load_state_dict(state_dict, strict=False)
    convnext.eval()

    if USE_GPU:
        convnext = convnext.half()
        try:
            convnext = torch.compile(convnext, mode="reduce-overhead")
            logger.info("✅ torch.compile applied (reduce-overhead)")
        except Exception as e:
            logger.warning("torch.compile skipped: %s", e)

    # โหลด YOLO
    from ultralytics import YOLO
    logging.getLogger("ultralytics").setLevel(logging.ERROR)
    yolo = YOLO(YOLO_CLS_PATH)
    if USE_GPU:
        yolo.to(device)

    # Warmup
    logger.info("🔥 Warming up models...")
    dummy_tensor = torch.zeros(BATCH_MAX_SIZE, 3, 224, 224).to(device)
    if USE_GPU: dummy_tensor = dummy_tensor.half()
    with torch.inference_mode(): convnext(dummy_tensor)

    dummy_imgs = [np.zeros((224, 224, 3), dtype=np.uint8)] * BATCH_MAX_SIZE
    yolo(dummy_imgs, verbose=False)
    logger.info("✅ Models ready | batch_warmup_size=%d", BATCH_MAX_SIZE)

    # เปิด Engine
    loop   = asyncio.get_running_loop()
    engine = BatchInferenceEngine(convnext, yolo, loop, MAX_QUEUE_DEPTH)
    engine.start()
    app.state.engine = engine

    # Background VRAM Monitor
    if USE_GPU:
        async def _vram_cleanup():
            props = torch.cuda.get_device_properties(0)
            while True:
                await asyncio.sleep(30)
                reserved = torch.cuda.memory_reserved()
                if reserved > 0.85 * props.total_memory:
                    torch.cuda.empty_cache()
                    logger.info("🧹 VRAM cache cleared | reserved=%.1fGB", reserved / 1e9)

        app.state.cleanup_task = asyncio.create_task(_vram_cleanup())

    yield

    logger.info("🧹 Shutting down...")
    await engine.stop()
    if USE_GPU and hasattr(app.state, "cleanup_task"):
        app.state.cleanup_task.cancel()
        torch.cuda.empty_cache()

# ═══════════════════════════════════════════════════════════════════
# 7. FastAPI App & Endpoints
# ═══════════════════════════════════════════════════════════════════
app    = FastAPI(title="ConnectCar API v5", lifespan=lifespan)
router = APIRouter(prefix="/api/v1")

@router.post("/analyze")
async def analyze(
    request      : Request,
    file         : UploadFile = File(...),
    expected_view: str        = Form("Front"),
):
    request_id = uuid.uuid4().hex[:8]
    client_ip  = request.client.host if request.client else "unknown"

    # Validate ก่อนเข้าคิว
    if expected_view not in INSURANCE_ANGLE_MAP:
        raise HTTPException(400, {"error": "invalid_expected_view", "valid_values": LABELS})

    # รับบัตรคิว (Backpressure Check)
    if not backpressure.acquire():
        logger.warning("[%s] queue full | client=%s", request_id, client_ip)
        raise HTTPException(429, {"error": "queue_full", "message": "Server overloaded. Retry later."})

    handed_over_to_engine = False  

    try:
        content_bytes = bytearray()
        while chunk := await file.read(1024 * 1024):
            content_bytes.extend(chunk)
            if len(content_bytes) > MAX_FILE_BYTES:
                raise HTTPException(413, "File too large (>10MB)")

        content = bytes(content_bytes)
        del content_bytes

        # Decode แบบไม่บล็อกแอป
        img = await run_in_threadpool(_decode_image, content)
        del content

        if img is None:
            raise HTTPException(400, "Invalid image format")

        # จัดเตรียม Tensor (บน CPU)
        tensor = preprocess(img)

        # สร้างกล่องรับผลลัพธ์
        loop   = asyncio.get_running_loop()
        future = loop.create_future()

        item = BatchItem(
            request_id    = request_id,
            expected_view = expected_view,
            img           = img,
            tensor        = tensor,
            future        = future,
        )

        engine: BatchInferenceEngine = request.app.state.engine
        
        # ส่งงานเข้า Engine
        try:
            engine.submit_nowait(item)
            handed_over_to_engine = True
        except asyncio.QueueFull:
            logger.error("[%s] CRITICAL: Asyncio Queue is completely full!", request_id)
            raise HTTPException(503, "Internal Queue is full. Server overload.")

        # รอรับผลลัพธ์
        try:
            return await asyncio.wait_for(future, timeout=15.0)
        except asyncio.TimeoutError:
            logger.error("[%s] future timeout", request_id)
            raise HTTPException(503, "Inference timeout.")

    except HTTPException:
        # ถ้าพังก่อนจะส่งให้ Engine เราต้องคืนโควต้าให้คิวด้วยตัวเอง
        if not handed_over_to_engine:
            backpressure.release()
        raise

    except Exception as exc:
        if not handed_over_to_engine:
            backpressure.release()
        logger.error("[%s] unexpected error | error=%s", request_id, exc, exc_info=True)
        raise HTTPException(500, "Internal server error")

@router.get("/health")
async def health(request: Request):
    engine: BatchInferenceEngine = request.app.state.engine
    return {
        "status"       : "ok",
        "queue_depth"  : engine._queue.qsize(),
        "backpressure" : backpressure._count,
        "max_queue"    : MAX_QUEUE_DEPTH,
        "device"       : str(device),
        "batch_size"   : BATCH_MAX_SIZE,
        "batch_workers": NUM_BATCH_WORKERS,
    }

app.include_router(router)