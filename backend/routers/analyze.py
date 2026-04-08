import io
import cv2
import numpy as np
import torch
import torch.nn as nn
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from PIL import Image
from torchvision import transforms
import timm

router = APIRouter(prefix="/api/v1", tags=["Inference"])

device = torch.device("cpu")
MODEL_PATH = r"C:\Users\tanap\Documents\Project_DetectCar\backend\Services\convnext-multi-weak.pth"

# ── All 8 model labels ──────────────────────────────────────────────────────
LABELS = ["Front", "Front-Left", "Left", "Back-Left", "Back", "Back-Right", "Right", "Front-Right"]

# ── Insurance-required angles (6 views) ────────────────────────────────────
# Maps expected_view key  →  list of model label(s) that satisfy it
INSURANCE_ANGLE_MAP = {
    "Front":        ["Front"],
    "Back":         ["Back"],
    "Left":         ["Left"],
    "Right":        ["Right"],
    "Front-Left":   ["Front-Left"],
    "Front-Right":  ["Front-Right"],
    "Back-Left":    ["Back-Left"],
    "Back-Right":   ["Back-Right"],
}

# Confidence threshold to call it a "match" (%)
MATCH_THRESHOLD = 55.0
IS_CAR_THRESHOLD = 40.0

# ── Model ───────────────────────────────────────────────────────────────────
class MultiTaskConvNeXt(nn.Module):
    def __init__(self, num_classes=8, num_angles=1):
        super().__init__()
        self.backbone = timm.create_model("convnext_small", pretrained=False)
        in_features = self.backbone.head.fc.in_features
        self.backbone.head.fc = nn.Linear(in_features, 1024)
        self.class_prediction = nn.Linear(1024, num_classes)
        self.angle_prediction = nn.Linear(1024 + num_classes, num_angles)

    def forward(self, x):
        features = self.backbone(x)
        class_out = self.class_prediction(features)
        combined = torch.cat((features, class_out), dim=1)
        angle_out = self.angle_prediction(combined)
        return class_out, angle_out


model = MultiTaskConvNeXt(num_classes=8, num_angles=1)
try:
    state_dict = torch.load(MODEL_PATH, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")

preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# ── Image quality checks ─────────────────────────────────────────────────────

def check_blur(image_np: np.ndarray) -> dict:
    """
    Laplacian variance — higher = sharper.
    Threshold tuned for car inspection photos.
    """
    gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_sharp = bool(variance >= 80.0)
    return {
        "blur_score": round(variance, 2),
        "is_sharp": is_sharp,
        "blur_message": None if is_sharp else "ภาพเบลอเกินไป กรุณาถ่ายใหม่ให้ชัดขึ้น",
    }


def check_car_coverage(image_np: np.ndarray) -> dict:
    """
    Heuristic: detect large connected dark/colored region suggesting the car body
    covers a reasonable portion of the frame (>= 25%).
    Uses simple edge density as proxy for object coverage.
    """
    gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.sum(edges > 0)) / float(edges.shape[0] * edges.shape[1])
    has_sufficient_content = bool(edge_density >= 0.03)
    is_full_car = bool(edge_density <= 0.25)

    col_has_edges = np.any(edges > 0, axis=0)
    coverage_ratio = round(float(np.sum(col_has_edges)) / float(len(col_has_edges)) * 100, 1)
    car_fills_frame = bool(coverage_ratio >= 40.0)

    ok = bool(has_sufficient_content and car_fills_frame)
    message = None
    if not has_sufficient_content:
        message = "ไม่พบรถยนต์ในภาพ หรือภาพว่างเกินไป"
    elif not car_fills_frame:
        message = "ถ่ายรถให้อยู่กลางภาพและเห็นรถเต็มคัน"

    return {
        "edge_density": round(edge_density * 100, 2),
        "coverage_ratio": coverage_ratio,
        "car_fills_frame": ok,
        "coverage_message": message,
    }


def check_brightness(image_np: np.ndarray) -> dict:
    """Check image is neither too dark nor overexposed."""
    gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    mean_brightness = float(np.mean(gray))
    too_dark = bool(mean_brightness < 40)
    too_bright = bool(mean_brightness > 220)
    ok = bool(not too_dark and not too_bright)
    message = None
    if too_dark:
        message = "ภาพมืดเกินไป กรุณาถ่ายในที่ที่มีแสงเพียงพอ"
    elif too_bright:
        message = "ภาพสว่างเกินไป (overexposed) กรุณาหลีกเลี่ยงแสงสะท้อน"
    return {
        "brightness": round(mean_brightness, 1),
        "brightness_ok": ok,
        "brightness_message": message,
    }


# ── Main endpoint ─────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_car_view(
    file: UploadFile = File(...),
    expected_view: str = Form("Front"),
):
    try:
        content = await file.read()
        pil_image = Image.open(io.BytesIO(content)).convert("RGB")
        image_np = np.array(pil_image)

        # ── Quality checks ──────────────────────────────────────────────────
        blur_info = check_blur(image_np)
        coverage_info = check_car_coverage(image_np)
        brightness_info = check_brightness(image_np)

        quality_issues = []
        if not blur_info["is_sharp"]:
            quality_issues.append(blur_info["blur_message"])
        if not coverage_info["car_fills_frame"]:
            quality_issues.append(coverage_info["coverage_message"])
        if not brightness_info["brightness_ok"]:
            quality_issues.append(brightness_info["brightness_message"])

        quality_ok = len(quality_issues) == 0

        # ── AI Classification ───────────────────────────────────────────────
        input_tensor = preprocess(pil_image).unsqueeze(0).to(device)
        with torch.no_grad():
            class_out, angle_out = model(input_tensor)
            probs = torch.nn.functional.softmax(class_out, dim=1)[0].tolist()

        # Build per-label results (all 8 labels)
        results = []
        for label, prob in zip(LABELS, probs):
            results.append({
                "label": label,
                "confidence": round(prob * 100, 2),
            })
        results.sort(key=lambda x: x["confidence"], reverse=True)

        best_label = results[0]["label"]
        best_confidence = results[0]["confidence"]

        is_car = bool(best_confidence >= IS_CAR_THRESHOLD)

        # ── Match check ─────────────────────────────────────────────────────
        accepted_labels = INSURANCE_ANGLE_MAP.get(expected_view, [expected_view])
        angle_match = bool(best_label in accepted_labels and best_confidence >= MATCH_THRESHOLD)
        match = bool(angle_match and is_car and quality_ok)

        return {
            "status": "success",
            "predictions": results,
            "is_car": is_car,
            "best_label": best_label,
            "best_confidence": float(best_confidence),
            "match": match,
            "angle_match": angle_match,
            "quality_ok": bool(quality_ok),
            "quality_issues": quality_issues,
            "quality_details": {
                "blur": blur_info,
                "coverage": coverage_info,
                "brightness": brightness_info,
            },
            "detected_angle": float(angle_out.item()),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))