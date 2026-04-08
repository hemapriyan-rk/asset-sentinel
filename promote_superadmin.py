"""
promote_superadmin.py — Promote an existing user to SuperAdmin role.
Usage: python promote_superadmin.py <username>
"""
import sys
from sqlalchemy import create_engine, text

DB_URL = "postgresql://postgres:0517@127.0.0.1:5432/asset_degradation"

def promote(username: str):
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, username, role FROM users WHERE username = :u"),
            {"u": username}
        ).fetchone()
        if not result:
            print(f"[ERROR] User '{username}' not found.")
            return
        conn.execute(
            text("UPDATE users SET role = 'superadmin' WHERE username = :u"),
            {"u": username}
        )
        conn.commit()
        print(f"[OK] User '{username}' promoted to superadmin.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_superadmin.py <username>")
        sys.exit(1)
    promote(sys.argv[1])
