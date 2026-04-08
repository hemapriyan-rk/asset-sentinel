from typing import Tuple, List, Any
import numpy as np
import pandas as pd


def compute_thresholds(df: pd.DataFrame) -> Tuple[float, float, float]:
    # Z-score thresholds
    baseline = 0.0
    warning = 2.0
    critical = 3.0

    return baseline, warning, critical

def apply_decision(df: pd.DataFrame, baseline: float, warning: float, critical: float) -> pd.DataFrame:
    if df.empty:
        return df


    def decide(row):
        # 2.0 <= DI < 3.0 -> WARNING
        # >= 3.0 -> CRITICAL
        # < 2.0 -> NORMAL
        di = row.get("DI_standardized", 0)
        
        if di >= critical:
            return "CRITICAL"
        elif di >= warning:
            return "WARNING"
        else:
            return "NORMAL"

    df["state"] = df.apply(decide, axis=1)

    return df


def apply_temporal_consistency(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    if df.empty or "state" not in df.columns:
        return df

    df["state_final"] = df["state"]

    for i in range(window, len(df)):
        recent = df["state"].iloc[i-window:i]

        if (recent == "CRITICAL").sum() >= 3:
            df.iloc[i, df.columns.get_loc("state_final")] = "CRITICAL"

    return df


def get_top_causes(row: pd.Series, feature_cols: List[str]) -> str:
    
    # Anomaly attribution prevention: only show if DI > 0.3 OR Acceleration > 0
    if row.get("D", 0) <= 0.3 and row.get("acc", 0) <= 0.0:
        return "No significant anomaly drivers"

    errors = {col: row[f"{col}_error"] for col in feature_cols}
    top = sorted(errors.items(), key=lambda x: x[1], reverse=True)[:2]

    return ", ".join([t[0] for t in top])