from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:0517@127.0.0.1:5432/asset_degradation")
with engine.connect() as conn:
    cols = conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'assets' ORDER BY ordinal_position"
    )).fetchall()
    print([c[0] for c in cols])
