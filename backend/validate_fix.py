import torch
import torch.nn as nn
import timm
import os

MODEL_PATH = r"C:\Users\tanap\Documents\Project_Cattmat\backend\Services\convnext-multi-weak.pth"

class MultiTaskConvNeXt(nn.Module):
    def __init__(self, num_classes=8, num_angles=1): 
        super().__init__()
        self.backbone = timm.create_model('convnext_small', pretrained=False)
        in_features_backbone = self.backbone.head.fc.in_features # 768
        self.backbone.head.fc = nn.Linear(in_features_backbone, 1024)
        self.class_prediction = nn.Linear(1024, num_classes)
        self.angle_prediction = nn.Linear(1024 + num_classes, num_angles)

    def forward(self, x):
        features = self.backbone(x) # [batch, 1024]
        class_out = self.class_prediction(features) # [batch, 8]
        combined = torch.cat((features, class_out), dim=1) # [batch, 1032]
        angle_out = self.angle_prediction(combined) # [batch, 1]
        return class_out, angle_out 

if os.path.exists(MODEL_PATH):
    model = MultiTaskConvNeXt(num_classes=8, num_angles=1) 
    state_dict = torch.load(MODEL_PATH, map_location='cpu')
    try:
        model.load_state_dict(state_dict)
        print("SUCCESS! Model loaded perfectly with convnext_small and new heads.")
    except Exception as e:
        print("FAILURE! Model mismatch:")
        print(e)
else:
    print(f"File not found: {MODEL_PATH}")
