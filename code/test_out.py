import pandas as pd
import torch
import torch.nn as nn
import joblib
import numpy as np
import matplotlib.pyplot as plt

# ================= IMPORT CORE =================
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
from core.visualization import plot_asset_analysis

# ================= CONFIG =================
DATA_PATH = r"D:\IIP\Dataset\degradation_test_all_cases.xlsx"
MODEL_PATH = r"D:\IIP\Model\vae_model.pt"
SCALER_PATH = r"D:\IIP\Model\scaler.pkl"
OUTPUT_EXCEL = r"D:\IIP\Output\asset_wise_actions_v2.xlsx"

FEATURES = [
    "rms_voltage",
    "rms_current",
    "real_power",
    "energy_consumed",
    "surface_temperature",
    "ambient_temperature",
    "operating_duration",
    "duty_cycle"
]

# ================= LOAD DATA =================
df = pd.read_excel(DATA_PATH)
df = df.sort_values(["asset_id", "timestamp"])
df = df.dropna(subset=FEATURES).copy()

# ================= LOAD SCALER =================
scaler = joblib.load(SCALER_PATH)
X = scaler.transform(df[FEATURES])
X = torch.tensor(X, dtype=torch.float32)

# ================= MODEL =================
class VAE(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(len(FEATURES), 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU()
        )
        self.mu = nn.Linear(16, 4)
        self.logvar = nn.Linear(16, 4)
        self.decoder = nn.Sequential(
            nn.Linear(4, 16),
            nn.ReLU(),
            nn.Linear(16, 32),
            nn.ReLU(),
            nn.Linear(32, len(FEATURES))
        )

    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def forward(self, x):
        h = self.encoder(x)
        mu, logvar = self.mu(h), self.logvar(h)
        z = self.reparameterize(mu, logvar)
        return self.decoder(z), mu, logvar

model = VAE()
model.load_state_dict(torch.load(MODEL_PATH)["model_state"])
model.eval()

# ================= INFERENCE =================
with torch.no_grad():
    recon, mu, logvar = model(X)

# ================= CORE SIGNAL =================
df["recon_error"] = compute_reconstruction_error(X, recon)

# ================= FEATURE ERRORS =================
feature_errors = compute_feature_errors(X, recon, FEATURES)

for col in FEATURES:
    df[f"{col}_error"] = feature_errors[col]

# ================= PER-ASSET PIPELINE =================
action_summary = []

for asset_id, asset_df in df.groupby("asset_id"):

    asset_df = asset_df.copy()

    if len(asset_df) < 30:
        continue

    # ---------------- TEMPORAL FEATURES ----------------
    WINDOW = max(10, len(asset_df) // 12)

    asset_df = compute_temporal_features(
        asset_df,
        signal_col="recon_error",
        window=WINDOW
    )

    # ---------------- DEGRADATION INDEX ----------------
    asset_df = compute_degradation_index(asset_df)

    # ---------------- THRESHOLDS ----------------
    baseline, warning, critical = compute_thresholds(asset_df)

    # ---------------- DECISION ----------------
    asset_df = apply_decision(asset_df, baseline, warning, critical)

    # ---------------- STABILITY ----------------
    asset_df = apply_temporal_consistency(asset_df)

    # ---------------- EXPLANATION ----------------
    asset_df["top_cause"] = asset_df.apply(
        lambda row: get_top_causes(row, FEATURES), axis=1
    )

    # ================= VISUALIZATION =================
    plot_asset_analysis(
    asset_df,
    asset_id,
    baseline,
    warning,
    critical
)
    # ================= FINAL ACTION =================
    last = asset_df.iloc[-1]

    action_summary.append({
        "asset_id": asset_id,
        "last_timestamp": last["timestamp"],
        "state": last["state_final"],
        "degradation_score": round(last["D"], 5),
        "top_cause": last["top_cause"],
        "recommendation": (
            "Immediate inspection required"
            if last["state_final"] == "URGENT"
            else "Monitor closely"
        )
    })

# ================= EXPORT =================
summary_df = pd.DataFrame(action_summary)
summary_df.to_excel(OUTPUT_EXCEL, index=False)

print("✅ Updated results saved:", OUTPUT_EXCEL)