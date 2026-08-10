from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


class IncomeCreate(BaseModel):
    """Schema for creating a new income record."""
    source: str = Field(..., min_length=1, max_length=255, description="Source of income (e.g. Salary, Freelance, Investment)")
    amount: float = Field(..., gt=0, description="Income amount (must be positive and greater than 0)")
    currency: Optional[str] = Field("USD", max_length=10, description="Input currency ISO code (e.g. USD, INR, EUR, GBP)")
    description: Optional[str] = Field(None, max_length=1000, description="Optional detailed description")
    transaction_date: date = Field(default_factory=date.today, description="Date when income was received")

    @field_validator("amount")
    @classmethod
    def validate_amount_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v


class IncomeUpdate(BaseModel):
    """Schema for updating an existing income record."""
    source: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=10)
    description: Optional[str] = Field(None, max_length=1000)
    transaction_date: Optional[date] = None

    @field_validator("amount")
    @classmethod
    def validate_amount_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v


class IncomeResponse(BaseModel):
    """Schema for income response representation."""
    id: int
    user_id: int
    source: str
    amount: float
    currency: str = "USD"
    original_amount: Optional[float] = None
    exchange_rate: Optional[float] = 1.0
    description: Optional[str] = None
    transaction_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
