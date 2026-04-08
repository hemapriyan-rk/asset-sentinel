"""Debug create_users error."""
import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))

from api.database import SessionLocal
from api import models
from api.auth import get_password_hash

USERS = [
    {"username": "admin_plant01", "email": "arjun.kumar@plant01.com",  "password": "Plant@123",  "role": "admin"},
    {"username": "admin_pack01",  "email": "priya.sharma@pack01.com",  "password": "Pack@123",   "role": "admin"},
    {"username": "superadmin",    "email": "dev@assestsentinal.com",   "password": "Super@123",  "role": "superadmin"},
    {"username": "dev",           "email": "dev@assestsentinal.com",   "password": "dev@123",    "role": "superadmin"},
]

db = SessionLocal()
try:
    uid_map = {}
    for u in USERS:
        try:
            existing = db.query(models.User).filter(models.User.username == u["username"]).first()
            if existing:
                if existing.role != u["role"]:
                    existing.role = u["role"]
                    db.commit()
                print(f"EXISTS: {u['username']} id={existing.id} role={existing.role}")
                uid_map[u["username"]] = existing.id
            else:
                new_user = models.User(
                    username=u["username"],
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                print(f"CREATED: {u['username']} id={new_user.id} role={new_user.role}")
                uid_map[u["username"]] = new_user.id
        except Exception:
            db.rollback()
            traceback.print_exc()

    print(f"\nUID map: {uid_map}")

    # Test one asset insert
    owner = uid_map.get("admin_plant01")
    print(f"\nTesting asset insert with owner_id={owner}")
    existing = db.query(models.Asset).filter(models.Asset.id == "GRID-01").first()
    if not existing:
        a = models.Asset(
            id="GRID-01", name="Grid Supply 11kV", asset_type="SOURCE", owner_id=owner,
            description="Test",
            site="Plant-01", building="Main Workshop", floor="Ground",
            zone="Electrical Room",
            rated_voltage=11000.0, rated_current=30.0, rated_power=5500000.0, frequency=50.0,
            max_temperature=None, max_load_pct=100.0, voltage_tolerance=5.0,
            baseline_rms_voltage=11000.0, baseline_rms_current=20.0, baseline_real_power=3300000.0,
            baseline_surface_temperature=25.0, baseline_ambient_temperature=25.0,
            baseline_duty_cycle=1.0, sampling_rate=60.0, data_source="SCADA",
        )
        db.add(a)
        db.commit()
        print("Asset GRID-01 inserted!")
    else:
        print(f"Asset GRID-01 already exists, owner={existing.owner_id}")

finally:
    db.close()
