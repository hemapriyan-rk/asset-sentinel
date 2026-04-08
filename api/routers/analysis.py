import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np

from api import models, schemas
from api.database import get_db
from api.config import FEATURES, SIMULATION_NOISE
from api.services.ml_service import inference_service

from core.feature_engineering import compute_temporal_features
from core.degradation import (
    compute_reconstruction_error,
    compute_feature_errors,
    compute_degradation_index
)
from core.decision import (
    compute_thresholds,
    apply_decision,
    apply_temporal_consistency,
    get_top_causes
)

router = APIRouter(prefix="/api/analyze", tags=["analysis"])


SIMULATION_PROFILES = {
    "TRANSFORMER": schemas.SimulationAssetProfile(
        asset_type="TRANSFORMER",
        display_name="Distribution Transformer",
        parameters=[
            schemas.SimulationParameterBound(key="temperature", label="Temperature", unit="°C", min=20.0, max=140.0, default=80.0),
            schemas.SimulationParameterBound(key="load_pct", label="Load", unit="%", min=0.0, max=150.0, default=75.0),
            schemas.SimulationParameterBound(key="oil_quality_index", label="Oil Quality Index", unit="0-1", min=0.0, max=1.0, default=0.86),
            schemas.SimulationParameterBound(key="vibration", label="Vibration", unit="mm/s", min=0.0, max=10.0, default=2.0),
        ],
    ),
    "MOTOR": schemas.SimulationAssetProfile(
        asset_type="MOTOR",
        display_name="Electric Motor (Induction Motor)",
        parameters=[
            schemas.SimulationParameterBound(key="temperature", label="Temperature", unit="°C", min=20.0, max=180.0, default=70.0),
            schemas.SimulationParameterBound(key="load_pct", label="Load", unit="%", min=0.0, max=160.0, default=65.0),
            schemas.SimulationParameterBound(key="vibration", label="Vibration", unit="mm/s", min=0.0, max=15.0, default=3.0),
        ],
    ),
    "DISTRIBUTION": schemas.SimulationAssetProfile(
        asset_type="DISTRIBUTION",
        display_name="Control Panel / Distribution Board",
        parameters=[
            schemas.SimulationParameterBound(key="temperature", label="Temperature", unit="°C", min=20.0, max=90.0, default=42.0),
            schemas.SimulationParameterBound(key="load_pct", label="Load", unit="%", min=0.0, max=120.0, default=60.0),
            schemas.SimulationParameterBound(key="vibration", label="Vibration", unit="mm/s", min=0.0, max=8.0, default=1.0),
        ],
    ),
    "LOAD": schemas.SimulationAssetProfile(
        asset_type="LOAD",
        display_name="Industrial Load",
        parameters=[
            schemas.SimulationParameterBound(key="temperature", label="Temperature", unit="°C", min=20.0, max=100.0, default=50.0),
            schemas.SimulationParameterBound(key="load_pct", label="Load", unit="%", min=0.0, max=120.0, default=70.0),
            schemas.SimulationParameterBound(key="vibration", label="Vibration", unit="mm/s", min=0.0, max=12.0, default=2.0),
            schemas.SimulationParameterBound(key="oil_quality_index", label="Lubrication / Quality Index", unit="0-1", min=0.0, max=1.0, default=0.9),
        ],
    ),
    "HVAC": schemas.SimulationAssetProfile(
        asset_type="HVAC",
        display_name="HVAC Equipment",
        parameters=[
            schemas.SimulationParameterBound(key="temperature", label="Temperature", unit="°C", min=20.0, max=100.0, default=45.0),
            schemas.SimulationParameterBound(key="load_pct", label="Load", unit="%", min=0.0, max=120.0, default=60.0),
            schemas.SimulationParameterBound(key="vibration", label="Vibration", unit="mm/s", min=0.0, max=12.0, default=2.0),
            schemas.SimulationParameterBound(key="oil_quality_index", label="Lubrication / Quality Index", unit="0-1", min=0.0, max=1.0, default=0.9),
        ],
    ),
    "SOURCE": schemas.SimulationAssetProfile(
        asset_type="SOURCE",
        display_name="Power Source / Grid Interface",
        parameters=[
            schemas.SimulationParameterBound(key="temperature", label="Temperature", unit="°C", min=20.0, max=120.0, default=50.0),
            schemas.SimulationParameterBound(key="load_pct", label="Load", unit="%", min=0.0, max=130.0, default=70.0),
            schemas.SimulationParameterBound(key="vibration", label="Vibration", unit="mm/s", min=0.0, max=8.0, default=1.0),
        ],
    ),
}


