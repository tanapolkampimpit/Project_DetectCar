from fastapi import APIRouter, Request
from app.core.engine import metrics, backpressure, BatchInferenceEngine
from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health(request: Request):
    engine: BatchInferenceEngine = request.app.state.engine
    stats = metrics.get_stats()
    return {
        "status"       : "ok",
        "performance": {
            "avg_latency_ms": stats["avg_latency_ms"],
            "batch_efficiency": stats["avg_batch_efficiency"],
            "total_processed": stats["total_processed"],
            "error_rate": f"{(stats['total_errors']/stats['total_processed']*100 if stats['total_processed']>0 else 0):.2f}%",
            "uptime": f"{stats['uptime_seconds']}s"
        },
        "load": {
            "queue_depth"  : engine.queue_depth,
            "active_tasks" : backpressure.current_count,
            "max_capacity" : settings.MAX_QUEUE_DEPTH
        },
        "config": {
            "device"       : settings.DEVICE,
            "batch_max"    : settings.BATCH_MAX_SIZE,
            "workers"      : settings.NUM_BATCH_WORKERS
        }
    }
