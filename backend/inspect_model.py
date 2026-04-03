import torch
import os

path = r"C:\Users\tanap\Documents\Project_Cattmat\backend\Services\convnext-multi-weak.pth"
if os.path.exists(path):
    print(f"Loading state dict from {path}")
    state_dict = torch.load(path, map_location='cpu')
    print("Keys in state dict:")
    for k in state_dict.keys():
        if 'classifier' in k or 'head' in k:
            print(f"{k}: {state_dict[k].shape}")
else:
    print(f"File not found: {path}")
