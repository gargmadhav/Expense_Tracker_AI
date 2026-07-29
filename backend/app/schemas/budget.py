from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


class BudgetCreate(BaseModel):
    """Schema for creating a new budget limit."""
    category: str = Field(..., min_length=1, max_length=100, description="Expense category for this budget")
    monthly_limit: float = Field(..., gt=0, description="Monthly spending limit (must be greater than 0)")
    month: int = Field(default_factory=lambda: date.today().month, ge=1, le=12, description="Target month (1-12)")
    year: int = Field(default_factory=lambda: date.today().year, ge=2000, le=2100, description="Target year")

    @field_validator("monthly_limit")
    @classmethod
    def validate_limit_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Monthly limit must be greater than 0")
        return v


class BudgetUpdate(BaseModel):
    """Schema for updating an existing budget limit."""
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    monthly_limit: Optional[float] = Field(None, gt=0)
    month: Optional[int] = Field(None, ge=1, le=12)
    year: Optional[int] = Field(None, ge=2000, le=2100)

    @field_validator("monthly_limit")
    @classmethod
    def validate_limit_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Monthly limit must be greater than 0")
        return v


class BudgetResponse(BaseModel):
    """Schema for budget response representation."""
    id: int
    user_id: int
    category: str
    monthly_limit: float
    month: int
    year: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
