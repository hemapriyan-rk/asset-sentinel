import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add the 'code' directory to sys.path so we can import 'core'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'code')))

from api.database import engine, SessionLocal
from api import models, auth
from api.routers import assets, network, admin, analysis

app = FastAPI(title="AssetSentinel API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables if not exist
models.Base.metadata.create_all(bind=engine)

# ================= GRID SEEDING =================
def seed_on_startup():
    """Run DB seed data on startup — assets AND default users."""
    from api.seed import run_seed
    db = SessionLocal()
    try:
        run_seed(db)
        _seed_default_users(db)
    except Exception as e:
        print(f"[AssetSentinel] Seed error: {e}")
    finally:
        db.close()

def _seed_default_users(db):
    """Idempotently create the default superadmin and demo accounts."""
    defaults = [
        {
            "username": "admin_sentinel",
            "email": "admin@assetsentinel.com",
            "password": "admin@123",
            "role": "superadmin",
        },
        {
            "username": "demo_sentinel",
            "email": "demo@assetsentinel.com",
            "password": "demo@123",
            "role": "superadmin",
        },
    ]
    from api.auth import get_password_hash
    for d in defaults:
        existing = db.query(models.User).filter(models.User.email == d["email"]).first()
        if not existing:
            user = models.User(
                username=d["username"],
                email=d["email"],
                hashed_password=get_password_hash(d["password"]),
                role=d["role"],
            )
            db.add(user)
            print(f"[AssetSentinel] Created user: {d['email']}")
    db.commit()

seed_on_startup()

# Include Routers
app.include_router(auth.router)
app.include_router(assets.router)
app.include_router(network.router)
app.include_router(admin.router)
app.include_router(analysis.router)

@app.get("/api/health")
def health_check():
    return {"status": "online", "version": "2.0.0"}
