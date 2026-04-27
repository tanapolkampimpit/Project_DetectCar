import torch
import torch.nn as nn
import timm

class MultiTaskConvNeXt(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = timm.create_model("convnext_small", pretrained=False)
        in_features = self.backbone.head.fc.in_features
        self.backbone.head.fc = nn.Linear(in_features, 1024)
        self.class_prediction = nn.Linear(1024, 8)
        self.angle_prediction = nn.Linear(1024 + 8, 1)

    def forward(self, x):
        f = self.backbone(x)
        c = self.class_prediction(f)
        a = self.angle_prediction(torch.cat((f, c), dim=1))
        return c, a
