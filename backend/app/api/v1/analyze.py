import asyncio
import logging
import uuid
from types import SimpleNamespace

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.api.errors import error_detail, raise_api_error
from app.api.helpers import read_file_safe
from app.core.config import settings
from app.core.engine import BatchInferenceEngine, backpressure
from app.schemas.prediction import DamageResponse, ImageQualityError, PredictViewResponse
from app.services.damage_service import predict_damage_sync
from app.services.preprocessor import decode_and_analyze_image, prepare_image_for_inference
from app.services.view_service import (
    prepare_single_item,
    validate_expected_view,
)

logger = logging.getLogger("analyze_api")
router = APIRouter()


def _validate_image_file(file: UploadFile, request_id: str):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise_api_error(
            400,
            "invalid_file_type",
            "Invalid file type. Only images are allowed.",
            request_id=request_id,
        )


@router.post(
    "/predict_view",
    response_model=PredictViewResponse | ImageQualityError,
    response_model_exclude_none=True,
)
async def predict_view(
    request: Request,
    file: UploadFile = File(...),
    expected_view: str = Form("Front"),
):
    request_id = uuid.uuid4().hex[:8]

    try:
        validate_expected_view(expected_view)
    except ValueError as exc:
        detail = exc.args[0] if exc.args and isinstance(exc.args[0], dict) else {}
        detail.setdefault("error", "invalid_expected_view")
        detail.setdefault("message", "Invalid expected_view.")
        detail["request_id"] = request_id
        raise HTTPException(400, detail)

    _validate_image_file(file, request_id)

    if not backpressure.acquire():
        raise_api_error(
            429,
            "queue_full",
            "Server overloaded. Retry later.",
            request_id=request_id,
        )

    submitted = False
    try:
        try:
            content = await read_file_safe(file)
        except ValueError as exc:
            raise_api_error(413, "file_too_large", str(exc), request_id=request_id)

        prepared = await run_in_threadpool(prepare_image_for_inference, content)
        del content

        if prepared is None:
            raise_api_error(400, "invalid_image_format", "Invalid image format.", request_id=request_id)

        img, blur_score, tensor = prepared
        if blur_score < settings.BLUR_THRESHOLD:
            return {
                "status": "error",
                "error": "image_too_blurry",
                "message": "image is too blurry",
                "quality": {
                    "is_blurry": True,
                    "blur_score": round(blur_score, 2),
                },
                "request_id": request_id,
            }

        loop = request.app.state.engine.loop
        item = prepare_single_item(request_id, expected_view, img, tensor, blur_score, loop)
        engine: BatchInferenceEngine = request.app.state.engine

        try:
            engine.submit_nowait(item)
            submitted = True
        except asyncio.QueueFull:
            raise_api_error(
                429,
                "queue_full",
                "Server overloaded. Retry later.",
                request_id=request_id,
            )

        result = await item.future
        result.pop("damages", None)
        result["request_id"] = request_id
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[%s] predict_view error: %s", request_id, exc, exc_info=True)
        raise_api_error(500, "internal_server_error", "Internal server error.", request_id=request_id)
    finally:
        if not submitted:
            backpressure.release()


@router.post(
    "/predict_damage",
    response_model=DamageResponse | ImageQualityError,
    response_model_exclude_none=True,
)
async def predict_damage(
    request: Request,
    file: UploadFile = File(...),
):
    request_id = uuid.uuid4().hex[:8]

    _validate_image_file(file, request_id)

    if not backpressure.acquire():
        raise_api_error(
            429,
            "queue_full",
            "Server overloaded. Retry later.",
            request_id=request_id,
        )

    try:
        try:
            content = await read_file_safe(file)
        except ValueError as exc:
            raise_api_error(413, "file_too_large", str(exc), request_id=request_id)

        decoded = await run_in_threadpool(decode_and_analyze_image, content)
        del content

        if decoded is None:
            raise_api_error(400, "invalid_image_format", "Invalid image format.", request_id=request_id)

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
                "request_id": request_id,
            }

        item = SimpleNamespace(img=img, blur_score=blur_score)
        engine: BatchInferenceEngine = request.app.state.engine

        result = await run_in_threadpool(predict_damage_sync, engine, item)
        result["request_id"] = request_id
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[%s] predict_damage error: %s", request_id, exc, exc_info=True)
        raise_api_error(500, "internal_server_error", "Internal server error.", request_id=request_id)
    finally:
        backpressure.release()