def _profile_for(asset_type: str) -> schemas.SimulationAssetProfile:
    return SIMULATION_PROFILES.get(asset_type, SIMULATION_PROFILES["DISTRIBUTION"])


def _param_value(req: schemas.SimulationRequest, key: str) -> float:
    return float(getattr(req, key, None) if getattr(req, key, None) is not None else 0.0)


def _validate_parameters(profile: schemas.SimulationAssetProfile, req: schemas.SimulationRequest) -> dict:
    values = {}
    for param in profile.parameters:
        value = getattr(req, param.key, None)
        if value is None:
            value = param.default
        if value < param.min or value > param.max:
            raise HTTPException(
                status_code=400,
                detail=f"{param.label} out of range for {profile.asset_type}: {value} not in [{param.min}, {param.max}]"
            )
        values[param.key] = float(value)
    return values


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _asset_baselines(asset: models.Asset) -> dict:
    return {
        "voltage": float(asset.baseline_rms_voltage or asset.rated_voltage or 415.0),
        "current": float(asset.baseline_rms_current or asset.rated_current or 50.0),
        "power": float(asset.baseline_real_power or (asset.rated_power or 10000.0)),
        "surface_temp": float(asset.baseline_surface_temperature or 35.0),
        "ambient_temp": float(asset.baseline_ambient_temperature or 30.0),
        "duty_cycle": float(asset.baseline_duty_cycle or 0.75),
        "energy": float(asset.baseline_energy_consumed or 0.0),
        "duration": float(asset.baseline_operating_duration or 0.0),
    }


def _stress_coefficients(asset_type: str) -> dict:
    return {
        "TRANSFORMER": {"temperature": 0.38, "load": 0.34, "quality": 0.18, "vibration": 0.16, "voltage_drop": 0.004, "current_rise": 0.52, "power_rise": 0.24, "temp_rise": 0.62, "ambient_rise": 0.16, "duty_rise": 0.14},
        "MOTOR": {"temperature": 0.33, "load": 0.40, "quality": 0.06, "vibration": 0.28, "voltage_drop": 0.002, "current_rise": 0.72, "power_rise": 0.31, "temp_rise": 0.78, "ambient_rise": 0.12, "duty_rise": 0.18},
        "DISTRIBUTION": {"temperature": 0.30, "load": 0.42, "quality": 0.10, "vibration": 0.18, "voltage_drop": 0.003, "current_rise": 0.48, "power_rise": 0.21, "temp_rise": 0.54, "ambient_rise": 0.10, "duty_rise": 0.16},
        "LOAD": {"temperature": 0.28, "load": 0.44, "quality": 0.14, "vibration": 0.22, "voltage_drop": 0.0025, "current_rise": 0.58, "power_rise": 0.26, "temp_rise": 0.60, "ambient_rise": 0.11, "duty_rise": 0.20},
        "HVAC": {"temperature": 0.30, "load": 0.36, "quality": 0.12, "vibration": 0.22, "voltage_drop": 0.002, "current_rise": 0.50, "power_rise": 0.22, "temp_rise": 0.58, "ambient_rise": 0.13, "duty_rise": 0.17},
        "SOURCE": {"temperature": 0.24, "load": 0.46, "quality": 0.08, "vibration": 0.16, "voltage_drop": 0.0015, "current_rise": 0.38, "power_rise": 0.18, "temp_rise": 0.42, "ambient_rise": 0.08, "duty_rise": 0.12},
    }.get(asset_type, {"temperature": 0.30, "load": 0.38, "quality": 0.10, "vibration": 0.20, "voltage_drop": 0.003, "current_rise": 0.55, "power_rise": 0.22, "temp_rise": 0.55, "ambient_rise": 0.12, "duty_rise": 0.15})


