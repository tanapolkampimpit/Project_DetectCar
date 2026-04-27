import uuid
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request, Response
from fastapi.concurrency import run_in_threadpool
from app.core.engine import backpressure, BatchItem, BatchInferenceEngine
from app.services.preprocessor import decode_and_analyze_image, preprocess
from app.services.analyzer import INSURANCE_ANGLE_MAP, LABELS, process_batch_results
from app.core.config import settings

logger = logging.getLogger("analyze_api")
router = APIRouter()

# ─── TOON Serialization Helper ──────────────────────────────────────────────
def to_toon(data: any, indent: int = 0) -> str:
    """Serializes a Python object to Token-Oriented Object Notation (TOON)."""
    lines = []
    prefix = "  " * indent
    
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, (dict, list)):
                lines.append(f"{prefix}{k}")
                lines.append(to_toon(v, indent + 1))
            else:
                lines.append(f"{prefix}{k}: {v}")
    elif isinstance(data, list):
        # Tabular layout for uniform lists of dicts
        if data and all(isinstance(x, dict) for x in data) and len(data) > 1:
            keys = list(data[0].keys())
            lines.append(f"{prefix}| {' | '.join(keys)} |")
            for item in data:
                vals = [str(item.get(k, "")) for k in keys]
                lines.append(f"{prefix}| {' | '.join(vals)} |")
        else:
            for item in data:
                if isinstance(item, (dict, list)):
                    lines.append(to_toon(item, indent))
                else:
                    lines.append(f"{prefix}- {item}")
    else:
        lines.append(f"{prefix}{data}")
        
    return "\n".join(filter(None, lines))

@router.post("/analyze")
async def analyze(
    request      : Request,
    file         : UploadFile = File(...),
    expected_view: str        = Form("Front"),
):
    request_id = uuid.uuid4().hex[:8]
    client_ip  = request.client.host if request.client else "unknown"

    if expected_view not in INSURANCE_ANGLE_MAP:
        raise HTTPException(400, {"error": "invalid_expected_view", "valid_values": LABELS})

    if not backpressure.acquire():
        logger.warning("[%s] queue full | client=%s", request_id, client_ip)
        raise HTTPException(429, {"error": "queue_full", "message": "Server overloaded. Retry later."})

    handed_over_to_engine = False  

    try:
        content_bytes = bytearray()
        while chunk := await file.read(1024 * 1024):
            content_bytes.extend(chunk)
            if len(content_bytes) > settings.MAX_FILE_BYTES:
                raise HTTPException(413, "File too large (>10MB)")

        content = bytes(content_bytes)
        del content_bytes

        decoded = await run_in_threadpool(decode_and_analyze_image, content)
        del content

        if decoded is None:
            raise HTTPException(400, "Invalid image format")

        img, blur_score = decoded
        tensor = preprocess(img)

        loop   = asyncio.get_running_loop()
        future = loop.create_future()

        item = BatchItem(
            request_id    = request_id,
            expected_view = expected_view,
            img           = img,
            tensor        = tensor,
            future        = future,
            blur_score    = blur_score,
        )

        engine: BatchInferenceEngine = request.app.state.engine
        
        try:
            engine.submit_nowait(item)
            handed_over_to_engine = True
        except asyncio.QueueFull:
            logger.error("[%s] CRITICAL: Asyncio Queue is completely full!", request_id)
            raise HTTPException(503, "Internal Queue is full. Server overload.")

        try:
            result = await asyncio.wait_for(future, timeout=15.0)
            # Return TOON format
            toon_str = to_toon(result)
            return Response(content=toon_str, media_type="text/toon")
        except asyncio.TimeoutError:
            logger.error("[%s] future timeout", request_id)
            raise HTTPException(503, "Inference timeout.")

    except HTTPException:
        if not handed_over_to_engine:
            backpressure.release()
        raise
    except Exception as exc:
        if not handed_over_to_engine:
            backpressure.release()
        logger.error("[%s] unexpected error: %s", request_id, exc, exc_info=True)
        raise HTTPException(500, "Internal server error")


@router.post("/analyze_batch")
async def analyze_batch(
    request: Request,
    files: list[UploadFile] = File(...),
    expected_views: list[str] = Form(...),
):
    request_id = uuid.uuid4().hex[:8]

    if len(expected_views) == 1 and "," in expected_views[0]:
        expected_views = [v.strip() for v in expected_views[0].split(",")]

    if len(files) != len(expected_views):
        logger.warning("[%s] Batch length mismatch", request_id)
        raise HTTPException(
            status_code=400, 
            detail=f"จำนวนรูปภาพ ({len(files)}) ไม่เท่ากับจำนวนมุมที่ระบุ ({len(expected_views)})"
        )

    for _ in files:
        if not backpressure.acquire():
            raise HTTPException(429, {"error": "queue_full", "message": "Server overloaded."})

    engine: BatchInferenceEngine = request.app.state.engine
    futures = []

    try:
        for i, (file, exp_view) in enumerate(zip(files, expected_views)):
            content = await file.read()
            decoded = await run_in_threadpool(decode_and_analyze_image, content)
            
            if decoded is None:
                raise HTTPException(400, f"รูปแบบไฟล์ภาพไม่ถูกต้อง: {file.filename}")

            img, blur_score = decoded
            tensor = preprocess(img)
            loop = asyncio.get_running_loop()
            future = loop.create_future()

            item = BatchItem(
                request_id=f"{request_id}_{i}",
                expected_view=exp_view,
                img=img,
                tensor=tensor,
                future=future,
                blur_score=blur_score,
            )
            engine.submit_nowait(item)
            futures.append(future)

        results = await asyncio.gather(*futures, return_exceptions=True)
        final_results = process_batch_results(results, expected_views, files)

        response_data = {
            "status": "success",
            "batch_id": request_id,
            "results": final_results
        }
        
        # Return TOON format
        toon_str = to_toon(response_data)
        return Response(content=toon_str, media_type="text/toon")

    except Exception as exc:
        logger.error("[%s] batch error: %s", request_id, exc, exc_info=True)
        raise HTTPException(500, "Internal server error")
