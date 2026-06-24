from pydantic import BaseModel, Field


class Prediction(BaseModel):
    label: str
    confidence: float


class DamageDetection(BaseModel):
    label: str
    confidence: float
    box: list[float]


class Quality(BaseModel):
    is_blurry: bool
    blur_score: float
    is_too_far: bool | None = None
    car_area_ratio: float | None = None


class PredictViewResponse(BaseModel):
    prediction: Prediction
    is_car: bool
    match: bool
    quality: Quality
    time_ms: float
    request_id: str | None = None


class DamageResponse(BaseModel):
    damages: list[DamageDetection]
    quality: Quality
    time_ms: float
    request_id: str | None = None


class ImageQualityError(BaseModel):
    status: str = "error"
    error: str
    message: str
    quality: Quality
    request_id: str | None = None
    damages: list[DamageDetection] | None = Field(default=None)
