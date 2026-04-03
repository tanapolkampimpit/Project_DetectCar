import torch
import os

model_path = r"C:\Users\tanap\Documents\Project_Cattmat\backend\Services\convnext-multi-weak.pth"

if os.path.exists(model_path):
    try:
        state_dict = torch.load(model_path, map_location='cpu')
        for key in state_dict.keys():
            if 'weight' in key and ('class' in key or 'angle' in key):
                print(f"{key} shape: {state_dict[key].shape}")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"File not found: {model_path}")
