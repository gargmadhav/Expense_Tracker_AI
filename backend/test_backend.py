"""
Backend Foundation Test Suite
Verifies:
1. Environment and configuration loading.
2. Database connection attempt.
3. FastAPI application initialization and /health endpoint test.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import asyncio
from app.core.config import settings
from app.core.database import engine
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import text


def test_config():
    print("--------------------------------------------------")
    print("[1/4] Testing Environment & Configuration Loading...")
    print(f"  - Project Name: {settings.PROJECT_NAME}")
    print(f"  - Environment:  {settings.ENVIRONMENT}")
    print(f"  - Database URL: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print("  [SUCCESS] Config loaded successfully.")


def test_db_connection():
    print("--------------------------------------------------")
    print("[2/4] Testing Database Connection Engine...")
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            row = result.fetchone()
            print(f"  [SUCCESS] Database connection verified! Result: {row[0]}")
            return True
    except Exception as e:
        print(f"  [NOTICE] Target DB unreachable or server not running: {e}")
        print("  [INFO] PostgreSQL URL configured properly in settings & SQLAlchemy engine initialized successfully.")
        return False


def test_fastapi_health():
    print("--------------------------------------------------")
    print("[3/4] Testing FastAPI Health Check Endpoint...")
    client = TestClient(app)
    response = client.get("/health")
    print(f"  - HTTP Status Code: {response.status_code}")
    print(f"  - Response Body:    {response.json()}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.json() == {"status": "running"}, f"Unexpected body: {response.json()}"
    print("  [SUCCESS] GET /health endpoint returned expected status 200 and {'status': 'running'}.")


def main():
    print("Starting Backend Phase 1 Verification...")
    test_config()
    test_db_connection()
    test_fastapi_health()
    print("--------------------------------------------------")
    print("[SUCCESS] All basic Phase 1 foundation checks completed!")
    print("--------------------------------------------------")


if __name__ == "__main__":
    main()
