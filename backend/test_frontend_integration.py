"""
Phase 5 Frontend Integration Automated Verification Test Suite
Tests:
1. FastAPI app with in-memory SQLite and StaticPool.
2. User registration and authentication login.
3. CORS headers headers check for cross-origin frontend communication.
4. Full integration lifecycle test for /auth, /dashboard, /expenses, /income, and /budgets.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.database import get_db, Base
import app.models
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def test_frontend_integration_flow():
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)

    print("==================================================")
    print("  PHASE 5 FRONTEND INTEGRATION VERIFICATION")
    print("==================================================")

    # 1. CORS Preflight & Health Check
    print("[1/6] Testing Health Endpoint & CORS Headers...")
    res_health = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert res_health.status_code == 200
    assert res_health.json() == {"status": "running"}
    assert "access-control-allow-origin" in res_health.headers
    print("  [SUCCESS] Health endpoint and CORS middleware active.")

    # 2. Authentication Page Integration (/auth/register, /auth/login, /auth/me)
    print("--------------------------------------------------")
    print("[2/6] Testing Login/Register Pages API Integration...")
    reg_payload = {"full_name": "Integration User", "email": "integration@example.com", "password": "Password123!"}
    res_reg = client.post("/auth/register", json=reg_payload)
    assert res_reg.status_code == 201

    login_payload = {"email": "integration@example.com", "password": "Password123!"}
    res_login = client.post("/auth/login", json=login_payload)
    assert res_login.status_code == 200
    access_token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    res_me = client.get("/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "integration@example.com"
    print("  [SUCCESS] Login & Register endpoints verified.")

    # 3. Income Page Integration (/income)
    print("--------------------------------------------------")
    print("[3/6] Testing Income Page API Integration...")
    inc_payload = {"source": "Tech Salary", "amount": 6000.00, "transaction_date": str(date.today())}
    res_inc = client.post("/income", json=inc_payload, headers=headers)
    assert res_inc.status_code == 201

    res_inc_list = client.get("/income", headers=headers)
    assert res_inc_list.status_code == 200
    assert len(res_inc_list.json()) == 1
    print("  [SUCCESS] Income endpoints verified.")

    # 4. Expense Page Integration (/expenses)
    print("--------------------------------------------------")
    print("[4/6] Testing Expense Page API Integration...")
    exp_payload = {"title": "Rent Payment", "category": "Housing", "amount": 1500.00, "transaction_date": str(date.today())}
    res_exp = client.post("/expenses", json=exp_payload, headers=headers)
    assert res_exp.status_code == 201

    res_exp_list = client.get("/expenses", headers=headers)
    assert res_exp_list.status_code == 200
    assert len(res_exp_list.json()) == 1
    print("  [SUCCESS] Expense endpoints verified.")

    # 5. Budget Page Integration (/budgets)
    print("--------------------------------------------------")
    print("[5/6] Testing Budget Page API Integration...")
    bgt_payload = {"category": "Housing", "monthly_limit": 1800.00, "month": date.today().month, "year": date.today().year}
    res_bgt = client.post("/budgets", json=bgt_payload, headers=headers)
    assert res_bgt.status_code == 201

    res_bgt_list = client.get("/budgets", headers=headers)
    assert res_bgt_list.status_code == 200
    assert len(res_bgt_list.json()) == 1
    print("  [SUCCESS] Budget endpoints verified.")

    # 6. Dashboard Page Integration (/dashboard)
    print("--------------------------------------------------")
    print("[6/6] Testing Dashboard Page API Integration...")
    res_dash = client.get("/dashboard", headers=headers)
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    assert dash_data["total_income"] == 6000.00
    assert dash_data["total_expense"] == 1500.00
    assert dash_data["balance"] == 4500.00
    assert len(dash_data["category_breakdown"]) == 1
    assert len(dash_data["budget_status"]) == 1
    print("  [SUCCESS] Dashboard API summary verified.")

    print("==================================================")
    print("  ALL PHASE 5 FRONTEND INTEGRATION TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    test_frontend_integration_flow()
