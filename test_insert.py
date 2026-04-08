import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))
from api.database import SessionLocal
from api import models

db = SessionLocal()
try:
    owner = db.query(models.User).filter(models.User.username == "admin_plant01").first()
    if not owner:
        print("admin_plant01 not found!")
        sys.exit(1)
    print(f"Owner id={owner.id}")

    existing = db.query(models.Asset).filter(models.Asset.id == "GRID-01").first()
    if existing:
        print(f"GRID-01 already exists, owner={existing.owner_id}")
    else:
        a = models.Asset(
            id="GRID-01", name="Test", asset_type="SOURCE",
            owner_id=owner.id,
            site="Plant-01",
        )
        db.add(a)
        db.commit()
        print("Inserted!")
except Exception:
    db.rollback()
    traceback.print_exc()
finally:
    db.close()
