"""
Phase 2 Authentication Automated Verification Test Suite
Tests:
1. Database setup with SQLite in-memory engine (with StaticPool) for fast isolated testing.
2. User registration (/auth/register).
3. Duplicate email prevention.
4. Password validation rules (min 8 chars).
5. User login & JWT token issuance (/auth/login).
6. Incorrect credentials rejection.
7. Protected endpoint access with valid Bearer token (/auth/me).
8. Protected endpoint rejection with invalid or expired tokens.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.database import get_db, Base
import app.models  # Ensures all ORM models are registered
from app.models.user import User
from app.main import app

# Create in-memory SQLite database engine with StaticPool to persist schema across threads
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


# Override global get_db dependency to use in-memory SQLite test database
app.dependency_overrides[get_db] = override_get_db


def test_auth_flow():
    # Create tables in persistent in-memory test database
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)

    print("==================================================")
    print("  PHASE 2 AUTHENTICATION TEST SUITE VERIFICATION")
    print("==================================================")

    # 1. Test Registration - Success
    print("[1/7] Testing User Registration (/auth/register)...")
    reg_payload = {
        "full_name": "Test User",
        "email": "testuser@example.com",
        "password": "Password123!"
    }
    response = client.post("/auth/register", json=reg_payload)
    print(f"  - Response status: {response.status_code}")
    print(f"  - Response body:   {response.json()}")
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    user_data = response.json()
    assert user_data["email"] == "testuser@example.com"
    assert user_data["full_name"] == "Test User"
    assert "hashed_password" not in user_data
    assert "id" in user_data
    print("  [SUCCESS] User registration passed.")

    # 2. Test Registration - Duplicate Email
    print("--------------------------------------------------")
    print("[2/7] Testing Duplicate Email Registration...")
    response_dup = client.post("/auth/register", json=reg_payload)
    print(f"  - Response status: {response_dup.status_code}")
    print(f"  - Response body:   {response_dup.json()}")
    assert response_dup.status_code == 400, f"Expected 400, got {response_dup.status_code}"
    print("  [SUCCESS] Duplicate email rejected correctly.")

    # 3. Test Registration - Weak Password (< 8 chars)
    print("--------------------------------------------------")
    print("[3/7] Testing Weak Password Validation...")
    weak_payload = {
        "full_name": "Weak User",
        "email": "weak@example.com",
        "password": "short"
    }
    response_weak = client.post("/auth/register", json=weak_payload)
    print(f"  - Response status: {response_weak.status_code}")
    assert response_weak.status_code == 422, f"Expected 422, got {response_weak.status_code}"
    print("  [SUCCESS] Weak password rejected correctly with HTTP 422.")

    # 4. Test Login - Success & JWT Token Generation
    print("--------------------------------------------------")
    print("[4/7] Testing User Login (/auth/login)...")
    login_payload = {
        "email": "testuser@example.com",
        "password": "Password123!"
    }
    response_login = client.post("/auth/login", json=login_payload)
    print(f"  - Response status: {response_login.status_code}")
    print(f"  - Response body:   {response_login.json()}")
    assert response_login.status_code == 200, f"Expected 200, got {response_login.status_code}"
    token_data = response_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    access_token = token_data["access_token"]
    print("  [SUCCESS] Login returned valid Bearer access token.")

    # 5. Test Login - Invalid Credentials
    print("--------------------------------------------------")
    print("[5/7] Testing Login with Invalid Password...")
    bad_login_payload = {
        "email": "testuser@example.com",
        "password": "WrongPassword!"
    }
    response_bad_login = client.post("/auth/login", json=bad_login_payload)
    print(f"  - Response status: {response_bad_login.status_code}")
    assert response_bad_login.status_code == 401, f"Expected 401, got {response_bad_login.status_code}"
    print("  [SUCCESS] Invalid credentials rejected correctly with HTTP 401.")

    # 6. Test Protected Route - /auth/me with Valid Token
    print("--------------------------------------------------")
    print("[6/7] Testing Protected Route (/auth/me) with Valid Token...")
    headers = {"Authorization": f"Bearer {access_token}"}
    response_me = client.get("/auth/me", headers=headers)
    print(f"  - Response status: {response_me.status_code}")
    print(f"  - Response body:   {response_me.json()}")
    assert response_me.status_code == 200, f"Expected 200, got {response_me.status_code}"
    me_data = response_me.json()
    assert me_data["email"] == "testuser@example.com"
    assert me_data["full_name"] == "Test User"
    print("  [SUCCESS] Protected endpoint returned authenticated user profile.")

    # 7. Test Protected Route - /auth/me with Invalid Token
    print("--------------------------------------------------")
    print("[7/7] Testing Protected Route (/auth/me) with Invalid Token...")
    bad_headers = {"Authorization": "Bearer invalid_fake_token_12345"}
    response_invalid_me = client.get("/auth/me", headers=bad_headers)
    print(f"  - Response status: {response_invalid_me.status_code}")
    assert response_invalid_me.status_code == 401, f"Expected 401, got {response_invalid_me.status_code}"
    print("  [SUCCESS] Invalid token rejected with HTTP 401.")

    print("==================================================")
    print("  ALL PHASE 2 AUTHENTICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    test_auth_flow()
