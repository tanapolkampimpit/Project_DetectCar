import torch
import os

model_path = r"C:\Users\tanap\Documents\Project_Cattmat\backend\Services\convnext-multi-weak.pth"

if os.path.exists(model_path):
    try:
        state_dict = torch.load(model_path, map_location='cpu')
        
        # Check class_prediction.weight shape
        if 'class_prediction.weight' in state_dict:
            weight = state_dict['class_prediction.weight']
            print(f"class_prediction.weight shape: {weight.shape}")
            print(f"Number of classes: {weight.shape[0]}")
        else:
            print("class_prediction.weight not found in state_dict")
            print("Available keys:", list(state_dict.keys())[:10])
            
        # Check angle_prediction.weight shape
        if 'angle_prediction.weight' in state_dict:
            weight = state_dict['angle_prediction.weight']
            print(f"angle_prediction.weight shape: {weight.shape}")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"File not found: {model_path}")
