import torch

MODEL_PATH = r"C:\Users\tanap\Documents\Project_Cattmat\backend\Services\convnext-multi-weak.pth"
state_dict = torch.load(MODEL_PATH, map_location="cpu")

# ปริ้นท์ดูชื่อ Layer (Keys) 10 อันดับแรก และขนาดของมัน
print("=== Keys in .pth file ===")
for i, (key, value) in enumerate(state_dict.items()):
    print(f"{key}: {value.shape}")
    if i >= 10: # ดูแค่ 10-15 อันแรกกับอันสุดท้ายก็พอเห็นภาพครับ
        break
print("...")

# ลองดู Keys ส่วนท้ายๆ (พวก Head/Classifier)
print("\n=== Last few Keys ===")
keys_list = list(state_dict.keys())
for key in keys_list[-10:]:
    print(f"{key}: {state_dict[key].shape}")