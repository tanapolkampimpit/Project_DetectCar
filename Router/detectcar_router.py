import sys
import os
from pathlib import Path

# ==========================================
# 1. จัดการ Path ให้สามารถ Import โมดูลจาก backend ได้
# ==========================================
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent
backend_dir = project_root / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# เราไม่ต้อง os.chdir() ไปที่ backend แล้ว เพราะเราเอาโมเดลมาไว้ที่ Router เองเลย

import logging
import asyncio
import numpy as np
import torch
from contextlib import asynccontextmanager
from fastapi import APIRouter, FastAPI

# Import จาก backend ของเรา
from app.core.config import settings
from app.core.engine import BatchInferenceEngine
from app.models.convnext import MultiTaskConvNeXt
from app.models.yolo import get_yolo_model
from app.api.v1 import analyze, health

# ==========================================
# 2. แก้ไข Path ของโมเดลให้ชี้มาที่โฟลเดอร์ Router/ModelsAi
# ==========================================
# ตอนนี้เราโหลดโมเดลจากในโฟลเดอร์ Router/ModelsAi โดยตรง
settings.MODEL_PATH = str(current_dir / "ModelsAi" / "Model_detect_0.pth")
settings.YOLO_GEN_PATH = str(current_dir / "ModelsAi" / "outside_Now.pt")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("detectcar_router")

torch.set_grad_enabled(False)

# ==========================================
# 3. จัดการ Lifespan สำหรับ Router (แก้บั๊ก State)
# ==========================================
@asynccontextmanager
async def detectcar_lifespan(app: FastAPI):
    # เปลี่ยนมารับตัวแปร app เพื่อให้เข้าถึง app.state ได้โดยตรง
    logger.info("DetectCar System Booting | device=%s", settings.DEVICE)

    convnext = MultiTaskConvNeXt().to(settings.DEVICE)
    state_dict = torch.load(settings.MODEL_PATH, map_location=settings.DEVICE, weights_only=True)
    convnext.load_state_dict(state_dict, strict=False)
    convnext.eval()

    if settings.USE_GPU:
        convnext = convnext.half()

    yolo_gen  = get_yolo_model(settings.YOLO_GEN_PATH, settings.DEVICE)
    
    # Warmup
    dummy_tensor = torch.zeros(settings.BATCH_MAX_SIZE, 3, 224, 224).to(settings.DEVICE)
    if settings.USE_GPU:
        dummy_tensor = dummy_tensor.half()
        
    with torch.inference_mode(): 
        convnext(dummy_tensor)

    dummy_imgs = [np.zeros((224, 224, 3), dtype=np.uint8)] * settings.BATCH_MAX_SIZE
    yolo_gen(dummy_imgs, verbose=False, device=settings.DEVICE)
    
    logger.info("DetectCar Models ready | batch_warmup_size=%d", settings.BATCH_MAX_SIZE)

    loop   = asyncio.get_running_loop()
    engine = BatchInferenceEngine(convnext, yolo_gen, loop, settings.MAX_QUEUE_DEPTH)
    engine.start()

    # ยัด engine ใส่ใน state ของ app หลักโดยตรง เพื่อไม่ให้เกิด Error: 'State' object has no attribute 'engine'
    app.state.engine = engine

    if settings.USE_GPU:
        async def _vram_cleanup():
            props = torch.cuda.get_device_properties(0)
            while True:
                await asyncio.sleep(30)
                reserved = torch.cuda.memory_reserved()
                if reserved > 0.85 * props.total_memory:
                    torch.cuda.empty_cache()
                    logger.info("VRAM cache cleared | reserved=%.1fGB", reserved / 1e9)

        app.state.cleanup_task = asyncio.create_task(_vram_cleanup())

    yield 

    logger.info("DetectCar Shutting down")
    await engine.stop()
    if settings.USE_GPU and hasattr(app.state, "cleanup_task"):
        app.state.cleanup_task.cancel()
        torch.cuda.empty_cache()


# ==========================================
# 4. สร้าง APIRouter พร้อมใส่ Lifespan
# ==========================================
router = APIRouter(lifespan=detectcar_lifespan)

# นำ endpoint เดิมมาเสียบเข้า Router นี้ (เช่น /analyze, /analyze_batch)
router.include_router(analyze.router, prefix="/api/v1")
router.include_router(health.router, prefix="/api/v1")

@router.get("/")
def read_root():
    return {"status": "DetectCar Router is Ready!"}
