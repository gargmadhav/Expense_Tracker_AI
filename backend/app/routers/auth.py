from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.schemas.token import TokenResponse
from app.routers.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with full name, email, and password."""
    # Check if user with given email already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Hash the password using bcrypt
    hashed_pwd = get_password_hash(user_in.password)

    # Create new User model instance
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hashed_pwd
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login user and issue JWT access token"
)
def login_user(user_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user credentials and return a signed JWT access token."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    if not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    # Generate JWT access token
    access_token = create_access_token(
        subject=user.id,
        user_id=user.id,
        email=user.email
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile"
)
def get_me(current_user: User = Depends(get_current_user)):
    """Return profile details for the currently authenticated user."""
    return current_user
