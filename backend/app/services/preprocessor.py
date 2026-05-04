import cv2
import numpy as np
from torchvision import transforms
from typing import Optional, Tuple
from turbojpeg import TurboJPEG

# โหลด TurboJPEG (ถ้าหาไม่เจอให้เป็น None เพื่อไม่ให้โปรแกรมล่ม)
try:
    jpeg = TurboJPEG()
except Exception:
    jpeg = None

preprocess = transforms.Compose([
    transforms.ToTensor(),
    transforms.Resize((224, 224), antialias=True),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

def decode_and_analyze_image(content: bytes) -> Optional[Tuple[np.ndarray, float]]:
    img = None
    
    # 1. ลองใช้ TurboJPEG ก่อน (ถ้ามีและหา library เจอ)
    if jpeg is not None:
        try:
            # pixel_format 1 คือ TJPF_BGR (เพื่อให้ผลลัพธ์เหมือน OpenCV)
            img = jpeg.decode(content, pixel_format=1)
        except Exception:
            pass

    # 2. ถ้า TurboJPEG แกะไม่ได้ ให้ใช้ OpenCV ปกติ (ทางสำรอง)
    if img is None:
        img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
        
    if img is None: return None
    # Calculate blur using Variance of Laplacian
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img_rgb, float(blur_score)
