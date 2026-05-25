import logging
from typing import Dict, Any, List

logger = logging.getLogger("analyze_api")

EXTERIOR_LABELS = [
    "Front", "Front-Left", "Left", "Back-Left",
    "Back",  "Back-Right", "Right", "Front-Right",
]

YOLO_CLASSES = [
    "chassis_number",
    "dashcam",
    "engine_room",
    "exterior",
    "inspection_document",
    "interior",
    "mileage_screen",
    "others",
    "roof",
    "spare_tire",
    "wheel"
]

FRONTEND_KEYS = [
    "Interior",
    "SpareTire",
    "ChassisNumber",
    "Accessories",
    "Dashcam",
    "Odometer",
    "TaxSticker",
    "RegistrationDoc",
    "EngineCompartment",
    "TireFrontLeft",
    "TireFrontRight",
    "TireBackLeft",
    "TireBackRight",
    "Others"
]

LABELS = EXTERIOR_LABELS + FRONTEND_KEYS + YOLO_CLASSES

INSURANCE_ANGLE_MAP = {
    "Front":       ["Front"],
    "Front-Left":  ["Front-Left"],
    "Left":        ["Left"],
    "Back-Left":   ["Back-Left"],
    "Back":        ["Back"],
    "Back-Right":  ["Back-Right"],
    "Right":       ["Right"],
    "Front-Right": ["Front-Right"],
    "Roof":        ["Roof", "roof"],
    
    "Interior":          ["interior"],
    "SpareTire":         ["spare_tire"],
    "ChassisNumber":     ["chassis_number"],
    "Accessories":       ["others"],
    "Dashcam":           ["dashcam"],
    "Odometer":          ["mileage_screen"],
    "TaxSticker":        ["inspection_document"],
    "RegistrationDoc":   ["inspection_document"],
    "EngineCompartment": ["engine_room"],
    "TireFrontLeft":     ["wheel"],
    "TireFrontRight":    ["wheel"],
    "TireBackLeft":      ["wheel"],
    "TireBackRight":     ["wheel"],
    "Others":            ["others"]
}

SWAP_MAP = {
    "Front-Left":  "Front-Right",
    "Front-Right": "Front-Left",
    "Left":        "Right",
    "Right":       "Left",
    "Back-Left":   "Back-Right",
    "Back-Right":  "Back-Left",
}

CLASS_GROUPS = {
    "chassis_number": {"group": "Document", "th_name": "เลขตัวถัง", "en_name": "Chassis Number"},
    "dashcam": {"group": "Accessories", "th_name": "กล้องหน้ารถ", "en_name": "Dashcam"},
    "engine_room": {"group": "Engine Compartment", "th_name": "ห้องเครื่อง", "en_name": "Engine Room"},
    "inspection_document": {"group": "Document", "th_name": "เอกสารตรวจสภาพรถ", "en_name": "Inspection Document"},
    "interior": {"group": "Interior", "th_name": "ภายในห้องโดยสาร", "en_name": "Interior"},
    "mileage_screen": {"group": "Interior", "th_name": "หน้าจอกิโลเมตร", "en_name": "Mileage Screen"},
    "others": {"group": "Other", "th_name": "อื่นๆ", "en_name": "Others"},
    "roof": {"group": "Exterior", "th_name": "หลังคา", "en_name": "Roof"},
    "spare_tire": {"group": "Exterior", "th_name": "ยางอะไหล่", "en_name": "Spare Tire"},
    "wheel": {"group": "Exterior", "th_name": "ล้อรถ", "en_name": "Wheel"},
    "exterior": {"group": "Exterior", "th_name": "ภายนอก", "en_name": "Exterior"},
    "Front": {"group": "Exterior", "th_name": "ด้านหน้า", "en_name": "Front"},
    "Front-Left": {"group": "Exterior", "th_name": "ด้านหน้าซ้าย", "en_name": "Front-Left"},
    "Left": {"group": "Exterior", "th_name": "ด้านซ้าย", "en_name": "Left"},
    "Back-Left": {"group": "Exterior", "th_name": "ด้านหลังซ้าย", "en_name": "Back-Left"},
    "Back": {"group": "Exterior", "th_name": "ด้านหลัง", "en_name": "Back"},
    "Back-Right": {"group": "Exterior", "th_name": "ด้านหลังขวา", "en_name": "Back-Right"},
    "Right": {"group": "Exterior", "th_name": "ด้านขวา", "en_name": "Right"},
    "Front-Right": {"group": "Exterior", "th_name": "ด้านหน้าขวา", "en_name": "Front-Right"}
}

