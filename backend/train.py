import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
import timm
from tqdm import tqdm
from PIL import Image
import pandas as pd
import numpy as np

# ----------------------------------------
# 1. โมเดลเดิมของคุณ (MultiTaskConvNeXt)
# ----------------------------------------
class MultiTaskConvNeXt(nn.Module):
    def __init__(self, num_classes=8, num_angles=1, pretrained=True):
        super().__init__()
        # ใช้ pretrained=True เพื่อให้มีพื้นฐานที่ดี
        self.backbone = timm.create_model('convnext_small', pretrained=pretrained)
        in_features_backbone = self.backbone.head.fc.in_features
        self.backbone.head.fc = nn.Linear(in_features_backbone, 1024)
        
        self.class_prediction = nn.Linear(1024, num_classes)
        self.angle_prediction = nn.Linear(1024 + num_classes, num_angles)

    def forward(self, x):
        features = self.backbone(x)
        class_out = self.class_prediction(features)
        
        # เชื่อมต่อ features กับ class prediction เพื่อส่งไปทายองศา
        combined = torch.cat((features, class_out), dim=1)
        angle_out = self.angle_prediction(combined)
        return class_out, angle_out

# ----------------------------------------
# 2. Dataset แบบกำหนดเอง (Custom Dataset)
# ----------------------------------------
class CarDataset(Dataset):
    """
    คาดหวังให้คุณมีไฟล์ CSV ที่มีโครงสร้าง:
    image_path, label_idx (0-7), angle (เช่น 0-360)
    """
    def __init__(self, csv_file, transform=None):
        self.data = pd.read_csv(csv_file)
        self.transform = transform

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        img_path = self.data.iloc[idx]['image_path']
        label = int(self.data.iloc[idx]['label_idx'])
        angle = float(self.data.iloc[idx]['angle'])
        
        image = Image.open(img_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        
        return image, label, torch.tensor([angle], dtype=torch.float32)

# ----------------------------------------
# 3. ฟังก์ชันการฝึกสอน (Training Loop)
# ----------------------------------------
def train():
    # --- การตั้งค่า (Configuration) ---
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    BATCH_SIZE = 32
    EPOCHS = 50
    LR = 1e-4
    CSV_PATH = "C:/Users/tanap/Documents/dataset_project/CFV-Dataset/train.csv" # เปลี่ยนเป็น path ของคุณ
    SAVE_PATH = "Services/convnext-multi-improved.pth"

    # --- Data Augmentation ---
    # ใช้ TrivialAugment เพื่อความฉลาดในการเลือก Augmentation
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(), # ระวัง: ถ้าพลิกแล้ว Angle ต้องเปลี่ยนด้วยนะ (เลือกใช้หรือไม่ใช้ตามความเหมาะสม)
        transforms.ColorJitter(0.2, 0.2, 0.2), 
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # เช็คว่าไฟล์ข้อมูลมีไหม (หากไม่มีให้ข้ามไปสอนตัวอย่าง)
    if not os.path.exists(CSV_PATH):
        print(f"❌ Error: {CSV_PATH} not found. Please prepare your CSV file first.")
        return

    dataset = CarDataset(CSV_PATH, transform=train_transform)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)

    # --- สร้างโมเดล ---
    model = MultiTaskConvNeXt(num_classes=8, num_angles=1, pretrained=True).to(DEVICE)
    
    # --- Loss & Optimizer ---
    criterion_cls = nn.CrossEntropyLoss(label_smoothing=0.1) # เพิ่ม Label Smoothing
    criterion_reg = nn.MSELoss()
    
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=0.05)
    
    # Cosine Annealing (ช่วยให้ LR ค่อยๆ ลดลงอย่างนุ่มนวล)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    # --- เริ่มฝึกสอน ---
    print(f"Starting training on {DEVICE}...")
    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        
        pbar = tqdm(dataloader, desc=f"Epoch {epoch+1}/{EPOCHS}")
        for images, labels, angles in pbar:
            images, labels, angles = images.to(DEVICE), labels.to(DEVICE), angles.to(DEVICE)
            
            optimizer.zero_grad()
            
            # Forward Pass
            class_out, angle_out = model(images)
            
            # คำนวณ Loss (สามารถปรับน้ำหนัก alpha ระหว่างสองงานได้)
            loss_cls = criterion_cls(class_out, labels)
            loss_reg = criterion_reg(angle_out, angles) / 1000.0 # หารเพื่อสเกลลดขนาดค่า Error
            
            total_loss = loss_cls + (0.5 * loss_reg) 
            
            # Backward Pass
            total_loss.backward()
            optimizer.step()
            
            running_loss += total_loss.item()
            pbar.set_postfix({'loss': f"{total_loss.item():.4f}"})
            
        scheduler.step()
        avg_loss = running_loss / len(dataloader)
        print(f"Epoch {epoch+1} finished with Average Loss: {avg_loss:.4f}")

        # บันทึกโมเดลทุกรอบ
        os.makedirs("Services", exist_ok=True)
        torch.save(model.state_dict(), SAVE_PATH)

    print(f"Training Complete! Model saved to {SAVE_PATH}")

if __name__ == "__main__":
    train()
