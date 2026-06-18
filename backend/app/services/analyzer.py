import logging
from typing import Any, List

from app.core.labels import (
    EXTERIOR_LABELS,
    LABELS,
    INSURANCE_ANGLE_MAP,
    SWAP_MAP,
    THAI_TO_EN_CLASS_MAP,
    normalize_class_name,
    map_yolo_to_frontend,
)

logger = logging.getLogger("analyze_api")

def extract_damage_detections(item, yolo_damage_out, min_confidence: float = 0.15) -> list[dict]:
    damages = []
    if yolo_damage_out is None or not hasattr(yolo_damage_out, "boxes") or yolo_damage_out.boxes is None:
        return damages

    names = yolo_damage_out.names
    for idx, c in enumerate(yolo_damage_out.boxes.cls):
        conf = float(yolo_damage_out.boxes.conf[idx])

        if conf < min_confidence:
            continue

        xyxy = yolo_damage_out.boxes.xyxy[idx].tolist()
        class_name = names[int(c)]

        damages.append({
            "label": class_name,
            "confidence": round(conf * 100, 2),
            "box": [round(x, 2) for x in xyxy]
        })

    return damages

def build_result(item, probs: list, yolo_gen_out, yolo_damage_out, total_ms: float, settings) -> dict:
    # Any expected view not in the 9 exterior labels is treated as a YOLO/frontend custom view
    is_yolo_class = item.expected_view not in EXTERIOR_LABELS

    # Extract all YOLO detections
    yolo_detections = []
    if yolo_gen_out is not None:
        if hasattr(yolo_gen_out, "boxes") and yolo_gen_out.boxes is not None:
            names = yolo_gen_out.names
            for idx, c in enumerate(yolo_gen_out.boxes.cls):
                class_name = names[int(c)]
                conf = float(yolo_gen_out.boxes.conf[idx])
                yolo_detections.append({
                    "label": class_name,
                    "confidence": round(conf * 100, 2)
                })
        elif hasattr(yolo_gen_out, "probs") and yolo_gen_out.probs is not None:
            yolo_probs = yolo_gen_out.probs
            names = yolo_gen_out.names
            for idx, conf in enumerate(yolo_probs.data):
                class_name = names[idx]
                mapped_name = THAI_TO_EN_CLASS_MAP.get(class_name, class_name)
                yolo_detections.append({
                    "label": mapped_name,
                    "confidence": round(float(conf) * 100, 2)
                })

    # Sort detections by confidence descending
    yolo_detections.sort(key=lambda x: x["confidence"], reverse=True)

    # Extract damage detections
    damages = extract_damage_detections(
        item,
        yolo_damage_out,
        min_confidence=settings.DAMAGE_CONFIDENCE_THRESHOLD,
    )

    largest_car_ratio = 0.0
    is_too_far = False

    # Calculate largest car ratio if Car/Roof is detected
    if yolo_gen_out is not None and hasattr(yolo_gen_out, "boxes") and yolo_gen_out.boxes is not None and hasattr(yolo_gen_out.boxes, "xyxyn"):
        names = yolo_gen_out.names
        for idx, c in enumerate(yolo_gen_out.boxes.cls):
            if names[int(c)].lower() in ["exterior", "car", "roof"]:
                xyxyn = yolo_gen_out.boxes.xyxyn[idx]
                area = float(xyxyn[2] - xyxyn[0]) * float(xyxyn[3] - xyxyn[1])
                if area > largest_car_ratio:
                    largest_car_ratio = area

    if largest_car_ratio > 0 and largest_car_ratio < settings.MIN_CAR_AREA_RATIO:
        is_too_far = True

    # --- Heuristic to fix YOLO Alloutcar.pt hallucinations ---
    # If a large car/roof is detected in the image, it is an exterior shot.
    # We should ignore any hallucinatory interior classes predicted by YOLO,
    # UNLESS the user explicitly expects an interior view.
    if largest_car_ratio >= 0.10 and item.expected_view not in ["Interior", "Dashcam", "Odometer"]:
        filtered_detections = [
            d for d in yolo_detections 
            if d["label"].lower() not in ["interior", "dashcam", "mileage_screen"]
        ]
        if filtered_detections:
            yolo_detections = filtered_detections

    # Sort detections again just in case
    yolo_detections.sort(key=lambda x: x["confidence"], reverse=True)

    yolo_top1_label = yolo_detections[0]["label"].lower() if yolo_detections else ""
    
    yolo_exterior = False
    if yolo_detections:
        top_det = yolo_detections[0]
        if top_det["label"].lower() == "exterior" and top_det["confidence"] >= settings.MATCH_THRESHOLD:
            yolo_exterior = True
            

    if yolo_top1_label == "others" and probs is not None:
        # If YOLO says 'others' but we ran ConvNeXt, check if ConvNeXt is highly confident
        # about an exterior angle. Since ConvNeXt probs sum to 1, a high confidence (e.g., > 0.5)
        # means it's likely an exterior shot that YOLO missed.
        max_prob = max(probs)
        if max_prob > 0.4:
            yolo_exterior = True

    if yolo_exterior:
        # Force to ConvNeXt logic so it can predict the exact exterior side
        is_yolo_class = False

    if is_yolo_class:
        # Decision logic for YOLO class expected view
        if yolo_detections:
            best_det = yolo_detections[0]
        else:
            best_det = {"label": "Unknown", "confidence": 0.0}

        accepted = INSURANCE_ANGLE_MAP.get(item.expected_view, [item.expected_view])
        accepted_lower = [a.lower() for a in accepted]
        
        matching_detection = None
        for d in yolo_detections:
            d_norm = normalize_class_name(d["label"])
            if d["label"].lower() in accepted_lower or d_norm in accepted_lower:
                if matching_detection is None or d["confidence"] > matching_detection["confidence"]:
                    matching_detection = d

        current_threshold = settings.MATCH_THRESHOLD
        
        if matching_detection is not None and matching_detection["confidence"] >= current_threshold:
            match = True
            is_car = True
            # Match is successful, return expected view as prediction label to satisfy frontend expectations
            best = {
                "label": item.expected_view,
                "confidence": matching_detection["confidence"]
            }
            actual_detected_label = matching_detection["label"]
        else:
            match = False
            # Only consider it a valid car swap if YOLO's top prediction has decent confidence
            is_car = (best_det["confidence"] >= settings.MATCH_THRESHOLD)
            # Match failed, map the highest confidence detection to its default frontend key
            best = {
                "label": map_yolo_to_frontend(best_det["label"], item.expected_view),
                "confidence": best_det["confidence"]
            }
            actual_detected_label = best_det["label"]
    else:
        # Decision logic for exterior angle expected view (ConvNeXt + YOLO)
        results = []
        for i in range(len(EXTERIOR_LABELS)):
            if i < len(probs):
                orig_label = EXTERIOR_LABELS[i]
                final_label = SWAP_MAP.get(orig_label, orig_label)
                results.append({"label": final_label, "confidence": float(probs[i] * 100)})
            else:
                results.append({"label": EXTERIOR_LABELS[i], "confidence": 0.0})

        results.sort(key=lambda x: x["confidence"], reverse=True)
        cnn_best = results[0]

        # --- YOLO "exterior" Gatekeeper Logic ---
        if yolo_exterior:
            # YOLO confirmed this is an exterior shot. Now we trust ConvNeXt to predict the side.
            best = cnn_best
            actual_detected_label = best["label"]
            
            if 0 < largest_car_ratio < settings.MIN_CAR_AREA_RATIO:
                is_too_far = True

            accepted = INSURANCE_ANGLE_MAP.get(item.expected_view, [item.expected_view])
            current_threshold = settings.MATCH_THRESHOLD
            
            match_candidate = (best["label"] in accepted and best["confidence"] >= current_threshold)

            is_car = True
            match = match_candidate

            # Combined Side Probability
            if item.expected_view in ["Left", "Right"] and best["label"] == item.expected_view:
                left_conf = next((r["confidence"] for r in results if r["label"] == "Left"), 0.0)
                right_conf = next((r["confidence"] for r in results if r["label"] == "Right"), 0.0)
                combined_side_conf = left_conf + right_conf
                if combined_side_conf >= 80.0:
                    match = True
        else:
            # YOLO did NOT find 'exterior'. 
            # We reject ConvNeXt's prediction and use the highest YOLO detection (e.g. interior, others)
            if yolo_detections:
                best_det = yolo_detections[0]
                best = {
                    "label": map_yolo_to_frontend(best_det["label"], item.expected_view),
                    "confidence": best_det["confidence"]
                }
                actual_detected_label = best_det["label"]
                is_car = (best_det["confidence"] >= settings.MATCH_THRESHOLD)
            else:
                best = {"label": "Unknown", "confidence": 0.0}
                actual_detected_label = "Unknown"
                is_car = False
                
            match = False

    is_blurry = item.blur_score < settings.BLUR_THRESHOLD

    # --- Guard: ถ้าไม่ใช่รถ ให้ปัดตกทั้งหมด ---
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
            "car_area_ratio": round(largest_car_ratio, 4)
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
