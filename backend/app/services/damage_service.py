import time
from typing import TYPE_CHECKING

import torch

from app.core.config import settings
from app.services.detections import extract_damage_detections

if TYPE_CHECKING:
    from app.core.engine import BatchInferenceEngine


def predict_damage_sync(engine: "BatchInferenceEngine", item) -> dict:
    t_start = time.monotonic()
    img_bgr = item.img[:, :, ::-1]

    yolo_damage_out = None
    if engine.yolo_damage is not None:
        with torch.inference_mode():
            with engine.yolo_damage_lock:
                yolo_damage_out = engine.yolo_damage(
                    [img_bgr],
                    verbose=False,
                    device=settings.DEVICE,
                    conf=settings.DAMAGE_CONFIDENCE_THRESHOLD,
                    imgsz=settings.DAMAGE_IMAGE_SIZE,
                )[0]

    return {
        "damages": extract_damage_detections(
            item,
            yolo_damage_out,
            min_confidence=settings.DAMAGE_CONFIDENCE_THRESHOLD,
            nms_iou_threshold=settings.DAMAGE_NMS_IOU_THRESHOLD,
        ),
        "quality": {
            "is_blurry": item.blur_score < settings.BLUR_THRESHOLD,
            "blur_score": round(item.blur_score, 2),
        },
        "time_ms": (time.monotonic() - t_start) * 1000,
    }
