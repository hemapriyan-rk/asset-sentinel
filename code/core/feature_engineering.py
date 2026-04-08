# code/core/feature_engineering.py

import numpy as np
import pandas as pd


def compute_temporal_features(df: pd.DataFrame, signal_col: str, window: int) -> pd.DataFrame:
    if df.empty or signal_col not in df.columns:
        return df

    df = df.copy()

    # ---------------- SMOOTH ----------------
    df["smooth"] = df[signal_col].rolling(window, min_periods=3).mean()

    # ---------------- TREND (SLOPE) ----------------
    def slope(x):
        if len(x) < 3:
            return 0
        return np.polyfit(range(len(x)), x, 1)[0]

    df["trend"] = df["smooth"].rolling(window).apply(slope, raw=True)

    # ---------------- ACCELERATION ----------------
    df["acc"] = df["smooth"].diff().rolling(3).mean()

    # ---------------- VARIANCE SHIFT ----------------
    df["var"] = df["smooth"].rolling(window).var()
    df["var_shift"] = df["var"].diff()

    return df


def compute_parameter_sensitivity(feature_error_means: dict) -> dict:
    # Group model feature errors into physical parameter buckets used by the Testing tab.
    thermal = feature_error_means.get("surface_temperature", 0.0) + feature_error_means.get("ambient_temperature", 0.0)
    electrical = (
        feature_error_means.get("rms_voltage", 0.0)
        + feature_error_means.get("rms_current", 0.0)
        + feature_error_means.get("real_power", 0.0)
    )
    utilization = (
        feature_error_means.get("duty_cycle", 0.0)
        + feature_error_means.get("operating_duration", 0.0)
        + feature_error_means.get("energy_consumed", 0.0)
    )

    total = thermal + electrical + utilization
    if total <= 1e-9:
        return {
            "thermal": 0.0,
            "electrical": 0.0,
            "utilization": 0.0,
        }

    return {
        "thermal": round((thermal / total) * 100.0, 2),
        "electrical": round((electrical / total) * 100.0, 2),
        "utilization": round((utilization / total) * 100.0, 2),
    }