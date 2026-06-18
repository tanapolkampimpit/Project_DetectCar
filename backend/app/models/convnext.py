import torch
import torch.nn as nn
import timm

class MultiTaskConvNeXt(nn.Module):
    def __init__(self):
        super().__init__()
        # The legacy ConvNeXt checkpoint uses backbone.head.fc to project 768 to 1024.
        self.backbone = timm.create_model("convnext_small", pretrained=False, num_classes=1024)
        self.class_prediction = nn.Linear(1024, 8)

    def forward(self, x):
        f = self.backbone(x)
        class_logits = self.class_prediction(f)
        
        # Since the legacy ConvNeXt checkpoint does not predict Roof, we mock roof_logits with -100.0.
        # This keeps the shape of logits_9 at 9 for pipeline compatibility, while ensuring
        # the model never predicts "Roof" (softmax probability will be virtually 0%).
        roof_logits = torch.full((class_logits.shape[0], 1), -100.0, dtype=class_logits.dtype, device=class_logits.device)
        
        # class_prediction order: 
        # 0:F, 1:FL, 2:L, 3:BL, 4:B, 5:BR, 6:R, 7:FR
        # engine.py expects:
        # 0:F, 1:B, 2:L, 3:R, 4:Roof, 5:FR, 6:FL, 7:BR, 8:BL
        logits_9 = torch.cat([
            class_logits[:, 0:1], # 0: Front
            class_logits[:, 4:5], # 1: Back
            class_logits[:, 2:3], # 2: Left
            class_logits[:, 6:7], # 3: Right
            roof_logits,          # 4: Roof (always 0 probability)
            class_logits[:, 7:8], # 5: Front Right
            class_logits[:, 1:2], # 6: Front Left
            class_logits[:, 5:6], # 7: Back Right
            class_logits[:, 3:4]  # 8: Back Left
        ], dim=1)
        
        return logits_9
