"""
Phase 6 Advanced Backend Improvements Verification Test Suite
Tests:
1. Middleware execution: X-Process-Time and Security Headers.
2. Analytics APIs: /analytics/monthly, /analytics/categories, /analytics/trends.
3. Notification engine: Auto budget warning/exceeded trigger on expense creation.
4. Notification CRUD: List notifications, mark single as read, mark all as read.
"""
import sys
from pathlib import Path

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


def test_advanced_improvements_suite():
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)

    print("==================================================")
    print("  PHASE 6 ADVANCED BACKEND VERIFICATION SUITE")
    print("==================================================")

    # 1. Register and Login User
    print("[1/5] Registering user & obtaining JWT...")
    client.post("/auth/register", json={
        "full_name": "Analytics User",
        "email": "analytics@example.com",
        "password": "Password123!"
    })
    res_login = client.post("/auth/login", json={
        "email": "analytics@example.com",
        "password": "Password123!"
    })
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check Middleware Headers (Timing & Security)
    print("--------------------------------------------------")
    print("[2/5] Testing Request Timing & Security Middlewares...")
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert "x-process-time" in res_health.headers
    assert res_health.headers["x-content-type-options"] == "nosniff"
    assert res_health.headers["x-frame-options"] == "DENY"
    assert res_health.headers["x-xss-protection"] == "1; mode=block"
    print("  [SUCCESS] Middleware timing and security headers verified.")

    # 3. Seed Income, Expense, and Budget Data
    print("--------------------------------------------------")
    print("[3/5] Seeding Income, Expense & Budget Data...")
    today = date.today()
    client.post("/income", json={"source": "Salary", "amount": 5000.00, "transaction_date": str(today)}, headers=headers)
    client.post("/budgets", json={"category": "Groceries", "monthly_limit": 400.00, "month": today.month, "year": today.year}, headers=headers)
    
    # Expense 1: Below cap ($200 / $400) -> 50%
    client.post("/expenses", json={"title": "Weekly Market", "category": "Groceries", "amount": 200.00, "transaction_date": str(today)}, headers=headers)
    
    # Expense 2: Exceeds cap ($250 more -> $450 / $400) -> 112.5%
    client.post("/expenses", json={"title": "Bulk Groceries", "category": "Groceries", "amount": 250.00, "transaction_date": str(today)}, headers=headers)
    print("  [SUCCESS] Financial records & budget cap initialized.")

    # 4. Verify Analytics APIs
    print("--------------------------------------------------")
    print("[4/5] Testing Analytics APIs (/monthly, /categories, /trends)...")
    
    # GET /analytics/monthly
    res_monthly = client.get("/analytics/monthly", headers=headers)
    assert res_monthly.status_code == 200
    monthly_data = res_monthly.json()
    assert monthly_data["total_annual_income"] == 5000.00
    assert monthly_data["total_annual_expense"] == 450.00
    assert len(monthly_data["monthly_data"]) == 12

    # GET /analytics/categories
    res_cat = client.get("/analytics/categories", headers=headers)
    assert res_cat.status_code == 200
    cat_data = res_cat.json()
    assert cat_data["total_expense"] == 450.00
    assert len(cat_data["categories"]) == 1
    assert cat_data["categories"][0]["category"] == "Groceries"
    assert cat_data["categories"][0]["percentage"] == 100.0

    # GET /analytics/trends
    res_trends = client.get("/analytics/trends?limit=6", headers=headers)
    assert res_trends.status_code == 200
    trends_data = res_trends.json()
    assert trends_data["months_limit"] == 6
    assert len(trends_data["trends"]) == 6
    print("  [SUCCESS] All Analytics calculations verified.")

    # 5. Verify Notifications API & Auto Budget Warning Trigger
    print("--------------------------------------------------")
    print("[5/5] Testing Notifications API & Auto Trigger...")
    res_notifs = client.get("/notifications", headers=headers)
    assert res_notifs.status_code == 200
    notifs = res_notifs.json()
    assert len(notifs) >= 1
    assert any(n["type"] == "budget_exceeded" for n in notifs)

    notif_id = notifs[0]["id"]

    # Mark single notification read
    res_read = client.put(f"/notifications/{notif_id}/read", headers=headers)
    assert res_read.status_code == 200
    assert res_read.json()["is_read"] is True

    # Mark all read
    res_read_all = client.put("/notifications/read-all", headers=headers)
    assert res_read_all.status_code == 200
    print("  [SUCCESS] Notifications engine & triggers verified.")

    print("==================================================")
    print("  ALL PHASE 6 ADVANCED IMPROVEMENTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    test_advanced_improvements_suite()
