import sqlite3
import os

db_file = "d:/IIP-2/api/database.db"
if not os.path.exists(db_file):
    print(f"DB not found at {db_file}")
else:
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    print("--- USERS ---")
    cursor.execute("SELECT id, username, role, email FROM users")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- ASSET OWNERSHIP ---")
    cursor.execute("SELECT id, name, owner_id, asset_type FROM assets")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- CONNECTIONS ---")
    cursor.execute("SELECT parent_asset_id, child_asset_id FROM asset_connections")
    for row in cursor.fetchall():
        print(row)
    
    conn.close()