def _simulate_asset_dataframe(asset: models.Asset, req: schemas.SimulationRequest, profile: schemas.SimulationAssetProfile, values: dict) -> pd.DataFrame:
    coeffs = _stress_coefficients(asset.asset_type or req.asset_type)
    base = _asset_baselines(asset)
    steps = int(req.steps)
    step_hours = 24.0 / max(steps - 1, 1)
    start_time = pd.Timestamp.now() - pd.Timedelta(hours=24)

    temp_span = max(profile.parameters[0].max - profile.parameters[0].min, 1.0) if any(p.key == "temperature" for p in profile.parameters) else 100.0
    load_span = next((p.max - p.min for p in profile.parameters if p.key in {"load_pct", "current_load"}), 100.0)
    vib_span = next((p.max - p.min for p in profile.parameters if p.key == "vibration"), 10.0)

    rows = []
    for i in range(steps):
        progress = i / max(steps - 1, 1)
        blend = progress ** 1.25

        temperature = values.get("temperature", base["surface_temp"])
        load_pct = values.get("load_pct", values.get("current_load", 0.0))
        vibration = values.get("vibration", 0.0)
        oil_quality_index = values.get("oil_quality_index", 0.9)

        temp_norm = _clamp((temperature - profile.parameters[0].min) / temp_span, 0.0, 1.0)
        load_norm = _clamp(load_pct / max(load_span, 1.0), 0.0, 1.5)
        vib_norm = _clamp(vibration / max(vib_span, 1.0), 0.0, 1.5)
        quality_norm = _clamp(oil_quality_index, 0.0, 1.0)
        quality_stress = 1.0 - quality_norm

        stress = (
            coeffs["temperature"] * (temp_norm ** 1.35)
            + coeffs["load"] * (load_norm ** 1.28)
            + coeffs["vibration"] * (vib_norm ** 1.2)
            + coeffs["quality"] * (quality_stress ** 1.4)
            + 0.16 * temp_norm * load_norm
            + 0.09 * load_norm * vib_norm
        )
        stress = _clamp(stress * blend, 0.0, 1.5)

        voltage = base["voltage"] * (1 - coeffs["voltage_drop"] * stress)
        current = base["current"] * (1 + coeffs["current_rise"] * stress)
        power = base["power"] * (1 + coeffs["power_rise"] * stress)
        surface_temperature = base["surface_temp"] + coeffs["temp_rise"] * stress * 35.0 + max(0.0, temperature - base["surface_temp"]) * 0.55
        ambient_temperature = base["ambient_temp"] + coeffs["ambient_rise"] * stress * 12.0
        duty_cycle = _clamp(base["duty_cycle"] + coeffs["duty_rise"] * stress, 0.0, 1.5)
        operating_duration = base["duration"] + i * step_hours
        energy_consumed = base["energy"] + (power * step_hours / 1000.0)

        rows.append({
            "asset_id": asset.id,
            "timestamp": start_time + pd.Timedelta(hours=i * step_hours),
            "rms_voltage": voltage,
            "rms_current": current,
            "real_power": power,
            "energy_consumed": energy_consumed,
            "surface_temperature": surface_temperature,
            "ambient_temperature": ambient_temperature,
            "operating_duration": operating_duration,
            "duty_cycle": duty_cycle,
            "stress_index": stress,
        })

    return pd.DataFrame(rows)


def _health_label(di: float) -> str:
    if di < 0.4:
        return "Healthy"
    if di < 0.7:
        return "Warning"
    return "Critical"


def _recommended_action(asset_type: str, health: str) -> str:
    if health == "Healthy":
        return "Continue monitoring"
    if asset_type == "TRANSFORMER":
        return "Inspect cooling system and oil condition"
    if asset_type == "MOTOR":
        return "Check bearings, overload, and alignment"
    if asset_type == "DISTRIBUTION":
        return "Inspect contact heating and tighten terminations"
    if asset_type == "LOAD":
        return "Check process load and mechanical wear"
    if asset_type == "HVAC":
        return "Verify airflow, filters, and drive health"
    return "Schedule maintenance inspection"


def _parameter_contributions(profile: schemas.SimulationAssetProfile, values: dict, coeffs: dict) -> list:
    contributions = []
    total = 0.0
    for param in profile.parameters:
        raw_value = float(values.get(param.key, param.default))
        if param.key == "oil_quality_index":
            # Lower quality means higher stress contribution.
            normalized = _clamp((param.max - raw_value) / max(param.max - param.min, 1e-6), 0.0, 1.0)
            weight = coeffs.get("quality", 0.1)
        elif param.key in {"load_pct", "current_load", "wind_load"}:
            normalized = _clamp((raw_value - param.min) / max(param.max - param.min, 1e-6), 0.0, 1.2)
            weight = coeffs.get("load", 0.3)
        elif param.key == "temperature":
            normalized = _clamp((raw_value - param.min) / max(param.max - param.min, 1e-6), 0.0, 1.2)
            weight = coeffs.get("temperature", 0.3)
        elif param.key in {"vibration", "sag"}:
            normalized = _clamp((raw_value - param.min) / max(param.max - param.min, 1e-6), 0.0, 1.2)
            weight = coeffs.get("vibration", 0.2)
        else:
            normalized = _clamp((raw_value - param.min) / max(param.max - param.min, 1e-6), 0.0, 1.2)
            weight = 0.12

        score = normalized * max(weight, 1e-4)
        total += score
        contributions.append({"name": param.label.replace(" Index", ""), "score": score})

    total = total or 1.0
    return [{"name": c["name"], "contribution": float((c["score"] / total) * 100.0)} for c in contributions]


