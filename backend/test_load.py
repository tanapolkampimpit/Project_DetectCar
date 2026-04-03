import torch
import torch.nn as nn
from torchvision import models
import os

MODEL_PATH = r"C:\Users\tanap\Documents\Project_Cattmat\backend\Services\convnext-multi-weak.pth"

def create_model():
    model = models.convnext_tiny(weights=None)
    num_ftrs = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(num_ftrs, 8) 
    return model

if os.path.exists(MODEL_PATH):
    model = create_model()
    state_dict = torch.load(MODEL_PATH, map_location='cpu')
    try:
        model.load_state_dict(state_dict)
        print("Success: Model loaded perfectly.")
    except Exception as e:
        print("Mismatched keys error:")
        print(e)
else:
    print(f"File not found: {MODEL_PATH}")
