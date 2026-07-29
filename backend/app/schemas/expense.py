from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ExpenseCreate(BaseModel):
    """Schema for creating a new expense."""
    title: str = Field(..., min_length=1, max_length=255, description="Title or name of the expense")
    category: str = Field(..., min_length=1, max_length=100, description="Expense category (e.g. Food, Transport, Rent)")
    amount: float = Field(..., gt=0, description="Expense amount (must be positive and greater than 0)")
    description: Optional[str] = Field(None, max_length=1000, description="Optional detailed description")
    transaction_date: date = Field(default_factory=date.today, description="Date when transaction occurred")

    @field_validator("amount")
    @classmethod
    def validate_amount_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v


class ExpenseUpdate(BaseModel):
    """Schema for updating an existing expense."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = Field(None, max_length=1000)
    transaction_date: Optional[date] = None

    @field_validator("amount")
    @classmethod
    def validate_amount_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v


class ExpenseResponse(BaseModel):
    """Schema for expense response representation."""
    id: int
    user_id: int
    title: str
    category: str
    amount: float
    description: Optional[str] = None
    transaction_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
