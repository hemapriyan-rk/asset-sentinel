"""
clear_and_reseed.py — Remove generic seed assets (owner_id IS NULL) and re-seed with proper per-owner plant data.
"""
import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))
from api.database import SessionLocal
from api import models

db = SessionLocal()
try:
    # Delete all connections referencing NULL-owner assets
    null_asset_ids = [a.id for a in db.query(models.Asset).filter(models.Asset.owner_id == None).all()]
    print(f"Null-owner assets to remove: {null_asset_ids}")

    if null_asset_ids:
        db.query(models.AssetConnection).filter(
            models.AssetConnection.parent_asset_id.in_(null_asset_ids) |
            models.AssetConnection.child_asset_id.in_(null_asset_ids)
        ).delete(synchronize_session=False)
        db.query(models.Asset).filter(models.Asset.owner_id == None).delete(synchronize_session=False)
        db.commit()
        print("Cleared null-owner seed data.")

    # Also clear any existing Plant-01/02 assets (in case of partial inserts)
    plant_ids = [a.id for a in db.query(models.Asset).filter(
        models.Asset.owner_id.in_(
            [u.id for u in db.query(models.User).filter(
                models.User.username.in_(["admin_plant01", "admin_pack01"])
            ).all()]
        )
    ).all()]
    if plant_ids:
        db.query(models.AssetConnection).filter(
            models.AssetConnection.parent_asset_id.in_(plant_ids) |
            models.AssetConnection.child_asset_id.in_(plant_ids)
        ).delete(synchronize_session=False)
        db.query(models.Asset).filter(models.Asset.id.in_(plant_ids)).delete(synchronize_session=False)
        db.commit()
        print(f"Cleared {len(plant_ids)} old plant assets.")

    print("Ready for fresh seed.")
finally:
    db.close()
