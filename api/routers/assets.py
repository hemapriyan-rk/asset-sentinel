from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from api import models, schemas, auth
from api.database import get_db

router = APIRouter(prefix="/api/assets", tags=["assets"])

def log_action(db: Session, action: str, user_id: Optional[int] = None, details: Optional[str] = None):
    try:
        log = models.AuditLog(user_id=user_id, action=action, details=details)
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"[AuditLog] Error: {e}")

@router.get("")
def get_assets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Return assets. Admin sees own + seed assets (owner_id=NULL). SuperAdmin sees all."""
    assets_map = {}

    query = db.query(models.Asset)
    if current_user.role != "superadmin":
        query = query.filter(models.Asset.owner_id == current_user.id)

    db_assets = query.all()
    for a in db_assets:
        assets_map[a.id] = {
            "id": a.id,
            "name": a.name or a.id,
            "asset_type": a.asset_type or "LOAD",
            "site": a.site,
            "building": a.building,
            "floor": a.floor,
            "zone": a.zone,
            "panel": a.panel,
        }

    return {"assets": list(assets_map.values())}

@router.post("", response_model=schemas.AssetResponse)
def create_asset(
    asset: schemas.AssetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    existing = db.query(models.Asset).filter(models.Asset.id == asset.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Asset ID '{asset.id}' already exists.")

    data = asset.dict()
    if current_user.role != "superadmin":
        data["owner_id"] = current_user.id
    else:
        data["owner_id"] = data.get("owner_id") or None

    new_asset = models.Asset(**data)
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    
    log_action(db, "Asset Created", user_id=current_user.id, details=f"Asset ID: {new_asset.id}")
    return new_asset

@router.put("/{asset_id}")
def update_asset(
    asset_id: str,
    asset_update: schemas.AssetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if current_user.role != "superadmin" and db_asset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this asset")

    update_data = asset_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)

    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.delete("/{asset_id}")
def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    if current_user.role != "superadmin" and asset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this asset.")

    children = db.query(models.AssetConnection).filter(
        models.AssetConnection.parent_asset_id == asset_id
    ).count()
    if children > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete '{asset_id}': it has {children} downstream child asset(s). Remove children first."
        )

    db.delete(asset)
    log_action(db, "Asset Deleted", user_id=current_user.id, details=f"Asset ID: {asset_id}")
    db.commit()
    return {"message": f"Asset '{asset_id}' deleted successfully."}

@router.get("/{asset_id}/parent")
def get_asset_parent(asset_id: str, db: Session = Depends(get_db)):
    conn = db.query(models.AssetConnection).filter(
        models.AssetConnection.child_asset_id == asset_id
    ).first()
    if not conn:
        return {"parent": None}
    parent = db.query(models.Asset).filter(models.Asset.id == conn.parent_asset_id).first()
    return {"parent": {"id": conn.parent_asset_id, "name": parent.name if parent else conn.parent_asset_id, "connection_type": conn.connection_type}}

@router.get("/{asset_id}/children")
def get_asset_children(asset_id: str, db: Session = Depends(get_db)):
    conns = db.query(models.AssetConnection).filter(
        models.AssetConnection.parent_asset_id == asset_id
    ).all()
    children = []
    for c in conns:
        child = db.query(models.Asset).filter(models.Asset.id == c.child_asset_id).first()
        children.append({
            "id": c.child_asset_id,
            "name": child.name if child else c.child_asset_id,
            "connection_type": c.connection_type
        })
    return {"children": children}
