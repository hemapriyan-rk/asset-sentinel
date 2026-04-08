import sys
import os
import json

# Add current dir to path
sys.path.insert(0, os.getcwd())

from api.database import SessionLocal
from api import models
from api.main import _compute_load, _network_state

def debug():
    print("--- Network Calculation Trace ---")
    db = SessionLocal()
    try:
        all_assets = db.query(models.Asset).all()
        assets_map = {a.id: a for a in all_assets}
        asset_ids = {a.id for a in all_assets}
        
        all_conns = db.query(models.AssetConnection).filter(
            models.AssetConnection.parent_asset_id.in_(asset_ids),
            models.AssetConnection.child_asset_id.in_(asset_ids),
        ).all()
        
        # Telemetry check
        telemetry_map = {} # Assume empty for now (default seed state)
        
        print(f"{'ID':<15} | {'Rated':<10} | {'Load':<10} | {'%':<5} | {'Max%':<5} | {'State':<10}")
        print("-" * 70)
        
        for asset in all_assets:
            # We must use EXACTLY the same logic as in main.py
            current_load = _compute_load(asset.id, all_conns, assets_map, telemetry_map, set())
            
            load_pct = 0
            if asset.rated_power and asset.rated_power > 0:
                load_pct = round((current_load / asset.rated_power) * 100, 1)
            
            # Using _network_state from main.py
            state = _network_state(current_load, asset.rated_power, asset.max_load_pct)
            
            print(f"{asset.id:<15} | {str(asset.rated_power):<10} | {current_load:<10.1f} | {load_pct:<5} | {asset.max_load_pct:<5} | {state:<10}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug()
