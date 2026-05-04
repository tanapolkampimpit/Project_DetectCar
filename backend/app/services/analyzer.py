import logging
from typing import Dict, Any, List

logger = logging.getLogger("analyze_api")

LABELS = [
    "Front", "Front-Left", "Left", "Back-Left",
    "Back",  "Back-Right", "Right", "Front-Right",
]

INSURANCE_ANGLE_MAP = {
    "Front":       ["Front"],
    "Front-Left":  ["Front-Left"],
    "Left":        ["Left"],
    "Back-Left":   ["Back-Left"],
    "Back":        ["Back"],
    "Back-Right":  ["Back-Right"],
    "Right":       ["Right"],
    "Front-Right": ["Front-Right"],
}

SWAP_MAP = {
    "Front-Left":  "Front-Right",
    "Front-Right": "Front-Left",
    "Left":        "Right",
    "Right":       "Left",
    "Back-Left":   "Back-Right",
    "Back-Right":  "Back-Left",
}

VEHICLE_KEYWORDS  = frozenset(["car", "truck", "bus", "suv", "van", "vehicle", "pickup"])

def build_result(item, probs: list, yolo_out, total_ms: float, settings) -> dict:
    results = []
    for i in range(8):
        orig_label = LABELS[i]
        # สลับป้ายกำกับตาม SWAP_MAP
        final_label = SWAP_MAP.get(orig_label, orig_label)
        results.append({"label": final_label, "confidence": float(probs[i] * 100)})

    results.sort(key=lambda x: x["confidence"], reverse=True)
    best = results[0]

    is_too_far = False
    largest_car_ratio = 0.0

    if yolo_out is None:
        is_car = best["confidence"] >= 80.0
    else:
        names = yolo_out.names
        yolo_says_vehicle = False
        
        if hasattr(yolo_out, "probs") and yolo_out.probs is not None:
            top5_names = [names[int(j)].lower() for j in yolo_out.probs.top5]
            yolo_says_vehicle = any(any(kw in name for kw in VEHICLE_KEYWORDS) for name in top5_names)
        elif hasattr(yolo_out, "boxes") and yolo_out.boxes is not None:
            for i, c in enumerate(yolo_out.boxes.cls):
                class_name = names[int(c)].lower()
                if any(kw in class_name for kw in VEHICLE_KEYWORDS):
                    yolo_says_vehicle = True
                    if hasattr(yolo_out.boxes, "xyxyn"):
                        xyxyn = yolo_out.boxes.xyxyn[i]
                        w = float(xyxyn[2] - xyxyn[0])
                        h = float(xyxyn[3] - xyxyn[1])
                        area = w * h
                        if area > largest_car_ratio:
                            largest_car_ratio = area
            
            if yolo_says_vehicle and largest_car_ratio > 0 and largest_car_ratio < settings.MIN_CAR_AREA_RATIO:
                is_too_far = True
            
            if not yolo_says_vehicle:
                logger.info("[%s] YOLO found no vehicle | fallback to confidence: %.1f%%", item.request_id, best["confidence"])
            
        is_car = yolo_says_vehicle or best["confidence"] >= settings.YOLO_CONF_BYPASS

    accepted = INSURANCE_ANGLE_MAP.get(item.expected_view, [item.expected_view])
    match = (best["label"] in accepted and best["confidence"] >= settings.MATCH_THRESHOLD and is_car)

    is_blurry = item.blur_score < settings.BLUR_THRESHOLD


    return {
        "status"    : "success",
        "prediction": best,
        "is_car"    : is_car,
        "match"     : match,
        "quality"   : {
            "is_blurry": is_blurry,
            "blur_score": round(item.blur_score, 2),
            "is_too_far": is_too_far,
            "car_area_ratio": round(largest_car_ratio, 4)
        },
        "time_ms"   : round(total_ms, 2),
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
            "quality": res.get("quality", {})
        })
    return final_results
