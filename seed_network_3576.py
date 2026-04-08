import sys
import os
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add current directory to path
sys.path.append(os.getcwd())

from api.database import SQLALCHEMY_DATABASE_URL
from api.models import Base, User, Asset, AssetConnection, AssetTelemetry
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def get_password_hash(password):
    return pwd_context.hash(password)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed():
    db = SessionLocal()
    target_username = "3576"
    
    # IDs we are about to create (to check for global collisions)
    target_ids = [
        "GRID-01", "TR-01", "LT-01", "MCC-A-01", "MCC-B-01", 
        "HVAC-01", "MOTOR-CNC-01", "COMP-01", "CHILLER-01"
    ]

    try:
        # 1. Create/Verify User 3576
        user = db.query(User).filter(User.username == target_username).first()
        if not user:
            print(f"Creating User {target_username}...")
            user = User(
                username=target_username,
                email=f"user{target_username}@example.com",
                hashed_password=get_password_hash("123"),
                role="admin"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        user_id = user.id
        print(f"User {target_username} is ready with ID: {user_id}")

        # 2. FORCE CLEANUP for these specific IDs (to handle global collisions)
        print("Force clearing target IDs for isolation...")
        for aid in target_ids:
            # Delete entries in child tables first
            db.execute(text("DELETE FROM asset_connections WHERE parent_asset_id = :aid OR child_asset_id = :aid"), {"aid": aid})
            db.execute(text("DELETE FROM asset_telemetry WHERE asset_id = :aid"), {"aid": aid})
            db.execute(text("DELETE FROM assets WHERE id = :aid"), {"aid": aid})
        db.commit()

        # 3. Create Network
        assets_specs = [
            {"id": "GRID-01", "name": "Utility Grid Connection", "type": "BUS", "v": 11000, "i": 1000, "p": 1000000, "upstream": None},
            {"id": "TR-01", "name": "Main Step-Down Transformer", "type": "TRANSFORMER", "v": 11000, "i": 26, "p": 500000, "upstream": "GRID-01", "conn": "Direct"},
            {"id": "LT-01", "name": "Main Low Tension Panel", "type": "PANEL", "v": 415, "i": 800, "p": 400000, "upstream": "TR-01", "conn": "Direct"},
            {"id": "MCC-A-01", "name": "Motor Control Center A", "type": "PANEL", "v": 415, "i": 200, "p": 50000, "upstream": "LT-01"},
            {"id": "MCC-B-01", "name": "Motor Control Center B", "type": "PANEL", "v": 415, "i": 200, "p": 50000, "upstream": "LT-01"},
            {"id": "HVAC-01", "name": "HVAC Distribution Board", "type": "PANEL", "v": 415, "i": 200, "p": 50000, "upstream": "LT-01"},
            {"id": "MOTOR-CNC-01", "name": "CNC Machine Motor", "type": "MOTOR", "v": 415, "i": 28, "p": 15000, "upstream": "MCC-A-01", "conn": "Feeder"},
            {"id": "COMP-01", "name": "Air Compressor Unit", "type": "MOTOR", "v": 415, "i": 40, "p": 20000, "upstream": "MCC-B-01", "conn": "Feeder"},
            {"id": "CHILLER-01", "name": "Industrial Chiller Unit", "type": "HVAC", "v": 415, "i": 60, "p": 25000, "upstream": "HVAC-01", "conn": "Direct"}
        ]

        baselines = {
            "TR-01": {"v": 415, "i": 20, "p": 350000, "st": 60, "at": 30, "dc": 1.0},
            "LT-01": {"v": 415, "i": 300, "p": 220000, "st": 45, "at": 30, "dc": 1.0},
            "MOTOR-CNC-01": {"v": 410, "i": 24, "p": 12000, "st": 65, "at": 30, "dc": 0.85},
            "COMP-01": {"v": 405, "i": 38, "p": 18500, "st": 85, "at": 32, "dc": 0.95},
            "CHILLER-01": {"v": 400, "i": 58, "p": 24000, "st": 92, "at": 35, "dc": 1.0}
        }

        print("Creating assets...")
        for spec in assets_specs:
            aid = spec["id"]
            b = baselines.get(aid, {"v": 415, "i": 10, "p": 5000, "st": 40, "at": 30, "dc": 1.0})
            a = Asset(
                id=aid, name=spec["name"], asset_type=spec["type"], owner_id=user_id,
                rated_voltage=spec["v"], rated_current=spec["i"], rated_power=spec["p"],
                baseline_rms_voltage=b["v"], baseline_rms_current=b["i"], baseline_real_power=b["p"],
                baseline_surface_temperature=b["st"], baseline_ambient_temperature=b["at"], baseline_duty_cycle=b["dc"],
                mu_baseline=0.5, sigma_baseline=1.2
            )
            db.add(a)
        db.commit()

        print("Creating connections...")
        for spec in assets_specs:
            if spec.get("upstream"):
                conn = AssetConnection(
                    parent_asset_id=spec["upstream"], child_asset_id=spec["id"],
                    connection_type=spec.get("conn", "Direct").upper()
                )
                db.add(conn)
        db.commit()

        print("Inserting telemetry...")
        base_time = datetime.now() - timedelta(hours=5)
        for aid, b in baselines.items():
            for h in range(5):
                t = AssetTelemetry(
                    asset_id=aid, timestamp=(base_time + timedelta(hours=h)).strftime("%Y-%m-%d %H:%M:%S"),
                    rms_voltage=b["v"], rms_current=b["i"], real_power=b["p"],
                    surface_temperature=b["st"], ambient_temperature=b["at"], duty_cycle=b["dc"]
                )
                db.add(t)
        db.commit()
        print("=== Isolated Network Seeded Successfully for User 3576 ===")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
