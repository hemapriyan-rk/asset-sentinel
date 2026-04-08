from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="admin")  # "admin" | "superadmin"

    assets = relationship("Asset", back_populates="owner", foreign_keys="Asset.owner_id")
    audit_logs = relationship("AuditLog", back_populates="user")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, index=True)  # E.g., 'MTR-001'
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    asset_type = Column(String, default="LOAD")  # SOURCE | TRANSFORMER | DISTRIBUTION | LOAD
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Physical Location
    site = Column(String, nullable=True)
    building = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    zone = Column(String, nullable=True)
    panel = Column(String, nullable=True)

    # Electrical Specifications
    rated_voltage = Column(Float, nullable=True)
    rated_current = Column(Float, nullable=True)
    rated_power = Column(Float, nullable=True)
    frequency = Column(Float, nullable=True)

    # Operational Limits
    max_temperature = Column(Float, nullable=True)
    max_load_pct = Column(Float, default=100.0)
    voltage_tolerance = Column(Float, nullable=True)
    current_limit = Column(Float, nullable=True)

    # Baseline Telemetry Parameters
    baseline_rms_voltage = Column(Float, default=220.0)
    baseline_rms_current = Column(Float, default=10.0)
    baseline_real_power = Column(Float, default=2200.0)
    baseline_energy_consumed = Column(Float, default=0.0)
    baseline_surface_temperature = Column(Float, default=25.0)
    baseline_ambient_temperature = Column(Float, default=25.0)
    baseline_operating_duration = Column(Float, default=0.0)
    baseline_duty_cycle = Column(Float, default=1.0)
    
    # DI Statistical Baselines (Must be computed during initialization)
    mu_baseline = Column(Float, nullable=True)
    sigma_baseline = Column(Float, nullable=True)

    # Sensor & Data Configuration
    sampling_rate = Column(Float, nullable=True)
    data_source = Column(String, nullable=True)  # IoTGateway | SCADA | API
    voltage_sensor_id = Column(String, nullable=True)
    current_sensor_id = Column(String, nullable=True)

    owner = relationship("User", back_populates="assets", foreign_keys=[owner_id])

    # Connections where this asset is the child (upstream connections)
    upstream_connections = relationship(
        "AssetConnection",
        foreign_keys="AssetConnection.child_asset_id",
        back_populates="child_asset",
        cascade="all, delete-orphan"
    )
    # Connections where this asset is the parent (downstream connections)
    downstream_connections = relationship(
        "AssetConnection",
        foreign_keys="AssetConnection.parent_asset_id",
        back_populates="parent_asset",
        cascade="all, delete-orphan"
    )

    telemetry_records = relationship("AssetTelemetry", back_populates="asset", cascade="all, delete-orphan")


class AssetConnection(Base):
    __tablename__ = "asset_connections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_asset_id = Column(String, ForeignKey("assets.id"), nullable=False)
    child_asset_id = Column(String, ForeignKey("assets.id"), nullable=False)
    connection_type = Column(String, default="DIRECT")  # DIRECT | FEEDER | BUS | BREAKER
    feeder_id = Column(String, nullable=True)

    parent_asset = relationship("Asset", foreign_keys=[parent_asset_id], back_populates="downstream_connections")
    child_asset = relationship("Asset", foreign_keys=[child_asset_id], back_populates="upstream_connections")

    __table_args__ = (
        UniqueConstraint("parent_asset_id", "child_asset_id", name="uq_connection"),
    )


class AssetTelemetry(Base):
    __tablename__ = "asset_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(String, nullable=False, index=True)  # Stored as string for ISO format consistency
    
    rms_voltage = Column(Float)
    rms_current = Column(Float)
    real_power = Column(Float)
    energy_consumed = Column(Float)
    surface_temperature = Column(Float)
    ambient_temperature = Column(Float)
    operating_duration = Column(Float)
    duty_cycle = Column(Float)

    asset = relationship("Asset", back_populates="telemetry_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)

    user = relationship("User", back_populates="audit_logs")
