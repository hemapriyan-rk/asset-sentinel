"""
setup_db.py — Run once to migrate PostgreSQL schema and seed plant data.
Usage: python setup_db.py
"""
from sqlalchemy import create_engine, text

DB_URL = "postgresql://postgres:0517@127.0.0.1:5432/asset_degradation"
engine = create_engine(DB_URL)

def migrate():
    with engine.connect() as conn:
        # Add role column to users if missing
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'admin'"))
            conn.commit()
            print("Added: users.role")
        except Exception:
            print("Skip: users.role (already exists)")

        # Set role to 'admin' for all existing nulls
        conn.execute(text("UPDATE users SET role = 'admin' WHERE role IS NULL"))
        conn.commit()
        print("Normalized existing user roles to 'admin'")


def seed():
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    from api.database import SessionLocal
    from api.seed import run_seed

    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    print("=== AssetSentinel DB Setup ===")
    migrate()
    seed()
    print("=== Done ===")
