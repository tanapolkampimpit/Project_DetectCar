from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    USE_GPU: bool = False 
    DEVICE: str = "cpu"
    MODEL_PATH: str = "./ModelsAi/8_Roof.pth" 
    YOLO_GEN_PATH: str = "./ModelsAi/outside_Now.pt"
    YOLO_DAMAGE_PATH: str = "./ModelsAi/modeldamage_6_10.pt"
    
    BATCH_MAX_SIZE: int = 32
    BATCH_MAX_WAIT: float = 0.05
    NUM_BATCH_WORKERS: int = 1
    MAX_QUEUE_DEPTH: int = 200
    MAX_FILE_BYTES: int = 25 * 1024 * 1024
    BLUR_THRESHOLD: float = 50.0
    MIN_CAR_AREA_RATIO: float = 0.08

    # --- Security Configs ---
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    MATCH_THRESHOLD: float = 30.0
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
