"""Full column sync — ensures all model columns exist in PostgreSQL."""
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:0517@127.0.0.1:5432/asset_degradation")

ALL_NEEDED = [
    ("description", "VARCHAR"),
    ("asset_type", "VARCHAR DEFAULT 'LOAD'"),
    ("owner_id", "INTEGER"),
    ("site", "VARCHAR"),
    ("building", "VARCHAR"),
    ("floor", "VARCHAR"),
    ("zone", "VARCHAR"),
    ("panel", "VARCHAR"),
    ("rated_voltage", "FLOAT"),
    ("rated_current", "FLOAT"),
    ("rated_power", "FLOAT"),
    ("frequency", "FLOAT"),
    ("max_temperature", "FLOAT"),
    ("max_load_pct", "FLOAT DEFAULT 100.0"),
    ("voltage_tolerance", "FLOAT"),
    ("current_limit", "FLOAT"),
    ("baseline_rms_voltage", "FLOAT DEFAULT 220.0"),
    ("baseline_rms_current", "FLOAT DEFAULT 10.0"),
    ("baseline_real_power", "FLOAT DEFAULT 2200.0"),
    ("baseline_energy_consumed", "FLOAT DEFAULT 0.0"),
    ("baseline_surface_temperature", "FLOAT DEFAULT 25.0"),
    ("baseline_ambient_temperature", "FLOAT DEFAULT 25.0"),
    ("baseline_operating_duration", "FLOAT DEFAULT 0.0"),
    ("baseline_duty_cycle", "FLOAT DEFAULT 1.0"),
    ("sampling_rate", "FLOAT"),
    ("data_source", "VARCHAR"),
    ("voltage_sensor_id", "VARCHAR"),
    ("current_sensor_id", "VARCHAR"),
]

with engine.connect() as conn:
    existing = {r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'assets'"
    )).fetchall()}
    print(f"Current columns: {sorted(existing)}\n")

    for col_name, col_def in ALL_NEEDED:
        if col_name not in existing:
            try:
                conn.execute(text(f"ALTER TABLE assets ADD COLUMN {col_name} {col_def}"))
                conn.commit()
                print(f"  [ADDED]  {col_name}")
            except Exception as e:
                print(f"  [ERROR]  {col_name}: {e}")
        else:
            pass  # already exists

print("\nSync complete.")