@router.get("/simulation-profiles")
def get_simulation_profiles():
    return {"profiles": list(SIMULATION_PROFILES.values())}


@router.post("/simulate")
def simulate_asset(req: schemas.SimulationRequest, db: Session = Depends(get_db)):
    db_asset = db.query(models.Asset).filter(models.Asset.id == req.asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    effective_type = (db_asset.asset_type or req.asset_type or "DISTRIBUTION").upper()
    if req.asset_type and req.asset_type.upper() != effective_type:
        raise HTTPException(status_code=400, detail=f"Asset type mismatch. Expected {effective_type} for asset {db_asset.id}.")

    profile = _profile_for(effective_type)
    values = _validate_parameters(profile, req)
    coeffs = _stress_coefficients(effective_type)

    asset_df = _simulate_asset_dataframe(db_asset, req, profile, values)
    if asset_df.empty:
        raise HTTPException(status_code=404, detail="Unable to generate simulation data.")

    X_tensor, recon = inference_service.transform_and_predict(asset_df, deterministic=True)

    asset_df["recon_error"] = compute_reconstruction_error(X_tensor, recon)
    feature_errors = compute_feature_errors(X_tensor, recon, FEATURES)
    for col in FEATURES:
        asset_df[f"{col}_error"] = feature_errors[col]

    window = max(5, len(asset_df) // 10)
    asset_df = compute_temporal_features(asset_df, "recon_error", window)

    if db_asset.mu_baseline is None or db_asset.sigma_baseline is None:
        mu = float(asset_df["recon_error"].median())
        sigma = float(asset_df["recon_error"].std(ddof=0))
        if sigma < 1e-6:
            sigma = 0.5
    else:
        mu = float(db_asset.mu_baseline)
        sigma = float(db_asset.sigma_baseline)

    asset_df = compute_degradation_index(asset_df, mu, sigma)
    baseline, warning, critical = compute_thresholds(asset_df)

    def safe_float(v, default=0.0):
        if v is None or pd.isna(v) or v in [float("inf"), float("-inf")]:
            return default
        return float(v)

    baseline = safe_float(baseline)
    warning = safe_float(warning)
    critical = safe_float(critical)

    # Convert model DI into a bounded 0-1 score and blend with rule-based stress for realistic monotonic behavior.
    asset_df["model_di_normalized"] = asset_df["DI_standardized"].apply(lambda v: _clamp(float(v) / max(abs(critical), 1.0), 0.0, 1.2))
    asset_df["di_normalized"] = (0.6 * asset_df["model_di_normalized"] + 0.4 * asset_df["stress_index"]).apply(lambda v: _clamp(float(v), 0.0, 1.2))
    asset_df["state_final"] = asset_df["di_normalized"].apply(_health_label)

    asset_df = apply_decision(asset_df, baseline, warning, critical)
    asset_df = apply_temporal_consistency(asset_df)

    # Backfill state labels with the normalized diagnostic state to keep UI and logic aligned.
    asset_df["state_final"] = asset_df["di_normalized"].apply(_health_label)

    asset_df["top_cause"] = asset_df.apply(lambda row: get_top_causes(row, FEATURES), axis=1)
    records = asset_df.drop(columns=["timestamp"]).to_dict(orient="records")
    ts_list = asset_df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S").tolist()
    for i, rec in enumerate(records):
        rec["timestamp"] = ts_list[i]

    last = asset_df.iloc[-1]
    normalized_di = safe_float(last.get("di_normalized", 0.0))
    health = _health_label(normalized_di)
    tail_std = float(asset_df["di_normalized"].tail(8).std(ddof=0) or 0.0)
    tail_slope = float(asset_df["di_normalized"].tail(8).diff().mean() or 0.0)
    confidence_score = _clamp(0.94 - tail_std * 1.1 - abs(tail_slope) * 0.8, 0.35, 0.96)
    confidence_label = "HIGH" if confidence_score >= 0.8 else "MEDIUM" if confidence_score >= 0.6 else "LOW"

    # Rule-based forward projection from current normalized DI trajectory.
    tail = asset_df["di_normalized"].tail(min(8, len(asset_df)))
    xs = np.arange(len(tail), dtype=float)
    ys = tail.to_numpy(dtype=float)
    if len(xs) > 1 and np.var(xs) > 0:
        slope = float(np.polyfit(xs, ys, 1)[0])
    else:
        slope = 0.0
    future_points = []
    future_hours = []
    crossing_hours = None
    for idx in range(1, 13):
        future_di = _clamp(normalized_di + slope * idx, 0.0, 1.2)
        prob_critical = _clamp((future_di - 0.7) / 0.5, 0.0, 1.0)
        future_points.append({"hour": idx, "di": future_di, "prob_critical": prob_critical})
        future_hours.append(idx)
        if crossing_hours is None and future_di >= 0.7:
            crossing_hours = idx * (24.0 / max(req.steps - 1, 1))

    if crossing_hours is None:
        # No crossing in projection horizon: provide bounded long RUL estimate.
        crossing_hours = _clamp((1.1 - normalized_di) * 220.0, 24.0, 720.0)

    rul_confidence = "HIGH" if confidence_score >= 0.8 else "MEDIUM" if confidence_score >= 0.6 else "LOW"
    rul_reason = "Projected from the current diagnostic slope and normalized model error trajectory."

    output = {
        "asset_id": db_asset.id,
        "asset_type": effective_type,
        "degradation_index": normalized_di,
        "health_category": health,
        "confidence_score": confidence_score,
        "confidence_label": confidence_label,
        "recommended_action": _recommended_action(effective_type, health),
        "component_rating": {
            "score": round(normalized_di * 100.0, 1),
            "label": health,
        },
        "rul": {
            "hours": crossing_hours,
            "confidence": rul_confidence,
            "reason": rul_reason,
        },
        "degradation_curve": [
            {
                "timestamp": row["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if hasattr(row["timestamp"], "strftime") else str(row["timestamp"]),
                "di": safe_float(row["di_normalized"]),
                "state": row["state_final"],
            }
            for _, row in asset_df.iterrows()
        ],
        "parameter_sensitivity": _parameter_contributions(profile, values, coeffs),
        "failure_trajectory": future_points,
        "timeline": records,
        "thresholds": {
            "baseline": baseline,
            "warning": warning,
            "critical": critical,
            "mu_baseline": mu,
            "sigma_baseline": sigma,
            "baseline_autotuned": db_asset.mu_baseline is None or db_asset.sigma_baseline is None,
        },
    }

    try:
        json_str = json.dumps(output, allow_nan=False)
    except ValueError:
        json_str = json.dumps(output, allow_nan=True).replace("NaN", "null").replace("Infinity", "null").replace("-Infinity", "null")

    return Response(content=json_str, media_type="application/json")

@router.post("")
def analyze_asset(req: schemas.AnalyzeRequest, db: Session = Depends(get_db)):
    db_asset = db.query(models.Asset).filter(models.Asset.id == req.asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    # Fetch telemetry from DB
    telemetry_records = db.query(models.AssetTelemetry).filter(
        models.AssetTelemetry.asset_id == req.asset_id
    ).order_by(models.AssetTelemetry.timestamp).all()

    if telemetry_records:
        data = []
        for r in telemetry_records:
            data.append({
                "asset_id": r.asset_id,
                "timestamp": pd.to_datetime(r.timestamp),
                "rms_voltage": r.rms_voltage,
                "rms_current": r.rms_current,
                "real_power": r.real_power,
                "energy_consumed": r.energy_consumed,
                "surface_temperature": r.surface_temperature,
                "ambient_temperature": r.ambient_temperature,
                "operating_duration": r.operating_duration,
                "duty_cycle": r.duty_cycle
            })
        asset_df = pd.DataFrame(data)
    else:
        # Fallback: Generate simulation data if no real telemetry exists
        steps = 50
        data = []
        base_time = pd.Timestamp.now() - pd.Timedelta(hours=steps)
        
        for i in range(steps):
            ramp = (i / (steps - 1)) if steps > 1 else 1.0
            temp_eff = req.temperature_increase * ramp
            volt_eff = req.voltage_increase * ramp
            duty_eff = req.duty_cycle_increase * ramp
            
            noise = np.random.normal(0, SIMULATION_NOISE)
            
            data.append({
                "asset_id": db_asset.id,
                "timestamp": base_time + pd.Timedelta(hours=i),
                "rms_voltage": db_asset.baseline_rms_voltage * (1 + noise) + volt_eff,
                "rms_current": db_asset.baseline_rms_current * (1 + noise) + (duty_eff * 0.5),
                "real_power": db_asset.baseline_real_power * (1 + noise) + (duty_eff * 10),
                "energy_consumed": db_asset.baseline_energy_consumed + i,
                "surface_temperature": db_asset.baseline_surface_temperature * (1 + noise) + temp_eff,
                "ambient_temperature": db_asset.baseline_ambient_temperature * (1 + noise),
                "operating_duration": db_asset.baseline_operating_duration + i,
                "duty_cycle": db_asset.baseline_duty_cycle + duty_eff
            })
        asset_df = pd.DataFrame(data)

    if not asset_df.empty:
        window_size = min(10, len(asset_df))
        asset_df.loc[asset_df.index[-window_size:], "surface_temperature"] += req.temperature_increase
        asset_df.loc[asset_df.index[-window_size:], "rms_voltage"] += req.voltage_increase
        asset_df.loc[asset_df.index[-window_size:], "duty_cycle"] += req.duty_cycle_increase

    if asset_df.empty:
        raise HTTPException(status_code=404, detail="Asset data not found.")

    # Perform Machine Learning Inference
    X_tensor, recon = inference_service.transform_and_predict(asset_df)

    # Calculate errors
    asset_df["recon_error"] = compute_reconstruction_error(X_tensor, recon)
    feature_errors = compute_feature_errors(X_tensor, recon, FEATURES)
    for col in FEATURES:
        asset_df[f"{col}_error"] = feature_errors[col]

    WINDOW = max(5, len(asset_df) // 10)
    asset_df = compute_temporal_features(asset_df, "recon_error", WINDOW)
    
    # If baselines are missing, derive deterministic fallback baselines from current signal
    baseline_autotuned = db_asset.mu_baseline is None or db_asset.sigma_baseline is None
    if baseline_autotuned:
        mu = float(asset_df["recon_error"].median())
        sigma = float(asset_df["recon_error"].std(ddof=0))
        if sigma < 1e-6:
            sigma = 0.5
    else:
        mu = float(db_asset.mu_baseline)
        sigma = float(db_asset.sigma_baseline)

    asset_df = compute_degradation_index(asset_df, mu, sigma)
    baseline, warning, critical = compute_thresholds(asset_df)

    def safe_float(v, default=0.0):
        if v is None or pd.isna(v) or v in [float('inf'), float('-inf')]:
            return default
        return float(v)

    baseline = safe_float(baseline)
    warning = safe_float(warning)
    critical = safe_float(critical)

    asset_df = apply_decision(asset_df, baseline, warning, critical)
    asset_df = apply_temporal_consistency(asset_df)
    asset_df["top_cause"] = asset_df.apply(lambda row: get_top_causes(row, FEATURES), axis=1)
    
    records = asset_df.drop(columns=["timestamp"]).to_dict(orient="records")
    ts_list = asset_df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S").tolist()
    for i, rec in enumerate(records):
        rec["timestamp"] = ts_list[i]
    
    last = records[-1]

    out = {
        "asset_id": req.asset_id,
        "kpis": {
            "state": last.get("state_final", "UNKNOWN"),
            "degradation": safe_float(last.get("DI_standardized")),
            "acceleration": safe_float(last.get("acc")),
            "top_cause": last.get("top_cause", "None"),
            "trend": last.get("trend_label", "Stable"),
            "confidence": last.get("confidence", "LOW")
        },
        "thresholds": {
            "baseline": baseline,
            "warning": warning,
            "critical": critical,
            "mu_baseline": mu,
            "sigma_baseline": sigma,
            "smoothing_window": 10,
            "baseline_autotuned": baseline_autotuned
        },
        "timeline": records
    }

    try:
        json_str = json.dumps(out, allow_nan=False)
    except ValueError:
        json_str = json.dumps(out, allow_nan=True).replace("NaN", "null").replace("Infinity", "null").replace("-Infinity", "null")

    return Response(content=json_str, media_type="application/json")
