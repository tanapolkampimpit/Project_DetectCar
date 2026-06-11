import logging
import torch
import numpy as np
from app.core.config import settings
from app.models.convnext import MultiTaskConvNeXt
from app.models.yolo import get_yolo_model

logger = logging.getLogger("analyze_api")

def load_models():
    """
    Loads all AI models required for the application.
    Returns:
        tuple: (convnext, yolo_gen, yolo_damage)
    """
    logger.info("Loading Models | device=%s", settings.DEVICE)

    # 1. Load ConvNeXt
    convnext = MultiTaskConvNeXt().to(settings.DEVICE)
    try:
        state_dict = torch.load(settings.MODEL_PATH, map_location=settings.DEVICE, weights_only=True)
        
        # Handle key differences between Model_detect_0.pth and 8_Roof.pth
        if "fc_projection.weight" in state_dict:
            state_dict["backbone.head.fc.weight"] = state_dict.pop("fc_projection.weight")
            state_dict["backbone.head.fc.bias"] = state_dict.pop("fc_projection.bias")

        convnext.load_state_dict(state_dict, strict=False)
        convnext.eval()
        
        if settings.USE_GPU:
            convnext = convnext.half()
        logger.info("Loaded ConvNeXt model successfully.")
    except Exception as e:
        logger.error("Failed to load ConvNeXt model: %s", e)
        raise

    # 2. Load YOLO General
    try:
        yolo_gen = get_yolo_model(settings.YOLO_GEN_PATH, settings.DEVICE)
        logger.info("Loaded YOLO Gen model successfully.")
    except Exception as e:
        logger.error("Failed to load YOLO Gen model: %s", e)
        raise

    # 3. Load YOLO Damage
    try:
        yolo_damage = get_yolo_model(settings.YOLO_DAMAGE_PATH, settings.DEVICE)
        logger.info("Loaded YOLO Damage model successfully.")
    except Exception as e:
        logger.error("Failed to load YOLO Damage model: %s", e)
        raise

    # Warmup
    try:
        logger.info("Warming up models...")
        dummy_tensor = torch.zeros(settings.BATCH_MAX_SIZE, 3, 224, 224).to(settings.DEVICE)
        if settings.USE_GPU:
            dummy_tensor = dummy_tensor.half()
            
        with torch.inference_mode(): 
            convnext(dummy_tensor)

        dummy_imgs = [np.zeros((224, 224, 3), dtype=np.uint8)] * settings.BATCH_MAX_SIZE
        yolo_gen(dummy_imgs, verbose=False, device=settings.DEVICE)
        yolo_damage(dummy_imgs, verbose=False, device=settings.DEVICE)
        logger.info(" Models ready | batch_warmup_size=%d", settings.BATCH_MAX_SIZE)
    except Exception as e:
        logger.warning("Failed to warmup models: %s", e)

    return convnext, yolo_gen, yolo_damage
