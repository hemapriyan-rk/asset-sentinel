from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:0517@127.0.0.1:5432/asset_degradation"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    print("Assigning orphaned assets to admin@assestsentinal.com (id=17)...")
    
    # First, get the ID of admin@assestsentinal.com just to be sure
    res = conn.execute(text("SELECT id FROM users WHERE email = 'admin@assestsentinal.com'")).fetchone()
    if not res:
        print("User admin@assestsentinal.com not found!")
    else:
        admin_id = res[0]
        print(f"Admin ID is {admin_id}")
        
        # Update assets with NULL owner_id
        update_res = conn.execute(text(f"UPDATE assets SET owner_id = {admin_id} WHERE owner_id IS NULL"))
        print(f"Updated {update_res.rowcount} orphaned assets.")
        
        # Also ensure T001-T005 are owned by this admin if they weren't already
        update_tags = conn.execute(text(f"UPDATE assets SET owner_id = {admin_id} WHERE id LIKE 'T00%'"))
        print(f"Updated {update_tags.rowcount} T00x assets.")
        
        conn.commit()
        print("Done.")
