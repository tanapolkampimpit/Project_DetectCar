import logging
from ultralytics import YOLO

def get_yolo_model(model_path: str, device: str):
    logging.getLogger("ultralytics").setLevel(logging.ERROR)
    yolo = YOLO(model_path)
    if device == "cuda":
        yolo.to(device)
    return yolo
