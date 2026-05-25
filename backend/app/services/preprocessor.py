import cv2
import numpy as np
import torch
from torchvision import transforms
from typing import Optional, Tuple
from app.core.config import settings

preprocess = transforms.Compose([
    transforms.ToTensor(),
    transforms.Resize((224, 224), antialias=True),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

def decode_and_analyze_image(content: bytes) -> Optional[Tuple[np.ndarray, float]]:
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
    if img is None: return None
    # Calculate blur using Variance of Laplacian
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img_rgb, float(blur_score)

def prepare_image_for_inference(content: bytes) -> Optional[Tuple[np.ndarray, float, torch.Tensor]]:
    """
    Combines decoding, blur analysis, and preprocessing into a single call 
    to minimize ThreadPoolExecutor overhead.
    """
    decoded = decode_and_analyze_image(content)
    if decoded is None: return None
    img, blur_score = decoded
    tensor = preprocess(img)
    if settings.USE_GPU and torch.cuda.is_available():
        try:
            tensor = tensor.pin_memory()
        except Exception:
            pass
    return img, blur_score, tensor
