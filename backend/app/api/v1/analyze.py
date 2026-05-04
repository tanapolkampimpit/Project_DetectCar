import uuid
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
from fastapi.concurrency import run_in_threadpool
from app.core.engine import backpressure, BatchItem, BatchInferenceEngine
from app.services.preprocessor import decode_and_analyze_image, preprocess
from app.services.analyzer import INSURANCE_ANGLE_MAP, LABELS, process_batch_results
from app.core.config import settings

logger = logging.getLogger("analyze_api")
router = APIRouter()

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

    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Invalid file type. Only images are allowed.")

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
            return result
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

    if len(files) > 15:
        raise HTTPException(
            status_code=400, 
            detail=f"ส่งรูปภาพได้สูงสุด 15 รูปต่อ 1 ครั้ง (คุณส่งมา {len(files)} รูป)"
        )

    if len(expected_views) == 1 and "," in expected_views[0]:
        expected_views = [v.strip() for v in expected_views[0].split(",")]

    if len(files) != len(expected_views):
        logger.warning("[%s] Batch length mismatch", request_id)
        raise HTTPException(
            status_code=400, 
            detail=f"จำนวนรูปภาพ ({len(files)}) ไม่เท่ากับจำนวนมุมที่ระบุ ({len(expected_views)})"
        )

    for f in files:
        if not f.content_type.startswith("image/"):
            raise HTTPException(400, f"ไฟล์ {f.filename} ไม่ใช่รูปภาพ")

    acquired_count = 0
    for _ in files:
        if not backpressure.acquire():
            for _ in range(acquired_count):
                backpressure.release()
            raise HTTPException(429, {"error": "queue_full", "message": "Server overloaded."})
        acquired_count += 1

    engine: BatchInferenceEngine = request.app.state.engine
    futures = []
    items_submitted = 0

    try:
        # 1. Decode and preprocess all images concurrently
        async def prepare_item(i, file, exp_view):
            content = await file.read()
            decoded = await run_in_threadpool(decode_and_analyze_image, content)
            if decoded is None:
                raise ValueError(f"รูปแบบไฟล์ภาพไม่ถูกต้อง: {file.filename}")
            img, blur_score = decoded
            # run_in_threadpool for preprocess if it's heavy, or just run it directly
            tensor = await run_in_threadpool(preprocess, img)
            return i, exp_view, img, blur_score, tensor

        prepare_tasks = [prepare_item(i, f, ev) for i, (f, ev) in enumerate(zip(files, expected_views))]
        prepared_results = await asyncio.gather(*prepare_tasks, return_exceptions=True)

        loop = asyncio.get_running_loop()
        
        # 2. Submit to queue in a tight loop
        for i, res in enumerate(prepared_results):
            if isinstance(res, Exception):
                # If preparation failed, we create a dummy future that's already failed
                future = loop.create_future()
                future.set_exception(HTTPException(400, str(res)))
                futures.append(future)
                items_submitted += 1
                continue

            idx, exp_view, img, blur_score, tensor = res
            future = loop.create_future()
            item = BatchItem(
                request_id=f"{request_id}_{idx}",
                expected_view=exp_view,
                img=img,
                tensor=tensor,
                future=future,
                blur_score=blur_score,
            )
            engine.submit_nowait(item)
            futures.append(future)
            items_submitted += 1

        try:
            results = await asyncio.wait_for(asyncio.gather(*futures, return_exceptions=True), timeout=30.0)
        except asyncio.TimeoutError:
            logger.error("[%s] batch inference timeout", request_id)
            raise HTTPException(503, "Batch Inference timeout.")

        final_results = process_batch_results(results, expected_views, files)

        response_data = {
            "status": "success",
            "batch_id": request_id,
            "results": final_results
        }
        
        return response_data

    except HTTPException as exc:
        unsubmitted = len(files) - items_submitted
        for _ in range(unsubmitted):
            backpressure.release()
        raise exc
    except Exception as exc:
        unsubmitted = len(files) - items_submitted
        for _ in range(unsubmitted):
            backpressure.release()
        logger.error("[%s] batch error: %s", request_id, exc, exc_info=True)
        raise HTTPException(500, "Internal server error")
