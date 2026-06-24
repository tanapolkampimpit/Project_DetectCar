from pydantic import BaseModel


class PerformanceStats(BaseModel):
    avg_latency_ms: float
    batch_efficiency: float
    total_processed: int
    error_rate: str
    uptime: str


class LoadStats(BaseModel):
    queue_depth: int
    active_tasks: int
    max_capacity: int


class RuntimeConfig(BaseModel):
    device: str
    batch_max: int
    workers: int


class HealthResponse(BaseModel):
    status: str
    performance: PerformanceStats
    load: LoadStats
    config: RuntimeConfig
