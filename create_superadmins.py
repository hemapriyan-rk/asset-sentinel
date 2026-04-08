from api.database import SessionLocal
from api.models import User
from api.auth import get_password_hash

def create_superadmins():
    db = SessionLocal()
    try:
        # admin@assetsentinel.com
        admin_email = "admin@assetsentinel.com"
        if not db.query(User).filter(User.email == admin_email).first():
            user1 = User(
                username="admin_sentinel",
                email=admin_email,
                hashed_password=get_password_hash("admin@123"),
                role="superadmin"
            )
            db.add(user1)
            print(f"Created user: {admin_email}")

        # demo@assetsentinel.com
        demo_email = "demo@assetsentinel.com"
        if not db.query(User).filter(User.email == demo_email).first():
            user2 = User(
                username="demo_sentinel",
                email=demo_email,
                hashed_password=get_password_hash("demo@123"),
                role="superadmin"
            )
            db.add(user2)
            print(f"Created user: {demo_email}")

        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_superadmins()
