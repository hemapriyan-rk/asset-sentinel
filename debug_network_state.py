import sys
import os
import json

# Add current dir to path
sys.path.insert(0, os.getcwd())

from api.database import SessionLocal
from api.main import get_network, app
from fastapi import Request

def debug():
    print("--- Network State Diagnostic ---")
    db = SessionLocal()
    try:
        # Mocking the request context if needed, but get_network takes db directly
        res = get_network(db)
        data = json.loads(res.body)
        
        print(f"Total Nodes: {len(data['nodes'])}")
        print(f"{'ID':<15} | {'Load':<10} | {'Load %':<8} | {'State':<10}")
        print("-" * 50)
        
        for n in data['nodes']:
            print(f"{n['id']:<15} | {n['current_load']:<10.1f} | {str(n['load_pct'])+'%':<8} | {n['network_state']:<10}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug()
