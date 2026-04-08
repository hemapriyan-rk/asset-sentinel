import psycopg2
import logging
from api.database import SQLALCHEMY_DATABASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    try:
        # Extract connection params from SQLAlchemy URL
        # postgresql://postgres:postgres@localhost:5432/iip_nexus
        url = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "")
        auth, host_db = url.split("@")
        user, password = auth.split(":")
        host_port, dbname = host_db.split("/")
        host, port = host_port.split(":")
        
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Add baseline columns
        cur.execute("ALTER TABLE assets ADD COLUMN IF NOT EXISTS mu_baseline FLOAT;")
        cur.execute("ALTER TABLE assets ADD COLUMN IF NOT EXISTS sigma_baseline FLOAT;")
        
        # Add random test baselines ONLY to existing seed data so they don't break immediately
        # We'll assume a generic mu=0.5, sigma=1.2 for existing data to simulate initialization
        cur.execute("UPDATE assets SET mu_baseline = 0.5, sigma_baseline = 1.2 WHERE mu_baseline IS NULL;")
        
        logger.info("Successfully added mu_baseline and sigma_baseline to assets table.")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
