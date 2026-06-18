import logging
import uuid
from types import SimpleNamespace

import torch
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.api.helpers import read_file_safe
from app.core.config import settings
from app.core.engine import BatchInferenceEngine, backpressure
from app.services.damage_service import predict_damage_sync
from app.services.preprocessor import decode_and_analyze_image, preprocess
from app.services.view_service import (
    prepare_single_item,
    predict_view_sync,
    validate_expected_view,
)

logger = logging.getLogger("analyze_api")
router = APIRouter()


def _validate_image_file(file: UploadFile):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Invalid file type. Only images are allowed.")


@router.post("/predict_view")
async def predict_view(
    request: Request,
    file: UploadFile = File(...),
    expected_view: str = Form("Front"),
):
    request_id = uuid.uuid4().hex[:8]

    try:
        validate_expected_view(expected_view)
    except ValueError as exc:
        raise HTTPException(400, exc.args[0])

    _validate_image_file(file)

    if not backpressure.acquire():
        raise HTTPException(429, {"error": "queue_full", "message": "Server overloaded. Retry later."})

    try:
        try:
            content = await read_file_safe(file)
        except ValueError as exc:
            raise HTTPException(413, str(exc))

        decoded = await run_in_threadpool(decode_and_analyze_image, content)
        del content

        if decoded is None:
            raise HTTPException(400, "Invalid image format")

        img, blur_score = decoded
        if blur_score < settings.BLUR_THRESHOLD:
            return {
                "status": "error",
                "error": "image_too_blurry",
                "message": "image is too blurry",
                "quality": {
                    "is_blurry": True,
                    "blur_score": round(blur_score, 2),
                },
            }

        tensor = preprocess(img)
        if settings.USE_GPU and torch.cuda.is_available():
            try:
                tensor = tensor.pin_memory()
            except Exception:
                pass

        loop = request.app.state.engine.loop
        item = prepare_single_item(request_id, expected_view, img, tensor, blur_score, loop)
        engine: BatchInferenceEngine = request.app.state.engine

        return await run_in_threadpool(predict_view_sync, engine, item)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[%s] predict_view error: %s", request_id, exc, exc_info=True)
        raise HTTPException(500, "Internal server error")
    finally:
        backpressure.release()


@router.post("/predict_damage")
async def predict_damage(
    request: Request,
    file: UploadFile = File(...),
):
    request_id = uuid.uuid4().hex[:8]

    _validate_image_file(file)

    if not backpressure.acquire():
        raise HTTPException(429, {"error": "queue_full", "message": "Server overloaded. Retry later."})

    try:
        try:
            content = await read_file_safe(file)
        except ValueError as exc:
            raise HTTPException(413, str(exc))

        decoded = await run_in_threadpool(decode_and_analyze_image, content)
        del content

        if decoded is None:
            raise HTTPException(400, "Invalid image format")

        img, blur_score = decoded
        if blur_score < settings.BLUR_THRESHOLD:
            return {
                "status": "error",
                "error": "image_too_blurry",
                "message": "image is too blurry",
                "quality": {
                    "is_blurry": True,
                    "blur_score": round(blur_score, 2),
                },
                "damages": [],
            }

        item = SimpleNamespace(img=img, blur_score=blur_score)
        engine: BatchInferenceEngine = request.app.state.engine

        return await run_in_threadpool(predict_damage_sync, engine, item)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[%s] predict_damage error: %s", request_id, exc, exc_info=True)
        raise HTTPException(500, "Internal server error")
    finally:
        backpressure.release()
