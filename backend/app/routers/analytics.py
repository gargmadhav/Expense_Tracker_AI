from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.analytics import (
    MonthlyAnalyticsResponse,
    CategoryAnalyticsResponse,
    TrendsAnalyticsResponse
)
from app.services.analytics import (
    get_monthly_comparison,
    get_category_analysis,
    get_spending_trends
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/monthly",
    response_model=MonthlyAnalyticsResponse,
    summary="Get monthly income vs expense comparison"
)
def get_monthly_analytics_endpoint(
    year: Optional[int] = Query(None, description="Target year for comparison"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve monthly breakdown of income, expense, and net savings for the specified year."""
    return get_monthly_comparison(db, user_id=current_user.id, year=year)


@router.get(
    "/categories",
    response_model=CategoryAnalyticsResponse,
    summary="Get category-wise spending breakdown and share"
)
def get_category_analytics_endpoint(
    month: Optional[int] = Query(None, ge=1, le=12, description="Target month (1-12)"),
    year: Optional[int] = Query(None, description="Target year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve category-wise expense distribution and percentage breakdown."""
    return get_category_analysis(db, user_id=current_user.id, month=month, year=year)


@router.get(
    "/trends",
    response_model=TrendsAnalyticsResponse,
    summary="Get historical spending & income trends"
)
def get_trends_analytics_endpoint(
    limit: int = Query(6, ge=1, le=24, description="Number of past months to include"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve rolling spending and income trends over recent months."""
    return get_spending_trends(db, user_id=current_user.id, months_limit=limit)
