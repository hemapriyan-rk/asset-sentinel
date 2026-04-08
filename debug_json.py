import pandas as pd
import torch
import joblib
import sys
import os
import json
import math
import numpy as np

sys.path.append(os.path.abspath(os.path.join(r"d:\IIP-2", 'code')))

from core.feature_engineering import compute_temporal_features
from core.degradation import compute_reconstruction_error, compute_feature_errors, compute_degradation_index
from core.decision import compute_thresholds, apply_decision, apply_temporal_consistency, get_top_causes

DATA_PATH = r"D:\IIP\Dataset\degradation_test_all_cases.xlsx"
MODEL_PATH = r"D:\IIP\Model\vae_model.pt"
SCALER_PATH = r"D:\IIP\Model\scaler.pkl"
FEATURES = ["rms_voltage","rms_current","real_power","energy_consumed","surface_temperature","ambient_temperature","operating_duration","duty_cycle"]

class VAE(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = torch.nn.Sequential(
            torch.nn.Linear(len(FEATURES), 32),
            torch.nn.ReLU(),
            torch.nn.Linear(32, 16),
            torch.nn.ReLU()
        )
        self.mu = torch.nn.Linear(16, 4)
        self.logvar = torch.nn.Linear(16, 4)
        self.decoder = torch.nn.Sequential(
            torch.nn.Linear(4, 16),
            torch.nn.ReLU(),
            torch.nn.Linear(16, 32),
            torch.nn.ReLU(),
            torch.nn.Linear(32, len(FEATURES))
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

df_global = pd.read_excel(DATA_PATH).sort_values(["asset_id", "timestamp"]).dropna(subset=FEATURES)
scaler = joblib.load(SCALER_PATH)
model = VAE()
model.load_state_dict(torch.load(MODEL_PATH)["model_state"])
model.eval()

asset_df = df_global[df_global["asset_id"] == "T003"].copy()
asset_df["surface_temperature"] += 0.0

X = scaler.transform(asset_df[FEATURES])
X_tensor = torch.tensor(X, dtype=torch.float32)

with torch.no_grad():
    recon, _, _ = model(X_tensor)

asset_df["recon_error"] = compute_reconstruction_error(X_tensor, recon)

feature_errors = compute_feature_errors(X_tensor, recon, FEATURES)
for col in FEATURES:
    asset_df[f"{col}_error"] = feature_errors[col]

WINDOW = max(10, len(asset_df) // 12)
asset_df = compute_temporal_features(asset_df, "recon_error", WINDOW)
asset_df = compute_degradation_index(asset_df)

baseline, warning, critical = compute_thresholds(asset_df)
def safe_float(v):
    return None if pd.isna(v) or v in [float('inf'), float('-inf')] else float(v)
baseline = safe_float(baseline)
warning = safe_float(warning)
critical = safe_float(critical)

asset_df = apply_decision(asset_df, baseline, warning, critical)
asset_df = apply_temporal_consistency(asset_df)
asset_df["top_cause"] = asset_df.apply(lambda row: get_top_causes(row, FEATURES), axis=1)

asset_df["timestamp"] = asset_df["timestamp"].astype(str)
records = json.loads(asset_df.to_json(orient="records"))
last = records[-1]

out = {
    "asset_id": "T001",
    "kpis": {
        "state": last["state_final"],
        "degradation": last["D"],
        "acceleration": last["acc"],
        "top_cause": last["top_cause"]
    },
    "thresholds": {
        "baseline": baseline,
        "warning": warning,
        "critical": critical
    },
    "timeline": records
}

print("DUMPING JSON")
try:
    print(json.dumps(out, allow_nan=False)[:200] + "...")
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
    
    # identify offender
    def find_nan(obj, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                find_nan(v, path + "." + k)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                find_nan(v, path + f"[{i}]")
        elif isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                print(f"FOUND INVALID FLOAT AT {path}: {obj}")
                
    find_nan(out, "root")
