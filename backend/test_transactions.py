"""
Phase 3 Expense and Income Modules Automated Verification Test Suite
Tests:
1. Isolated database setup using in-memory SQLite with StaticPool.
2. Two test users creation & authentication tokens (User A & User B).
3. Expense CRUD operations for User A.
4. Income CRUD operations for User A.
5. Amount validations (negative / zero amounts rejected with HTTP 422).
6. User Data Isolation verification (User B cannot access or modify User A's data).
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


def test_transactions_flow():
    # Build schema tables
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)

    print("==================================================")
    print("  PHASE 3 EXPENSE & INCOME MODULES VERIFICATION")
    print("==================================================")

    # 1. Setup User A and User B
    print("[1/8] Registering & Authenticating User A and User B...")
    user_a_payload = {"full_name": "User A", "email": "usera@example.com", "password": "Password123!"}
    user_b_payload = {"full_name": "User B", "email": "userb@example.com", "password": "Password123!"}

    client.post("/auth/register", json=user_a_payload)
    client.post("/auth/register", json=user_b_payload)

    token_a = client.post("/auth/login", json={"email": "usera@example.com", "password": "Password123!"}).json()["access_token"]
    token_b = client.post("/auth/login", json={"email": "userb@example.com", "password": "Password123!"}).json()["access_token"]

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print("  [SUCCESS] User A and User B created and authenticated.")

    # 2. Test Expense Creation
    print("--------------------------------------------------")
    print("[2/8] Testing Expense Creation (POST /expenses)...")
    exp_payload = {
        "title": "Groceries",
        "category": "Food",
        "amount": 150.75,
        "description": "Weekly grocery shopping",
        "transaction_date": str(date.today())
    }
    res_create_exp = client.post("/expenses", json=exp_payload, headers=headers_a)
    print(f"  - Status Code: {res_create_exp.status_code}")
    print(f"  - Body:        {res_create_exp.json()}")
    assert res_create_exp.status_code == 201
    exp_id = res_create_exp.json()["id"]
    assert res_create_exp.json()["title"] == "Groceries"
    assert res_create_exp.json()["amount"] == 150.75
    print("  [SUCCESS] Expense created successfully.")

    # 3. Test Expense Fetching & Updating
    print("--------------------------------------------------")
    print("[3/8] Testing Expense GET & PUT...")
    res_get_exp = client.get(f"/expenses/{exp_id}", headers=headers_a)
    assert res_get_exp.status_code == 200

    update_payload = {"amount": 175.50, "description": "Updated grocery total"}
    res_put_exp = client.put(f"/expenses/{exp_id}", json=update_payload, headers=headers_a)
    print(f"  - PUT Status Code: {res_put_exp.status_code}")
    print(f"  - PUT Body:        {res_put_exp.json()}")
    assert res_put_exp.status_code == 200
    assert res_put_exp.json()["amount"] == 175.50
    print("  [SUCCESS] Expense updated successfully.")

    # 4. Test Income Creation & Fetching
    print("--------------------------------------------------")
    print("[4/8] Testing Income Creation & GET (POST/GET /income)...")
    inc_payload = {
        "source": "Software Salary",
        "amount": 5000.00,
        "description": "Monthly paycheck",
        "transaction_date": str(date.today())
    }
    res_create_inc = client.post("/income", json=inc_payload, headers=headers_a)
    print(f"  - Status Code: {res_create_inc.status_code}")
    print(f"  - Body:        {res_create_inc.json()}")
    assert res_create_inc.status_code == 201
    inc_id = res_create_inc.json()["id"]

    res_list_inc = client.get("/income", headers=headers_a)
    assert res_list_inc.status_code == 200
    assert len(res_list_inc.json()) == 1
    print("  [SUCCESS] Income created and listed successfully.")

    # 5. Test Income Update & Delete
    print("--------------------------------------------------")
    print("[5/8] Testing Income PUT & DELETE...")
    res_put_inc = client.put(f"/income/{inc_id}", json={"amount": 5200.00}, headers=headers_a)
    assert res_put_inc.status_code == 200
    assert res_put_inc.json()["amount"] == 5200.00

    res_del_inc = client.delete(f"/income/{inc_id}", headers=headers_a)
    assert res_del_inc.status_code == 204
    print("  [SUCCESS] Income updated and deleted successfully.")

    # 6. Test Amount Validation (Negative Amount Rejection)
    print("--------------------------------------------------")
    print("[6/8] Testing Validation: Rejection of Negative / Zero Amounts...")
    bad_exp_payload = {"title": "Invalid", "category": "Test", "amount": -50.00, "transaction_date": str(date.today())}
    res_bad_exp = client.post("/expenses", json=bad_exp_payload, headers=headers_a)
    assert res_bad_exp.status_code == 422

    bad_inc_payload = {"source": "Invalid", "amount": 0.00, "transaction_date": str(date.today())}
    res_bad_inc = client.post("/income", json=bad_inc_payload, headers=headers_a)
    assert res_bad_inc.status_code == 422
    print("  [SUCCESS] Invalid amounts correctly rejected with HTTP 422.")

    # 7. Test User Data Isolation (User B accessing User A's data)
    print("--------------------------------------------------")
    print("[7/8] Testing User Data Isolation (User B cannot access User A's expense)...")
    res_user_b_get = client.get(f"/expenses/{exp_id}", headers=headers_b)
    print(f"  - User B GET status code: {res_user_b_get.status_code}")
    assert res_user_b_get.status_code == 404

    res_user_b_put = client.put(f"/expenses/{exp_id}", json={"amount": 9999.99}, headers=headers_b)
    assert res_user_b_put.status_code == 404

    res_user_b_del = client.delete(f"/expenses/{exp_id}", headers=headers_b)
    assert res_user_b_del.status_code == 404

    res_user_b_list = client.get("/expenses", headers=headers_b)
    assert len(res_user_b_list.json()) == 0
    print("  [SUCCESS] User B completely isolated from User A's transactions.")

    # 8. Test Expense Deletion
    print("--------------------------------------------------")
    print("[8/8] Testing Expense Deletion (DELETE /expenses/{id})...")
    res_del_exp = client.delete(f"/expenses/{exp_id}", headers=headers_a)
    assert res_del_exp.status_code == 204

    res_get_deleted = client.get(f"/expenses/{exp_id}", headers=headers_a)
    assert res_get_deleted.status_code == 404
    print("  [SUCCESS] Expense deleted successfully.")

    print("==================================================")
    print("  ALL PHASE 3 TRANSACTION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    test_transactions_flow()
