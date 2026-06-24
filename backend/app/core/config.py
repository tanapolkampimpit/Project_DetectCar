from pathlib import Path

from pydantic_settings import BaseSettings


BACKEND_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    USE_GPU: bool = False 
    DEVICE: str = "cpu"
    MODEL_PATH: str = "./ai/convnext_vehicle_view_classifier.pth"
    YOLO_GEN_PATH: str = "./ai/yolo_photo_type_classifier.pt"
    YOLO_DAMAGE_PATH: str = "./ai/yolo_damage_detector.pt"
    
    BATCH_MAX_SIZE: int = 32
    BATCH_MAX_WAIT: float = 0.05
    NUM_BATCH_WORKERS: int = 1
    MAX_QUEUE_DEPTH: int = 200
    MAX_FILE_BYTES: int = 25 * 1024 * 1024
    MAX_BATCH_PREP_CONCURRENCY: int = 4
    BLUR_THRESHOLD: float = 50.0
    MIN_CAR_AREA_RATIO: float = 0.08
    DAMAGE_CONFIDENCE_THRESHOLD: float = 0.15
    DAMAGE_NMS_IOU_THRESHOLD: float = 0.85
    DAMAGE_IMAGE_SIZE: int = 1280

    # --- Security Configs ---
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    MATCH_THRESHOLD: float = 60.0

    def model_post_init(self, __context):
        self.MODEL_PATH = self._resolve_backend_path(self.MODEL_PATH)
        self.YOLO_GEN_PATH = self._resolve_backend_path(self.YOLO_GEN_PATH)
        self.YOLO_DAMAGE_PATH = self._resolve_backend_path(self.YOLO_DAMAGE_PATH)

    @staticmethod
    def _resolve_backend_path(value: str) -> str:
        path = Path(value)
        if path.is_absolute():
            return str(path)

        backend_relative = BACKEND_DIR / path
        if backend_relative.exists():
            return str(backend_relative)

        cwd_relative = Path.cwd() / path
        if cwd_relative.exists():
            return str(cwd_relative)

        return str(backend_relative)

    def normalize_runtime(self, logger=None):
        import torch

        requested_gpu = self.USE_GPU or self.DEVICE.startswith("cuda")
        if requested_gpu and not torch.cuda.is_available():
            if logger:
                logger.warning("CUDA requested but unavailable. Falling back to CPU.")
            self.USE_GPU = False
            self.DEVICE = "cpu"
            return

        if self.USE_GPU and self.DEVICE == "cpu":
            self.DEVICE = "cuda"
    
    class Config:
        env_file = str(BACKEND_DIR / ".env")
        extra = "ignore"

settings = Settings()
