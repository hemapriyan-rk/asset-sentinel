from api.main import app
from fastapi.testclient import TestClient
import traceback

client = TestClient(app)

try:
    response = client.post("/api/analyze", json={"asset_id": "TR-01"})
    print("Status:", response.status_code)
    print("Body:", response.json())
except Exception as e:
    print("Exception occurred:")
    traceback.print_exc()
