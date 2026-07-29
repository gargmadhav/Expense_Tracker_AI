from typing import Optional
from pydantic import BaseModel


class TokenResponse(BaseModel):
    """Schema for JWT access token responses."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Payload data extracted from decoded JWT access tokens."""
    sub: Optional[str] = None
    user_id: Optional[int] = None
    email: Optional[str] = None
