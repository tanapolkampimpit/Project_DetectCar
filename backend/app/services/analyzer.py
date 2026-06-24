import logging
from typing import Any, List

from app.core.labels import EXTERIOR_LABELS
from app.services.detections import (
    extract_damage_detections,
    extract_yolo_detections,
    filter_hallucinated_interior,
    largest_car_area_ratio,
)
from app.services.view_matcher import (
    decide_exterior_class,
    decide_yolo_class,
    has_yolo_exterior,
)

logger = logging.getLogger("analyze_api")

def build_result(item, probs: list, yolo_gen_out, yolo_damage_out, total_ms: float, settings) -> dict:
    damages = extract_damage_detections(
        item,
        yolo_damage_out,
        min_confidence=settings.DAMAGE_CONFIDENCE_THRESHOLD,
        nms_iou_threshold=settings.DAMAGE_NMS_IOU_THRESHOLD,
    )
    yolo_detections = extract_yolo_detections(yolo_gen_out)
    largest_ratio = largest_car_area_ratio(yolo_gen_out)
    is_too_far = 0 < largest_ratio < settings.MIN_CAR_AREA_RATIO
    yolo_detections = filter_hallucinated_interior(
        yolo_detections,
        largest_ratio,
        item.expected_view,
    )
    yolo_detections.sort(key=lambda x: x["confidence"], reverse=True)

    is_yolo_class = item.expected_view not in EXTERIOR_LABELS
    yolo_exterior = has_yolo_exterior(yolo_detections, probs, settings.MATCH_THRESHOLD)
    if yolo_exterior:
        is_yolo_class = False

    if is_yolo_class:
        best, is_car, match = decide_yolo_class(
            item.expected_view,
            yolo_detections,
            settings.MATCH_THRESHOLD,
        )
    else:
        best, is_car, match = decide_exterior_class(
            item.expected_view,
            probs,
            yolo_detections,
            yolo_exterior,
            settings.MATCH_THRESHOLD,
        )

    is_blurry = item.blur_score < settings.BLUR_THRESHOLD

    if not is_car:
        best = {"label": "Unknown", "confidence": best["confidence"]}
        damages = []
    return {
        "prediction"   : best,
        "is_car"       : is_car,
        "match"        : match,
        "quality"      : {
            "is_blurry": is_blurry,
            "blur_score": round(item.blur_score, 2),
            "is_too_far": is_too_far,
            "car_area_ratio": round(largest_ratio, 4)
        },
        "damages"      : damages,
        "time_ms"      : total_ms
    }


def process_batch_results(results: List[Any], expected_views: List[str], files: List[Any]) -> List[dict]:
    final_results = []
    for res, exp_view, file in zip(results, expected_views, files):
        if isinstance(res, Exception):
            final_results.append({
                "filename": file.filename,
                "original_expected": exp_view,
                "error": str(res)
            })
            continue
            
        pred_label = res["prediction"]["label"]
        match = res["match"]
        is_car = res["is_car"]
        
        final_assigned = exp_view
        if not match and is_car:
            final_assigned = pred_label
            
        final_results.append({
            "filename": file.filename,
            "original_expected": exp_view,
            "predicted_label": pred_label,
            "final_assigned_view": final_assigned,
            "is_car": is_car,
            "match": match,
            "confidence": res["prediction"]["confidence"],
            "needs_swap": not match and is_car,
            "quality": res.get("quality", {}),
            "damages": res.get("damages", []),
            "time_ms": res.get("time_ms")
        })
    return final_results
