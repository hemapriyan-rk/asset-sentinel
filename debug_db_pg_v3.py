from sqlalchemy import create_engine, text
import pandas as pd
import sys

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:0517@127.0.0.1:5432/asset_degradation"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with open("d:/IIP-2/db_dump_utf8.txt", "w", encoding="utf-8") as f:
    with engine.connect() as conn:
        f.write("--- USERS ---\n")
        users = pd.read_sql(text("SELECT id, username, role, email FROM users"), conn)
        f.write(users.to_string() + "\n\n")
        
        f.write("--- ASSETS ---\n")
        assets = pd.read_sql(text("SELECT id, name, owner_id, asset_type FROM assets"), conn)
        f.write(assets.to_string() + "\n\n")
        
        f.write("--- CONNECTIONS ---\n")
        conns = pd.read_sql(text("SELECT parent_asset_id, child_asset_id FROM asset_connections"), conn)
        f.write(conns.to_string() + "\n\n")
