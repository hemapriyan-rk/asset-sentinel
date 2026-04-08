import os

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 Day

# Resources Configuration
DATA_PATH = os.getenv("DATA_PATH", r"D:\IIP\Dataset\degradation_test_all_cases.xlsx")
MODEL_PATH = os.getenv("MODEL_PATH", r"D:\IIP\Model\vae_model.pt")
SCALER_PATH = os.getenv("SCALER_PATH", r"D:\IIP\Model\scaler.pkl")

# Machine Learning Parameters
DEFAULT_MU_BASELINE = 1.0
DEFAULT_SIGMA_BASELINE = 0.2
SIMULATION_NOISE = 0.005

FEATURES = [
    "rms_voltage", "rms_current", "real_power", "energy_consumed",
    "surface_temperature", "ambient_temperature",
    "operating_duration", "duty_cycle"
]