THAI_TO_EN_CLASS_MAP = {
    "exterior": "exterior",
    "กรณีมีอุปกรณ์ตกแต่ง": "others",
    "กล้องติดหน้ารถ": "dashcam",
    "จอเลขไมล์": "mileage_screen",
    "ภายในอุปกรณ์ตกแต่ง": "interior",
    "ยางอะไหล่": "spare_tire",
    "ล้อที่ให้เห็นยี่ห้อและขนาดยาง": "wheel",
    "หลังคารถยนต์": "roof",
    "ห้องเครื่องยนต์": "engine_room",
    "อื่นๆ(MTPhoto)": "others",
    "เลขตัวถังรถยนต์": "chassis_number",
    "ใบถ่ายรูปตรวจสภาพ": "inspection_document"
}

def normalize_class_name(name: str) -> str:
    return name.lower()

# Dynamically populate INSURANCE_ANGLE_MAP for YOLO classes without overwriting existing frontend keys
for cls in YOLO_CLASSES:
    if cls not in INSURANCE_ANGLE_MAP:
        INSURANCE_ANGLE_MAP[cls] = [cls]
    norm = normalize_class_name(cls)
    if norm not in INSURANCE_ANGLE_MAP and norm not in INSURANCE_ANGLE_MAP:
        INSURANCE_ANGLE_MAP[norm] = [cls]

def map_yolo_to_frontend(cls_name: str) -> str:
    cls_lower = cls_name.lower()
    if cls_lower == "chassis_number":
        return "ChassisNumber"
    if cls_lower == "dashcam":
        return "Dashcam"
    if cls_lower == "engine_room":
        return "EngineCompartment"
    if cls_lower == "inspection_document":
        return "RegistrationDoc"
    if cls_lower == "interior":
        return "Interior"
    if cls_lower == "mileage_screen":
        return "Odometer"
    if cls_lower == "roof":
        return "Roof"
    if cls_lower == "spare_tire":
        return "SpareTire"
    if cls_lower == "others":
        return "Others"
    if cls_lower == "wheel":
        return "TireFrontLeft" # Default fallback
    return cls_name

def build_result(item, probs: list, yolo_gen_out, total_ms: float, settings) -> dict:
    norm_expected = normalize_class_name(item.expected_view)
    
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

    largest_car_ratio = 0.0
    is_too_far = False

    # Calculate largest car ratio if Car/Roof is detected
    for d in yolo_detections:
        if d["label"].lower() in ["car", "roof"]:
            if yolo_gen_out is not None and hasattr(yolo_gen_out, "boxes") and yolo_gen_out.boxes is not None:
                names = yolo_gen_out.names
                for idx, c in enumerate(yolo_gen_out.boxes.cls):
                    if names[int(c)].lower() in ["car", "roof"] and hasattr(yolo_gen_out.boxes, "xyxyn"):
                        xyxyn = yolo_gen_out.boxes.xyxyn[idx]
                        area = float(xyxyn[2] - xyxyn[0]) * float(xyxyn[3] - xyxyn[1])
                        if area > largest_car_ratio:
                            largest_car_ratio = area

    if largest_car_ratio > 0 and largest_car_ratio < settings.MIN_CAR_AREA_RATIO:
        is_too_far = True

    # --- Heuristic to fix YOLO Alloutcar.pt hallucinations ---
    # If a large car/roof is detected in the image, it is an exterior shot.
    # We should ignore any hallucinatory interior classes predicted by YOLO.
    if largest_car_ratio >= 0.10:
        filtered_detections = [
            d for d in yolo_detections 
            if d["label"].lower() not in ["interior", "dashcam", "mileage_screen"]
        ]
        if filtered_detections:
            yolo_detections = filtered_detections

    # Sort detections again just in case
    yolo_detections.sort(key=lambda x: x["confidence"], reverse=True)

    yolo_top1_label = yolo_detections[0]["label"].lower() if yolo_detections else ""
    yolo_exterior = (yolo_top1_label == "exterior")

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
                "label": map_yolo_to_frontend(best_det["label"]),
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
            if item.expected_view in ["Left", "Right"] and best["label"] in ["Left", "Right"]:
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
                    "label": map_yolo_to_frontend(best_det["label"]),
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

    # Determine class details
    class_details = None
    pred_label = actual_detected_label
    if pred_label in CLASS_GROUPS:
        class_details = CLASS_GROUPS[pred_label].copy()
        class_details["detected_class"] = pred_label
    else:
        class_details = {
            "group": "Other/Unknown",
            "th_name": pred_label,
            "en_name": pred_label,
            "detected_class": pred_label
        }

    return {
        "status"       : "success",
        "prediction"   : best,
        "is_car"       : is_car,
        "match"        : match,
        "quality"      : {
            "is_blurry": is_blurry,
            "blur_score": round(item.blur_score, 2),
            "is_too_far": is_too_far,
            "car_area_ratio": round(largest_car_ratio, 4)
        },
        "time_ms"      : round(total_ms, 2),
        "class_details": class_details
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
            "class_details": res.get("class_details", None)
        })
    return final_results
