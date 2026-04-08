import requests
import json
import time

API_URL = "http://localhost:8000/api/analyze"

def test_stressors():
    asset_id = "CHILLER-01"
    
    print(f"--- Testing Base State (Stressors = 0) ---")
    payload_base = {
        "asset_id": asset_id,
        "temperature_increase": 0,
        "voltage_increase": 0,
        "duty_cycle_increase": 0
    }
    res_base = requests.post(API_URL, json=payload_base).json()
    di_base = res_base["kpis"]["degradation"]
    acc_base = res_base["kpis"]["acceleration"]
    print(f"Base DI: {di_base:.4f}, Acc: {acc_base:.4f}")

    print(f"\n--- Testing High Stress (Temp +30) ---")
    payload_stress = {
        "asset_id": asset_id,
        "temperature_increase": 30,
        "voltage_increase": 5,
        "duty_cycle_increase": 10
    }
    res_stress = requests.post(API_URL, json=payload_stress).json()
    di_stress = res_stress["kpis"]["degradation"]
    acc_stress = res_stress["kpis"]["acceleration"]
    print(f"Stress DI: {di_stress:.4f}, Acc: {acc_stress:.4f}")

    if di_stress > di_base:
        print("\n✅ SUCCESS: DI increased under stress.")
    else:
        print("\n❌ FAILURE: DI did not increase.")

    if abs(acc_stress) > 0:
         print(f"✅ SUCCESS: Acceleration is non-zero ({acc_stress:.4f}).")
    else:
         print("\n❌ FAILURE: Acceleration is still 0.")

if __name__ == "__main__":
    try:
        test_stressors()
    except Exception as e:
        print(f"Error: {e}")
