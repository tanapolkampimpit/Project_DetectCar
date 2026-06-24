import logging
import asyncio
import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.core.engine import BatchInferenceEngine
from app.services.model_loader import load_models
from app.api.v1 import analyze, health
from app.api.errors import http_exception_handler

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
    settings.normalize_runtime(logger)
    logger.info("System Booting | environment=%s | device=%s", settings.ENVIRONMENT, settings.DEVICE)

    # Load all models via the dedicated service
    convnext, yolo_gen, yolo_damage = load_models()

    loop   = asyncio.get_running_loop()
    engine = BatchInferenceEngine(convnext, yolo_gen, yolo_damage, loop, settings.MAX_QUEUE_DEPTH)
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
        await asyncio.gather(app.state.cleanup_task, return_exceptions=True)
        torch.cuda.empty_cache()

app = FastAPI(
    title="ConnectCar API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(HTTPException, http_exception_handler)

app.include_router(analyze.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "Running AI on Server"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
