from typing import List
from pydantic import BaseModel, ConfigDict


class CategoryBreakdown(BaseModel):
    """Schema for category-wise expense breakdown."""
    category: str
    total_amount: float
    percentage: float


class BudgetStatus(BaseModel):
    """Schema for budget usage status."""
    budget_id: int
    category: str
    monthly_limit: float
    spent: float
    remaining: float
    usage_percentage: float
    is_exceeded: bool


class DashboardSummaryResponse(BaseModel):
    """Schema for overall financial dashboard calculations."""
    total_income: float
    total_expense: float
    balance: float
    monthly_spending: float
    category_breakdown: List[CategoryBreakdown]
    budget_status: List[BudgetStatus]

    model_config = ConfigDict(from_attributes=True)
