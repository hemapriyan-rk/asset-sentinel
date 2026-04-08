import joblib
import numpy as np
import os

SCALER_PATH = r"D:\IIP\Model\scaler.pkl"
FEATURES = ["rms_voltage", "rms_current", "real_power", "energy_consumed", "surface_temperature", "ambient_temperature", "operating_duration", "duty_cycle"]

def check_scaler():
    if not os.path.exists(SCALER_PATH):
        print("Scaler not found.")
        return
        
    scaler = joblib.load(SCALER_PATH)
    print("Scaler Features:", FEATURES)
    print("Means:", scaler.mean_)
    print("Scales (Std):", scaler.scale_)
    
    # Example Seed values for 'MTR-A1'
    # rms_voltage: 415, rms_current: 42, real_power: 17430, energy_consumed: 0, 
    # temp: 45, ambient: 32, duration: 0, duty: 0.85
    sample = np.array([[415, 42, 17430, 0, 45, 32, 0, 0.85]])
    scaled = scaler.transform(sample)
    print("\nSample (MTR-A1-Baseline) -> Scaled:")
    print(scaled)

if __name__ == "__main__":
    check_scaler()
