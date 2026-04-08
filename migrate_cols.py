"""Add missing columns to assets table and run user/network seed."""
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:0517@127.0.0.1:5432/asset_degradation")

missing_cols = [
    ("description", "VARCHAR"),
    ("baseline_surface_temperature", "FLOAT DEFAULT 25.0"),
    ("baseline_ambient_temperature", "FLOAT DEFAULT 25.0"),
    ("baseline_duty_cycle", "FLOAT DEFAULT 1.0"),
    ("baseline_rms_voltage", "FLOAT DEFAULT 220.0"),
    ("baseline_rms_current", "FLOAT DEFAULT 10.0"),
    ("baseline_real_power", "FLOAT DEFAULT 2200.0"),
    ("baseline_energy_consumed", "FLOAT DEFAULT 0.0"),
    ("baseline_operating_duration", "FLOAT DEFAULT 0.0"),
    ("voltage_tolerance", "FLOAT"),
    ("current_limit", "FLOAT"),
]

with engine.connect() as conn:
    # Get existing columns
    existing = {r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'assets'"
    )).fetchall()}
    print(f"Existing columns: {sorted(existing)}")

    for col_name, col_def in missing_cols:
        if col_name not in existing:
            try:
                conn.execute(text(f"ALTER TABLE assets ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"Added: {col_name}")
            except Exception as e:
                print(f"Error on {col_name}: {e}")
        else:
            print(f"Exists: {col_name}")

    # Also add role to users if missing
    u_cols = {r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
    )).fetchall()}
    if "role" not in u_cols:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'admin'"))
        conn.execute(text("UPDATE users SET role = 'admin' WHERE role IS NULL"))
        conn.commit()
        print("Added: users.role")
    else:
        print("Exists: users.role")

print("Migration complete.")
