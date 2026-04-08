import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from api.database import SQLALCHEMY_DATABASE_URL
from api.models import Base, Asset, AssetTelemetry, User
from api.seed import SEED_ASSETS

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DATA_PATH = r"D:\IIP\Dataset\degradation_test_all_cases.xlsx"
FEATURES = [
    "rms_voltage", "rms_current", "real_power", "energy_consumed",
    "surface_temperature", "ambient_temperature",
    "operating_duration", "duty_cycle"
]

def migrate():
    print("--- Creating Tables ---")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print(f"--- Loading Excel: {DATA_PATH} ---")
        if not os.path.exists(DATA_PATH):
            print(f"Error: {DATA_PATH} not found.")
            return

        df = pd.read_excel(DATA_PATH)
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors='coerce')
        df = df.dropna(subset=FEATURES + ["timestamp", "asset_id"])
        
        # 1. Ensure all assets exist in the DB
        asset_ids = df["asset_id"].unique()
        for aid in asset_ids:
            existing = db.query(Asset).filter(Asset.id == aid).first()
            if not existing:
                print(f"Adding missing asset: {aid}")
                # Try to find in SEED_ASSETS if possible, else generic
                seed_data = next((a for a in SEED_ASSETS if a["id"] == aid), None)
                if seed_data:
                    new_asset = Asset(
                        id=aid, name=seed_data["name"], asset_type=seed_data["asset_type"],
                        rated_voltage=seed_data.get("rated_voltage"),
                        rated_current=seed_data.get("rated_current"),
                        mu_baseline=0.5, sigma_baseline=1.2 # Default baselines
                    )
                else:
                    new_asset = Asset(id=aid, name=aid, asset_type="LOAD", mu_baseline=0.5, sigma_baseline=1.2)
                db.add(new_asset)
        
        db.commit()
        
        # 2. Bulk Insert Telemetry
        print(f"--- Migrating {len(df)} telemetry records ---")
        
        # Clear existing telemetry to avoid dups if re-running
        db.query(AssetTelemetry).delete()
        db.commit()
        
        telemetry_objs = []
        for _, row in df.iterrows():
            t = AssetTelemetry(
                asset_id=row["asset_id"],
                timestamp=row["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
                rms_voltage=row["rms_voltage"],
                rms_current=row["rms_current"],
                real_power=row["real_power"],
                energy_consumed=row["energy_consumed"],
                surface_temperature=row["surface_temperature"],
                ambient_temperature=row["ambient_temperature"],
                operating_duration=row["operating_duration"],
                duty_cycle=row["duty_cycle"]
            )
            telemetry_objs.append(t)
            
            if len(telemetry_objs) >= 500:
                db.bulk_save_objects(telemetry_objs)
                telemetry_objs = []
                print(f"Inserted 500...")

        if telemetry_objs:
            db.bulk_save_objects(telemetry_objs)
        
        db.commit()
        print("--- Migration Complete ---")

    except Exception as e:
        import traceback
        print(f"Error during migration: {e}")
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
