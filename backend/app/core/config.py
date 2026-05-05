import torch
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    USE_GPU: bool = torch.cuda.is_available()
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    MODEL_PATH: str = "./ModelsAi/Models_1.2.pth" 
    YOLO_CLS_PATH: str = "./ModelsAi/yolov8n.pt"
    
    BATCH_MAX_SIZE: int = 32
    BATCH_MAX_WAIT: float = 0.020
    NUM_BATCH_WORKERS: int = 2
    MAX_QUEUE_DEPTH: int = 200
    MAX_FILE_BYTES: int = 25 * 1024 * 1024
    BLUR_THRESHOLD: float = 50.0
    MIN_CAR_AREA_RATIO: float = 0.08

    
    MATCH_THRESHOLD: float = 55.0
    YOLO_CONF_BYPASS: float = 80.0
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
