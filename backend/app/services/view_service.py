import time
from typing import TYPE_CHECKING

import torch

from app.core.labels import INSURANCE_ANGLE_MAP, LABELS
from app.core.config import settings
from app.services.analyzer import build_result

if TYPE_CHECKING:
    from app.core.engine import BatchItem, BatchInferenceEngine


def validate_expected_view(expected_view: str):
    if expected_view not in INSURANCE_ANGLE_MAP:
        raise ValueError({"error": "invalid_expected_view", "valid_values": LABELS})


def prepare_single_item(request_id: str, expected_view: str, img, tensor, blur_score: float, loop):
    from app.core.engine import BatchItem

    return BatchItem(
        request_id=request_id,
        expected_view=expected_view,
        img=img,
        tensor=tensor,
        future=loop.create_future(),
        blur_score=blur_score,
    )


def predict_view_sync(engine: "BatchInferenceEngine", item: "BatchItem") -> dict:
    t_start = time.monotonic()
    img_bgr = item.img[:, :, ::-1]

    yolo_gen_out = None
    if engine.yolo_gen is not None:
        with torch.inference_mode():
            with engine.yolo_gen_lock:
                yolo_gen_out = engine.yolo_gen([img_bgr], verbose=False, device=settings.DEVICE)[0]

    tensor = item.tensor.unsqueeze(0)
    if settings.USE_GPU:
        is_half = next(engine.convnext.parameters()).dtype == torch.float16
        tensor = tensor.to(settings.DEVICE, non_blocking=True)
        if is_half:
            tensor = tensor.half()
    else:
        tensor = tensor.to(settings.DEVICE)

    with torch.inference_mode():
        if settings.USE_GPU:
            with torch.amp.autocast("cuda"):
                logits = engine.convnext(tensor)
        else:
            logits = engine.convnext(tensor)

        probs_raw = torch.softmax(logits.float(), dim=1).cpu().numpy()[0]

    probs = [0.0] * len(LABELS)
    probs[0] = probs_raw[0]
    probs[1] = probs_raw[6]
    probs[2] = probs_raw[2]
    probs[3] = probs_raw[8]
    probs[4] = probs_raw[1]
    probs[5] = probs_raw[7]
    probs[6] = probs_raw[3]
    probs[7] = probs_raw[5]

    result = build_result(
        item=item,
        probs=probs,
        yolo_gen_out=yolo_gen_out,
        yolo_damage_out=None,
        total_ms=(time.monotonic() - t_start) * 1000,
        settings=settings,
    )
    result.pop("damages", None)
    return result
