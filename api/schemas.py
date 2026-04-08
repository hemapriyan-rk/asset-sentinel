from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

# ----- AUTH SCHEMAS -----
class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    role: str = "admin"

    class Config:
        from_attributes = True

class UserPublic(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    email: Optional[str] = None
    role: str = "admin"

class TokenData(BaseModel):
    username: Optional[str] = None


# ----- ASSET SCHEMAS -----
class AssetCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    asset_type: str = "LOAD"  # SOURCE | TRANSFORMER | DISTRIBUTION | LOAD

    # Location
    site: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    panel: Optional[str] = None

    # Electrical Specs
    rated_voltage: Optional[float] = None
    rated_current: Optional[float] = None
    rated_power: Optional[float] = None
    frequency: Optional[float] = None

    # Operational Limits
    current_limit: Optional[float] = None

    # Baseline Telemetry
    baseline_rms_voltage: float = 220.0
    baseline_rms_current: float = 10.0
    baseline_real_power: float = 2200.0
    baseline_energy_consumed: float = 0.0
    baseline_surface_temperature: float = 25.0
    baseline_ambient_temperature: float = 25.0
    baseline_operating_duration: float = 0.0
    baseline_duty_cycle: float = 1.0

    # Sensor & Data Config
    sampling_rate: Optional[float] = None
    data_source: Optional[str] = None
    voltage_sensor_id: Optional[str] = None
    current_sensor_id: Optional[str] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    asset_type: Optional[str] = None
    site: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    panel: Optional[str] = None
    rated_voltage: Optional[float] = None
    rated_current: Optional[float] = None
    rated_power: Optional[float] = None
    frequency: Optional[float] = None
    max_temperature: Optional[float] = None
    max_load_pct: Optional[float] = None
    voltage_tolerance: Optional[float] = None
    current_limit: Optional[float] = None
    baseline_rms_voltage: Optional[float] = None
    baseline_rms_current: Optional[float] = None
    baseline_real_power: Optional[float] = None
    baseline_energy_consumed: Optional[float] = None
    baseline_surface_temperature: Optional[float] = None
    baseline_ambient_temperature: Optional[float] = None
    baseline_operating_duration: Optional[float] = None
    baseline_duty_cycle: Optional[float] = None
    sampling_rate: Optional[float] = None
    data_source: Optional[str] = None
    voltage_sensor_id: Optional[str] = None
    current_sensor_id: Optional[str] = None


class AssetResponse(AssetCreate):
    owner_id: Optional[int] = None

    class Config:
        from_attributes = True


class AssetMeta(BaseModel):
    id: str
    name: str
    asset_type: str
    site: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    panel: Optional[str] = None

    class Config:
        from_attributes = True


# ----- CONNECTION SCHEMAS -----
class AssetConnectionCreate(BaseModel):
    parent_asset_id: str
    child_asset_id: str
    connection_type: str = "DIRECT"  # DIRECT | FEEDER | BUS | BREAKER
    feeder_id: Optional[str] = None


class AssetConnectionResponse(AssetConnectionCreate):
    id: int

    class Config:
        from_attributes = True


# ----- NETWORK SCHEMAS -----
class NetworkEdge(BaseModel):
    id: int
    parent_asset_id: str
    child_asset_id: str
    connection_type: str
    feeder_id: Optional[str] = None


class NetworkNode(BaseModel):
    id: str
    name: str
    asset_type: str
    site: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    panel: Optional[str] = None
    rated_power: Optional[float] = None
    max_load_pct: Optional[float] = None
    # Computed at query time
    current_load: Optional[float] = None
    load_pct: Optional[float] = None
    network_state: Optional[str] = None


class NetworkResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]


# ----- ANALYZE SCHEMAS -----
class AnalyzeRequest(BaseModel):
    asset_id: str
    temperature_increase: float = 0.0
    voltage_increase: float = 0.0
    duty_cycle_increase: float = 0.0


# ----- TESTING / SIMULATION SCHEMAS -----
class SimulationParameterBound(BaseModel):
    key: str
    label: str
    unit: str
    min: float
    max: float
    default: float


class SimulationAssetProfile(BaseModel):
    asset_type: str
    display_name: str
    parameters: List[SimulationParameterBound]


class SimulationProfilesResponse(BaseModel):
    profiles: List[SimulationAssetProfile]


class SimulationRequest(BaseModel):
    asset_id: str
    asset_type: str
    steps: int = Field(default=48, ge=12, le=240)
    temperature: float
    load_pct: float
    vibration: float
    oil_quality_index: Optional[float] = None
    sag: Optional[float] = None
    wind_load: Optional[float] = None
    current_load: Optional[float] = None


class DegradationPoint(BaseModel):
    timestamp: str
    di: float
    state: str


class SensitivityPoint(BaseModel):
    name: str
    contribution: float


class FailureTrajectoryPoint(BaseModel):
    hour: int
    di: float
    prob_critical: float


class ComponentRating(BaseModel):
    score: float
    label: str


class RULEstimate(BaseModel):
    hours: Optional[float] = None
    confidence: str
    reason: str


class SimulationResponse(BaseModel):
    asset_id: str
    asset_type: str
    degradation_index: float
    health_category: str
    confidence_score: float
    confidence_label: str
    recommended_action: str
    component_rating: ComponentRating
    rul: RULEstimate
    degradation_curve: List[DegradationPoint]
    parameter_sensitivity: List[SensitivityPoint]
    failure_trajectory: List[FailureTrajectoryPoint]
