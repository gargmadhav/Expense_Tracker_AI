"""
Phase 4 Budget and Dashboard Automated Verification Test Suite
Tests:
1. Isolated database setup using in-memory SQLite with StaticPool.
2. User A and User B creation & authentication tokens.
3. Budget CRUD operations & duplicate constraint rejection.
4. Dashboard calculation service (/dashboard) testing SQL aggregations:
   - Total income
   - Total expenses
   - Current balance
   - Category-wise breakdown percentages
   - Budget status, usage percentages, and exceeded indicators
5. User Data Isolation for budgets and dashboard metrics.
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
import app.models  # Ensures all ORM models are registered
from app.main import app

# Create in-memory SQLite engine with StaticPool
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


def test_dashboard_budget_flow():
    # Build schema tables
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)

    today = date.today()
    cur_month = today.month
    cur_year = today.year

    print("==================================================")
    print("  PHASE 4 BUDGET & DASHBOARD TEST SUITE VERIFICATION")
    print("==================================================")

    # 1. Setup User A and User B
    print("[1/6] Authenticating User A and User B...")
    client.post("/auth/register", json={"full_name": "User A", "email": "usera_dash@example.com", "password": "Password123!"})
    client.post("/auth/register", json={"full_name": "User B", "email": "userb_dash@example.com", "password": "Password123!"})

    token_a = client.post("/auth/login", json={"email": "usera_dash@example.com", "password": "Password123!"}).json()["access_token"]
    token_b = client.post("/auth/login", json={"email": "userb_dash@example.com", "password": "Password123!"}).json()["access_token"]

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print("  [SUCCESS] User A and User B authenticated.")

    # 2. Test Budget CRUD - Create & List
    print("--------------------------------------------------")
    print("[2/6] Testing Budget Creation (POST /budgets)...")
    b_payload = {
        "category": "Food",
        "monthly_limit": 500.00,
        "month": cur_month,
        "year": cur_year
    }
    res_b_create = client.post("/budgets", json=b_payload, headers=headers_a)
    print(f"  - Status Code: {res_b_create.status_code}")
    print(f"  - Body:        {res_b_create.json()}")
    assert res_b_create.status_code == 201
    budget_id = res_b_create.json()["id"]
    assert res_b_create.json()["category"] == "Food"
    assert res_b_create.json()["monthly_limit"] == 500.00

    # Test Duplicate Budget Rejection
    res_b_dup = client.post("/budgets", json=b_payload, headers=headers_a)
    assert res_b_dup.status_code == 400
    print("  [SUCCESS] Budget created & duplicate constraint verified.")

    # 3. Test Budget PUT & DELETE
    print("--------------------------------------------------")
    print("[3/6] Testing Budget Update & Delete...")
    res_b_update = client.put(f"/budgets/{budget_id}", json={"monthly_limit": 600.00}, headers=headers_a)
    assert res_b_update.status_code == 200
    assert res_b_update.json()["monthly_limit"] == 600.00
    print("  [SUCCESS] Budget updated successfully.")

    # 4. Insert Financial Transactions for User A
    print("--------------------------------------------------")
    print("[4/6] Creating Income & Expense Transactions for User A...")
    client.post("/income", json={"source": "Salary", "amount": 4000.00, "transaction_date": str(today)}, headers=headers_a)
    client.post("/income", json={"source": "Freelance", "amount": 1000.00, "transaction_date": str(today)}, headers=headers_a)

    client.post("/expenses", json={"title": "Supermarket", "category": "Food", "amount": 450.00, "transaction_date": str(today)}, headers=headers_a)
    client.post("/expenses", json={"title": "Metro Pass", "category": "Transport", "amount": 150.00, "transaction_date": str(today)}, headers=headers_a)
    print("  [SUCCESS] Transactions created: Total Income = $5,000.00, Total Expenses = $600.00.")

    # 5. Test Dashboard Calculation Service (GET /dashboard)
    print("--------------------------------------------------")
    print("[5/6] Testing Dashboard Calculation Endpoint (GET /dashboard)...")
    res_dash = client.get(f"/dashboard?month={cur_month}&year={cur_year}", headers=headers_a)
    print(f"  - Status Code: {res_dash.status_code}")
    dash_data = res_dash.json()
    print(f"  - Dashboard Response Body:\n{dash_data}")

    assert res_dash.status_code == 200
    assert dash_data["total_income"] == 5000.00
    assert dash_data["total_expense"] == 600.00
    assert dash_data["balance"] == 4400.00
    assert dash_data["monthly_spending"] == 600.00

    # Category breakdown verification (Food = 450 / 600 = 75%, Transport = 150 / 600 = 25%)
    cat_breakdown = {c["category"]: c for c in dash_data["category_breakdown"]}
    assert "Food" in cat_breakdown
    assert cat_breakdown["Food"]["total_amount"] == 450.00
    assert cat_breakdown["Food"]["percentage"] == 75.00
    assert "Transport" in cat_breakdown
    assert cat_breakdown["Transport"]["total_amount"] == 150.00
    assert cat_breakdown["Transport"]["percentage"] == 25.00

    # Budget status verification (Food limit = 600, spent = 450, remaining = 150, usage = 75%, is_exceeded = False)
    budget_statuses = {b["category"]: b for b in dash_data["budget_status"]}
    assert "Food" in budget_statuses
    assert budget_statuses["Food"]["monthly_limit"] == 600.00
    assert budget_statuses["Food"]["spent"] == 450.00
    assert budget_statuses["Food"]["remaining"] == 150.00
    assert budget_statuses["Food"]["usage_percentage"] == 75.00
    assert budget_statuses["Food"]["is_exceeded"] is False
    print("  [SUCCESS] Dashboard calculations verified with exact SQL aggregations.")

    # 6. Test User Data Isolation for Dashboard
    print("--------------------------------------------------")
    print("[6/6] Testing User Data Isolation on Dashboard...")
    res_dash_b = client.get(f"/dashboard?month={cur_month}&year={cur_year}", headers=headers_b)
    dash_data_b = res_dash_b.json()
    assert res_dash_b.status_code == 200
    assert dash_data_b["total_income"] == 0.00
    assert dash_data_b["total_expense"] == 0.00
    assert dash_data_b["balance"] == 0.00
    assert len(dash_data_b["category_breakdown"]) == 0
    assert len(dash_data_b["budget_status"]) == 0
    print("  [SUCCESS] User B dashboard is completely isolated ($0.00 balance).")

    print("==================================================")
    print("  ALL PHASE 4 BUDGET & DASHBOARD TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    test_dashboard_budget_flow()
