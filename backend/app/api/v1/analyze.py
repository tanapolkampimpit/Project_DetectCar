import uuid
import asyncio
from typing import List
import logging
import torch
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
from fastapi.concurrency import run_in_threadpool
from app.core.engine import backpressure, BatchItem, BatchInferenceEngine
from app.services.preprocessor import decode_and_analyze_image, preprocess, prepare_image_for_inference
from app.core.labels import INSURANCE_ANGLE_MAP, LABELS
from app.services.analyzer import process_batch_results
from app.core.config import settings
from app.api.helpers import read_file_safe

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
        try:
            content = await read_file_safe(file)
        except ValueError as ve:
            raise HTTPException(413, str(ve))

        decoded = await run_in_threadpool(decode_and_analyze_image, content)
        del content

        if decoded is None:
            raise HTTPException(400, "Invalid image format")

        img, blur_score = decoded
        
        # --- ตาม Flow: เช็ค Blur ก่อนเข้า Queue ---
        if blur_score < settings.BLUR_THRESHOLD:
            logger.info("[%s] rejected early | blur_score=%.1f (too blurry)", request_id, blur_score)
            backpressure.release()  # <--- คืนคิวกลับให้ระบบ
            return {
                "status": "error",
                "error": "image_too_blurry",
                "message": "image is too blurry",
                "quality": {
                    "is_blurry": True,
                    "blur_score": round(blur_score, 2)
                }
            }

        tensor = preprocess(img)
        if settings.USE_GPU and torch.cuda.is_available():
            try:
                tensor = tensor.pin_memory()
            except Exception:
                pass

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
    files: List[UploadFile] = File(...),
    expected_views: str = Form(..., description="ระบุมุมที่ต้องการตรวจสอบ คั่นด้วยเครื่องหมายจุลภาค (,) เช่น Front,Back"),
):
    request_id = uuid.uuid4().hex[:8]

    if len(files) > 30:
        raise HTTPException(
            status_code=400, 
            detail=f"ส่งรูปภาพได้สูงสุด 30 รูปต่อ 1 ครั้ง (คุณส่งมา {len(files)} รูป)"
        )

    # Parse comma-separated string into a list
    expected_views = [v.strip() for v in expected_views.split(",")]

    # Fail-Fast: Validate all expected views early
    for ev in expected_views:
        if ev not in INSURANCE_ANGLE_MAP:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_expected_view", "message": f"'{ev}' is not a valid view", "valid_values": LABELS}
            )

    if len(files) != len(expected_views):
        logger.warning("[%s] Batch length mismatch", request_id)
        raise HTTPException(
            status_code=400, 
            detail=f"จำนวนรูปภาพ ({len(files)}) ไม่เท่ากับจำนวนมุมที่ระบุ ({len(expected_views)})"
        )

    for f in files:
        if not f.content_type.startswith("image/"):
            raise HTTPException(400, f"ไฟล์ {f.filename} ไม่ใช่รูปภาพ")
        # Validate file extension to prevent content-type spoofing
        ext = f.filename.split('.')[-1].lower() if '.' in f.filename else ''
        if ext not in ['jpg', 'jpeg', 'png', 'webp']:
            raise HTTPException(
                status_code=400,
                detail=f"ไฟล์ {f.filename} มีนามสกุลไม่ถูกต้อง. ยอมรับเฉพาะ .jpg, .jpeg, .png, .webp"
            )

    acquired_count = 0
    for _ in files:
        if not backpressure.acquire():
            for _ in range(acquired_count):
                backpressure.release()
            raise HTTPException(429, {"error": "queue_full", "message": "Server overloaded."})
        acquired_count += 1

    engine: BatchInferenceEngine = request.app.state.engine
    futures = []
    items_handled = 0  # Track how many items we have processed (sent to engine OR manually released)
    loop = asyncio.get_running_loop()

    try:
        # 1. Decode and preprocess all images concurrently
        async def prepare_item(i, file, exp_view):
            # Stream read chunk-by-chunk to prevent memory exhaustion (DoS / OOM)
            content = await read_file_safe(file)

            # Combine decode and preprocess into ONE threadpool call
            res = await run_in_threadpool(prepare_image_for_inference, content)
            if res is None:
                raise ValueError(f"รูปแบบไฟล์ภาพไม่ถูกต้อง: {file.filename}")
            img, blur_score, tensor = res

            # --- ตาม Flow: เช็ค Blur ใน Batch ---
            if blur_score < settings.BLUR_THRESHOLD:
                 # ถ้าเบลอ ให้เซ็ต Result ทันที ไม่ต้องรอคิว GPU
                 future = loop.create_future()
                 future.set_result({
                     "status": "error",
                     "error": "image_too_blurry",
                     "message": f"ภาพ {file.filename} ไม่ชัดเจน",
                     "quality": {"is_blurry": True, "blur_score": round(blur_score, 2)},
                     "prediction": {"label": "Unknown", "confidence": 0.0},
                     "is_car": False,
                     "match": False,
                     "time_ms": 0.0
                 })
                 return i, exp_view, None, blur_score, None, future

            return i, exp_view, img, blur_score, tensor, None

        prepare_tasks = [prepare_item(i, f, ev) for i, (f, ev) in enumerate(zip(files, expected_views))]
        prepared_results = await asyncio.gather(*prepare_tasks, return_exceptions=True)
        
        # 2. Submit to queue in a tight loop
        for i, res in enumerate(prepared_results):
            if isinstance(res, Exception):
                # If preparation failed, we create a dummy future that's already failed
                backpressure.release() 
                future = loop.create_future()
                # Secure error mapping to prevent internal details leakage
                if isinstance(res, ValueError):
                    future.set_exception(HTTPException(400, str(res)))
                else:
                    logger.error("Error preparing file %s: %s", files[i].filename, res, exc_info=True)
                    future.set_exception(HTTPException(400, f"เกิดข้อผิดพลาดในการประมวลผลรูปภาพ {files[i].filename}"))
                futures.append(future)
                items_handled += 1
                continue

            idx, exp_view, img, blur_score, tensor, early_future = res
            
            if early_future:
                backpressure.release() 
                futures.append(early_future)
                items_handled += 1
                continue

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
            items_handled += 1

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
        still_holding = len(files) - items_handled
        for _ in range(still_holding):
            backpressure.release()
        raise exc
    except Exception as exc:
        still_holding = len(files) - items_handled
        for _ in range(still_holding):
            backpressure.release()
        logger.error("[%s] batch error: %s", request_id, exc, exc_info=True)
        raise HTTPException(500, "Internal server error")
