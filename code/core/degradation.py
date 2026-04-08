from typing import Dict, List, Any
import numpy as np
import torch
import pandas as pd


def compute_reconstruction_error(X: torch.Tensor, recon: torch.Tensor) -> np.ndarray:
    return torch.mean((X - recon) ** 2, dim=1).numpy()


def compute_feature_errors(X: torch.Tensor, recon: torch.Tensor, feature_names: List[str]) -> Dict[str, np.ndarray]:
    feature_error = (X - recon) ** 2
    feature_error = feature_error.numpy()

    feature_dict: Dict[str, np.ndarray] = {}
    for i, col in enumerate(feature_names):
        feature_dict[col] = feature_error[:, i]

    return feature_dict


def compute_degradation_index(df: pd.DataFrame, mu_baseline: float, sigma_baseline: float) -> pd.DataFrame:
    if df.empty:
        return df

    df = df.copy()

    # Raw signal represents the pure reconstruction error (unfiltered)
    df["raw_signal"] = df["recon_error"]

    # 1. Standardize (Z-score) the DI
    # Avoid division by zero if sigma_baseline is exactly 0
    sigma = sigma_baseline if sigma_baseline > 1e-6 else 1.0
    df["DI_standardized"] = (df["raw_signal"] - mu_baseline) / sigma

    # Set the primary D metric to standardized DI. 
    # Optional logic: clamp lower bound to 0 if needed, but z-score can be negative.
    df["D_raw"] = df["DI_standardized"]

    # 2. Smoothed Degradation Index (Fixed window-based)
    window_size = 10
    df["D"] = df["D_raw"].rolling(window=window_size, min_periods=1).mean()

    # 3. Mathematical Acceleration: d(DI_smoothed)/dt 
    # Use actual time difference in hours for dt, rather than just index diff
    if "timestamp" in df.columns and hasattr(df["timestamp"], "dt"):
        # Ensure it is datetime
        if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
             df["timestamp"] = pd.to_datetime(df["timestamp"], errors='coerce')
        
        diffs = df["timestamp"].diff().dt.total_seconds() / 3600.0
        dt_hours = diffs.replace(0, 1.0).fillna(1.0)
    else:
        dt_hours = 1.0

    df["acc_raw"] = df["D"].diff() / dt_hours
    df["acc_raw"] = df["acc_raw"].fillna(0)
    
    # Smooth acceleration lightly
    df["acc"] = df["acc_raw"].rolling(window=3, min_periods=1).mean()
    # Ignore absolute noise < 0.01 (was 0.05)
    df["acc"] = df["acc"].apply(lambda x: 0.0 if abs(x) < 0.01 else x)

    # Trend Interpretation based on Acceleration
    def interpret_trend(a):
        if a > 0.01: return "Degradation Increasing"
        elif a < -0.01: return "System Recovering"
        return "Stable"
    
    df["trend_label"] = df["acc"].apply(interpret_trend)
    
    # Confidence Indicator based on signal variance in standardized space
    variance = df["DI_standardized"].rolling(window=window_size, min_periods=1).var().fillna(0)
    df["confidence"] = variance.apply(lambda v: "HIGH" if v < 1.0 else ("MEDIUM" if v < 3.0 else "LOW"))

    return df


def compute_failure_trajectory(current_di: float, acceleration: float, steps: int = 24, critical_threshold: float = 3.0):
    trajectory = []
    di = float(current_di)
    acc = float(acceleration)
    for hour in range(1, steps + 1):
        # Model-driven linear projection using current DI slope from inference timeline.
        di = di + acc
        critical_distance = max(critical_threshold - di, 0.0)
        prob_critical = 1.0 if di >= critical_threshold else min(1.0, max(0.0, 1.0 - (critical_distance / critical_threshold)))
        trajectory.append(
            {
                "hour": hour,
                "di": round(di, 4),
                "prob_critical": round(prob_critical, 4),
            }
        )
    return trajectory


def estimate_rul_hours(current_di: float, acceleration: float, critical_threshold: float = 3.0):
    if acceleration <= 1e-6:
        return {
            "hours": None,
            "confidence": "LOW",
            "reason": "No positive degradation acceleration detected",
        }

    remaining = max(critical_threshold - float(current_di), 0.0)
    hours = remaining / float(acceleration)
    confidence = "HIGH" if hours <= 24 else ("MEDIUM" if hours <= 72 else "LOW")
    return {
        "hours": round(hours, 2),
        "confidence": confidence,
        "reason": "Projected from current degradation acceleration",
    }