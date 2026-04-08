from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from api import models, schemas, auth
from api.database import get_db
from api.services.network_service import has_upstream_path, compute_load, network_state

router = APIRouter(prefix="/api", tags=["network"])

@router.post("/connections", response_model=schemas.AssetConnectionResponse)
def create_connection(
    conn: schemas.AssetConnectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Create a connection edge with full validation and cycle detection."""
    # Self-reference check
    if conn.parent_asset_id == conn.child_asset_id:
        raise HTTPException(status_code=400, detail="An asset cannot connect to itself.")

    # Validate both assets exist
    parent = db.query(models.Asset).filter(models.Asset.id == conn.parent_asset_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail=f"Parent asset '{conn.parent_asset_id}' not found.")

    child = db.query(models.Asset).filter(models.Asset.id == conn.child_asset_id).first()
    if not child:
        raise HTTPException(status_code=404, detail=f"Child asset '{conn.child_asset_id}' not found.")

    # Duplicate connection check
    duplicate = db.query(models.AssetConnection).filter(
        models.AssetConnection.parent_asset_id == conn.parent_asset_id,
        models.AssetConnection.child_asset_id == conn.child_asset_id
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="This connection already exists.")

    # Cycle detection
    all_connections = db.query(models.AssetConnection).all()
    if has_upstream_path(conn.parent_asset_id, conn.child_asset_id, all_connections):
        raise HTTPException(
            status_code=400,
            detail=f"Circular connection detected: '{conn.child_asset_id}' is already an ancestor of '{conn.parent_asset_id}'."
        )

    new_conn = models.AssetConnection(**conn.dict())
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)
    return new_conn


@router.get("/connections")
def get_connections(db: Session = Depends(get_db)):
    conns = db.query(models.AssetConnection).all()
    return {"connections": [
        {"id": c.id, "parent_asset_id": c.parent_asset_id, "child_asset_id": c.child_asset_id,
         "connection_type": c.connection_type, "feeder_id": c.feeder_id}
        for c in conns
    ]}


@router.get("/network", response_model=schemas.NetworkResponse)
def get_network(
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Return full graph as { nodes, edges } with computed load metrics."""
    query = db.query(models.Asset)

    if current_user.role != "superadmin":
        query = query.filter(models.Asset.owner_id == current_user.id)
    elif owner_id is not None:
        query = query.filter(models.Asset.owner_id == owner_id)

    all_assets = query.all()
    asset_ids = {a.id for a in all_assets}
    assets_map = {a.id: a for a in all_assets}

    from sqlalchemy import func
    
    latest_ts = db.query(
        models.AssetTelemetry.asset_id,
        func.max(models.AssetTelemetry.timestamp).label("max_ts")
    ).filter(models.AssetTelemetry.asset_id.in_(asset_ids)).group_by(models.AssetTelemetry.asset_id).subquery()
    
    latest_telemetry = db.query(models.AssetTelemetry).join(
        latest_ts,
        (models.AssetTelemetry.asset_id == latest_ts.c.asset_id) & 
        (models.AssetTelemetry.timestamp == latest_ts.c.max_ts)
    ).all()
    
    telemetry_map = {t.asset_id: (t.real_power or 0.0) for t in latest_telemetry}

    # Only include connections where BOTH endpoints are in the visible set
    all_conns = db.query(models.AssetConnection).filter(
        models.AssetConnection.parent_asset_id.in_(asset_ids),
        models.AssetConnection.child_asset_id.in_(asset_ids),
    ).all()

    nodes = []
    for asset in all_assets:
        current_load = compute_load(asset.id, all_conns, assets_map, telemetry_map, set())

        load_pct = None
        if asset.rated_power and asset.rated_power > 0:
            load_pct = round((current_load / asset.rated_power) * 100, 1)

        state = network_state(current_load, asset.rated_power, asset.max_load_pct or 100.0)

        nodes.append(schemas.NetworkNode(
            id=asset.id,
            name=asset.name or asset.id,
            asset_type=asset.asset_type or "LOAD",
            site=asset.site,
            building=asset.building,
            floor=asset.floor,
            zone=asset.zone,
            panel=asset.panel,
            rated_power=asset.rated_power,
            max_load_pct=asset.max_load_pct,
            current_load=round(current_load, 2),
            load_pct=load_pct,
            network_state=state,
        ))

    edges = [
        schemas.NetworkEdge(
            id=c.id,
            parent_asset_id=c.parent_asset_id,
            child_asset_id=c.child_asset_id,
            connection_type=c.connection_type,
            feeder_id=c.feeder_id,
        )
        for c in all_conns
    ]

    return schemas.NetworkResponse(nodes=nodes, edges=edges)
