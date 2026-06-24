from app.core.labels import THAI_TO_EN_CLASS_MAP

EXCLUDED_DAMAGE_LABELS = {"missing part"}


def _normalize_damage_label(label: str) -> str:
    return label.lower().replace("_", " ").replace("-", " ").strip()


def _box_iou(box_a: list[float], box_b: list[float]) -> float:
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if intersection == 0:
        return 0.0

    area_a = max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1])
    area_b = max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1])
    union = area_a + area_b - intersection
    return intersection / union if union > 0 else 0.0


def extract_yolo_detections(yolo_gen_out) -> list[dict]:
    detections = []
    if yolo_gen_out is None:
        return detections

    if hasattr(yolo_gen_out, "boxes") and yolo_gen_out.boxes is not None:
        names = yolo_gen_out.names
        for idx, c in enumerate(yolo_gen_out.boxes.cls):
            detections.append({
                "label": names[int(c)],
                "confidence": round(float(yolo_gen_out.boxes.conf[idx]) * 100, 2),
            })
    elif hasattr(yolo_gen_out, "probs") and yolo_gen_out.probs is not None:
        names = yolo_gen_out.names
        for idx, conf in enumerate(yolo_gen_out.probs.data):
            class_name = names[idx]
            detections.append({
                "label": THAI_TO_EN_CLASS_MAP.get(class_name, class_name),
                "confidence": round(float(conf) * 100, 2),
            })

    detections.sort(key=lambda x: x["confidence"], reverse=True)
    return detections


def suppress_overlapping_damages(damages: list[dict], iou_threshold: float = 0.85) -> list[dict]:
    kept = []
    for damage in sorted(damages, key=lambda x: x["confidence"], reverse=True):
        if all(_box_iou(damage["box"], existing["box"]) < iou_threshold for existing in kept):
            kept.append(damage)
    return kept


def extract_damage_detections(
    item,
    yolo_damage_out,
    min_confidence: float = 0.15,
    nms_iou_threshold: float = 0.85,
) -> list[dict]:
    damages = []
    if yolo_damage_out is None or not hasattr(yolo_damage_out, "boxes") or yolo_damage_out.boxes is None:
        return damages

    names = yolo_damage_out.names
    for idx, c in enumerate(yolo_damage_out.boxes.cls):
        label = names[int(c)]
        if _normalize_damage_label(label) in EXCLUDED_DAMAGE_LABELS:
            continue

        conf = float(yolo_damage_out.boxes.conf[idx])
        if conf < min_confidence:
            continue

        xyxy = yolo_damage_out.boxes.xyxy[idx].tolist()
        damages.append({
            "label": label,
            "confidence": round(conf * 100, 2),
            "box": [round(x, 2) for x in xyxy],
        })

    return suppress_overlapping_damages(damages, nms_iou_threshold)


def largest_car_area_ratio(yolo_gen_out) -> float:
    if (
        yolo_gen_out is None
        or not hasattr(yolo_gen_out, "boxes")
        or yolo_gen_out.boxes is None
        or not hasattr(yolo_gen_out.boxes, "xyxyn")
    ):
        return 0.0

    largest_ratio = 0.0
    names = yolo_gen_out.names
    for idx, c in enumerate(yolo_gen_out.boxes.cls):
        if names[int(c)].lower() not in ["exterior", "car", "roof"]:
            continue

        xyxyn = yolo_gen_out.boxes.xyxyn[idx]
        area = float(xyxyn[2] - xyxyn[0]) * float(xyxyn[3] - xyxyn[1])
        if area > largest_ratio:
            largest_ratio = area

    return largest_ratio


def filter_hallucinated_interior(detections: list[dict], largest_ratio: float, expected_view: str) -> list[dict]:
    if largest_ratio < 0.10 or expected_view in ["Interior", "Dashcam", "Odometer"]:
        return detections

    filtered = [
        detection
        for detection in detections
        if detection["label"].lower() not in ["interior", "dashcam", "mileage_screen"]
    ]
    return filtered or detections
