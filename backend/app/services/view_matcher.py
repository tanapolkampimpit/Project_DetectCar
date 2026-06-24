from app.core.labels import (
    EXTERIOR_LABELS,
    INSURANCE_ANGLE_MAP,
    SWAP_MAP,
    map_yolo_to_frontend,
    normalize_class_name,
)


def has_yolo_exterior(detections: list[dict], probs, match_threshold: float) -> bool:
    if not detections:
        return False

    top_detection = detections[0]
    if top_detection["label"].lower() == "exterior" and top_detection["confidence"] >= match_threshold:
        return True

    if top_detection["label"].lower() == "others" and probs is not None and max(probs) > 0.4:
        return True

    return False


def decide_yolo_class(expected_view: str, detections: list[dict], match_threshold: float) -> tuple[dict, bool, bool]:
    best_detection = detections[0] if detections else {"label": "Unknown", "confidence": 0.0}
    accepted = INSURANCE_ANGLE_MAP.get(expected_view, [expected_view])
    accepted_lower = [value.lower() for value in accepted]

    matching_detection = None
    for detection in detections:
        normalized_label = normalize_class_name(detection["label"])
        if detection["label"].lower() in accepted_lower or normalized_label in accepted_lower:
            if matching_detection is None or detection["confidence"] > matching_detection["confidence"]:
                matching_detection = detection

    if matching_detection is not None and matching_detection["confidence"] >= match_threshold:
        return (
            {"label": expected_view, "confidence": matching_detection["confidence"]},
            True,
            True,
        )

    return (
        {
            "label": map_yolo_to_frontend(best_detection["label"], expected_view),
            "confidence": best_detection["confidence"],
        },
        best_detection["confidence"] >= match_threshold,
        False,
    )


def build_exterior_results(probs) -> list[dict]:
    results = []
    for i, original_label in enumerate(EXTERIOR_LABELS):
        final_label = SWAP_MAP.get(original_label, original_label)
        confidence = float(probs[i] * 100) if i < len(probs) else 0.0
        results.append({"label": final_label, "confidence": confidence})

    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results


def decide_exterior_class(
    expected_view: str,
    probs,
    detections: list[dict],
    yolo_exterior: bool,
    match_threshold: float,
) -> tuple[dict, bool, bool]:
    if not yolo_exterior:
        if detections:
            best_detection = detections[0]
            return (
                {
                    "label": map_yolo_to_frontend(best_detection["label"], expected_view),
                    "confidence": best_detection["confidence"],
                },
                best_detection["confidence"] >= match_threshold,
                False,
            )

        return {"label": "Unknown", "confidence": 0.0}, False, False

    results = build_exterior_results(probs)
    best = results[0]
    accepted = INSURANCE_ANGLE_MAP.get(expected_view, [expected_view])
    match = best["label"] in accepted and best["confidence"] >= match_threshold

    if expected_view in ["Left", "Right"] and best["label"] == expected_view:
        left_confidence = next((r["confidence"] for r in results if r["label"] == "Left"), 0.0)
        right_confidence = next((r["confidence"] for r in results if r["label"] == "Right"), 0.0)
        if left_confidence + right_confidence >= 80.0:
            match = True

    return best, True, match
