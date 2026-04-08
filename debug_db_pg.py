from sqlalchemy import create_engine, text
import pandas as pd

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:0517@127.0.0.1:5432/asset_degradation"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    print("--- USERS ---")
    users = pd.read_sql("SELECT id, username, role, email FROM users", conn)
    print(users)
    
    print("\n--- ASSETS ---")
    assets = pd.read_sql("SELECT id, name, owner_id, asset_type FROM assets", conn)
    print(assets)
    
    print("\n--- CONNECTIONS ---")
    conns = pd.read_sql("SELECT parent_asset_id, child_asset_id FROM asset_connections", conn)
    print(conns)
