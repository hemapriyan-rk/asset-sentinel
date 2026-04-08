import torch
import joblib
import pandas as pd
from api.config import MODEL_PATH, SCALER_PATH, FEATURES

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

    def forward_deterministic(self, x):
        h = self.encoder(x)
        mu, logvar = self.mu(h), self.logvar(h)
        recon = self.decoder(mu)
        return recon, mu, logvar

class InferenceService:
    def __init__(self):
        self.scaler = None
        self.model = None
        self._load_models()

    def _load_models(self):
        try:
            self.scaler = joblib.load(SCALER_PATH)
            self.model = VAE()
            self.model.load_state_dict(torch.load(MODEL_PATH, weights_only=False)["model_state"], strict=False)
            self.model.eval()
            print("[InferenceService] ML Models loaded successfully.")
        except Exception as e:
            print(f"[InferenceService] Warning: Could not load ML resources: {e}")
            self.scaler, self.model = None, None

    def transform_and_predict(self, asset_df: pd.DataFrame, deterministic: bool = False):
        if self.scaler is None or self.model is None:
            raise RuntimeError("ML model or scaler is not loaded.")
        
        # Fill any NaNs in inputs to prevent cascading failures
        asset_df[FEATURES] = asset_df[FEATURES].fillna(0)
        
        X = self.scaler.transform(asset_df[FEATURES])
        X_tensor = torch.tensor(X, dtype=torch.float32)

        with torch.no_grad():
            if deterministic:
                recon, _, _ = self.model.forward_deterministic(X_tensor)
            else:
                recon, _, _ = self.model(X_tensor)
            
        return X_tensor, recon

# Singleton Instance
inference_service = InferenceService()
