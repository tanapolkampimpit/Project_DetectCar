import logging
import asyncio
import numpy as np
import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.core.engine import BatchInferenceEngine
from app.models.convnext import MultiTaskConvNeXt
from app.models.yolo import get_yolo_model
from app.api.v1 import analyze, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("analyze_api")

# ปิด Autograd ทั่วทั้งโปรแกรมเพื่อประหยัด RAM/VRAM
torch.set_grad_enabled(False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("System Booting | device=%s", settings.DEVICE)

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
    
    logger.info(" Models ready | batch_warmup_size=%d", settings.BATCH_MAX_SIZE)

    loop   = asyncio.get_running_loop()
    engine = BatchInferenceEngine(convnext, yolo_gen, loop, settings.MAX_QUEUE_DEPTH)
    engine.start()
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

    logger.info("Shutting down")
    await engine.stop()
    if settings.USE_GPU and hasattr(app.state, "cleanup_task"):
        app.state.cleanup_task.cancel()
        torch.cuda.empty_cache()

app = FastAPI(
    title="ConnectCar API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "Running AI on Server"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
