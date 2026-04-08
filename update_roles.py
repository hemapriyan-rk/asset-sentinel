from api.database import SessionLocal
from api.models import User

def update_roles():
    db = SessionLocal()
    try:
        # 1. Rename all existing "admin" roles to "system user"
        users_to_rename = db.query(User).filter(User.role == "admin").all()
        for u in users_to_rename:
            u.role = "system user"
        print(f"Renamed {len(users_to_rename)} 'admin' users to 'system user'")

        # 2. Convert demo@assestsentinal.com from superadmin to admin
        demo = db.query(User).filter(User.email == "demo@assestsentinal.com").first()
        if demo:
            demo.role = "admin"
            print("Downgraded demo@assestsentinal.com to 'admin' role")

        # 3. Ensure admin@assestsentinal.com is superadmin
        super_admin = db.query(User).filter(User.email == "admin@assestsentinal.com").first()
        if super_admin:
            super_admin.role = "superadmin"
            print("Confirmed admin@assestsentinal.com as 'superadmin'")

        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_roles()
