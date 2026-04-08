import streamlit as st
import pandas as pd
import torch
import joblib
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'code')))

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

FEATURES = [
    "rms_voltage","rms_current","real_power","energy_consumed",
    "surface_temperature","ambient_temperature",
    "operating_duration","duty_cycle"
]

# ================= LOAD =================
@st.cache_data
def load_data():
    df = pd.read_excel(DATA_PATH)
    df = df.sort_values(["asset_id", "timestamp"])
    return df.dropna(subset=FEATURES)

@st.cache_resource
def load_model():
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

    model = VAE()
    model.load_state_dict(torch.load(MODEL_PATH)["model_state"])
    model.eval()
    return model

# ================= INIT =================
st.title("⚡ Asset Degradation Intelligence System")

df = load_data()
model = load_model()
scaler = joblib.load(SCALER_PATH)

# ================= SIDEBAR =================
st.sidebar.header("Controls")

asset = st.sidebar.selectbox("Select Asset", df["asset_id"].unique())

# 🔥 SIMULATION
temp_increase = st.sidebar.slider("Temperature Increase", 0, 20, 0)

# ================= FILTER =================
asset_df = df[df["asset_id"] == asset].copy()

# Apply simulation
asset_df["surface_temperature"] += temp_increase

# ================= INFERENCE =================
X = scaler.transform(asset_df[FEATURES])
X = torch.tensor(X, dtype=torch.float32)

with torch.no_grad():
    recon, _, _ = model(X)

asset_df["recon_error"] = compute_reconstruction_error(X, recon)

# Feature errors
feature_errors = compute_feature_errors(X, recon, FEATURES)
for col in FEATURES:
    asset_df[f"{col}_error"] = feature_errors[col]

# ================= PIPELINE =================
WINDOW = max(10, len(asset_df)//12)

asset_df = compute_temporal_features(asset_df, "recon_error", WINDOW)
asset_df = compute_degradation_index(asset_df)

baseline, warning, critical = compute_thresholds(asset_df)
asset_df = apply_decision(asset_df, baseline, warning, critical)
asset_df = apply_temporal_consistency(asset_df)

asset_df["top_cause"] = asset_df.apply(
    lambda row: get_top_causes(row, FEATURES), axis=1
)

# ================= CURRENT STATUS =================
last = asset_df.iloc[-1]

st.subheader(f"Asset: {asset}")

col1, col2, col3 = st.columns(3)

col1.metric("State", last["state_final"])
col2.metric("Degradation", round(last["D"], 4))
col3.metric("Acceleration", round(last["acc"], 4))

# ================= CAUSE =================
st.subheader("Top Cause")
st.write(last["top_cause"])

# ================= PLOT =================
st.subheader("Degradation Analysis")

plot_asset_analysis(asset_df, asset, baseline, warning, critical)