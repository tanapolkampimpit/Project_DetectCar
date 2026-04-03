import io
import torch
import torch.nn as nn
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from torchvision import transforms
import timm  # เพิ่มไลบรารี timm

router = APIRouter(prefix="/api/v1", tags=["Inference"])

# --- Model Loading Logic ---
device = torch.device("cpu")
MODEL_PATH = r"C:\Users\tanap\Documents\Project_Cattmat\backend\Services\convnext-multi-weak.pth"
LABELS = ["Front", "Front Left", "Left", "Back Left", "Back", "Back Right", "Right", "Front Right"]

# 1. สร้าง Class ของโมเดลให้โครงสร้างตรงกับไฟล์ Weights
class MultiTaskConvNeXt(nn.Module):
    def __init__(self, num_classes=8, num_angles=1): 
        super().__init__()
        # --- เปลี่ยนตรงนี้ให้กลับเป็น small ---
        self.backbone = timm.create_model('convnext_small', pretrained=False)
        
        in_features_backbone = self.backbone.head.fc.in_features 
        self.backbone.head.fc = nn.Linear(in_features_backbone, 1024)
        
        self.class_prediction = nn.Linear(1024, num_classes)
        self.angle_prediction = nn.Linear(1024 + num_classes, num_angles)
    def forward(self, x):
        features = self.backbone(x) # [batch, 1024]
        class_out = self.class_prediction(features) # [batch, 8]
        
        # Concatenate features กับ class_out เพื่อเข้า angle_prediction
        combined = torch.cat((features, class_out), dim=1) # [batch, 1032]
        angle_out = self.angle_prediction(combined) # [batch, 1]
        
        return class_out, angle_out 

def create_model():
    # สร้างโมเดลให้ตรงกับ Checkpoint: 8 classes (sectors) และ 1 regression (angle)
    model = MultiTaskConvNeXt(num_classes=8, num_angles=1) 
    return model

model = create_model()
try:
    state_dict = torch.load(MODEL_PATH, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")

preprocess = transforms.Compose([
    transforms.Resize((232, 232)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

@router.post("/analyze")
async def analyze_car_view(file: UploadFile = File(...)):
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert('RGB')
        input_tensor = preprocess(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            # 2. โมเดลตอนนี้พ่น output ออกมา 2 ค่า (class และ angle)
            # จากการวิเคราะห์ checkpoint: 
            # - class_out คือส่วนที่เป็น "มุม (8 sectors)" [8, 1024]
            # - angle_out คือส่วนที่เป็น regression [1, 1032]
            class_out, angle_out = model(input_tensor)
            
            # ใช้ผลลัพธ์จาก class_prediction ในการระหุ 8 ทิศทาง
            probs = torch.nn.functional.softmax(class_out, dim=1)[0].tolist()
            
            # Map 8 labels to 4 primary classes
            agg_results = {
                "Front": probs[0] + (probs[1] * 0.5) + (probs[7] * 0.5),
                "Back": probs[4] + (probs[3] * 0.5) + (probs[5] * 0.5),
                "Left": probs[2] + (probs[1] * 0.5) + (probs[3] * 0.5),
                "Right": probs[6] + (probs[7] * 0.5) + (probs[5] * 0.5)
            }
            
            # Convert to results list
            results = []
            max_conf = 0
            for label, prob in agg_results.items():
                conf = round(prob * 100, 2)
                results.append({
                    "label": label,
                    "confidence": conf
                })
                if conf > max_conf:
                    max_conf = conf
            
            # Sort by confidence
            results = sorted(results, key=lambda x: x["confidence"], reverse=True)
            
            IS_CAR_THRESHOLD = 25.0 
            is_car = max_conf >= IS_CAR_THRESHOLD
            
        return {
            "predictions": results,
            "is_car": is_car,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))