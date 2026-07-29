from typing import List, Dict
from pydantic import BaseModel, ConfigDict


class MonthlyComparisonPoint(BaseModel):
    month: int
    month_name: str
    total_income: float
    total_expense: float
    net_savings: float


class MonthlyAnalyticsResponse(BaseModel):
    year: int
    total_annual_income: float
    total_annual_expense: float
    net_annual_savings: float
    monthly_data: List[MonthlyComparisonPoint]

    model_config = ConfigDict(from_attributes=True)


class CategoryAnalysisPoint(BaseModel):
    category: str
    total_amount: float
    percentage: float
    transaction_count: int


class CategoryAnalyticsResponse(BaseModel):
    month: int
    year: int
    total_expense: float
    categories: List[CategoryAnalysisPoint]

    model_config = ConfigDict(from_attributes=True)


class SpendingTrendPoint(BaseModel):
    period: str  # e.g., "Jan 2026", "Feb 2026"
    income: float
    expense: float
    savings_rate: float


class TrendsAnalyticsResponse(BaseModel):
    months_limit: int
    trends: List[SpendingTrendPoint]
    average_monthly_expense: float
    average_monthly_income: float

    model_config = ConfigDict(from_attributes=True)
