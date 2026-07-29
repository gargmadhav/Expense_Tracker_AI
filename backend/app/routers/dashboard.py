from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard import calculate_dashboard_summary
from app.routers.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "",
    response_model=DashboardSummaryResponse,
    summary="Get real-time dashboard summary metrics"
)
def get_dashboard(
    month: Optional[int] = Query(None, ge=1, le=12, description="Target month (default: current month)"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Target year (default: current year)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return calculated financial metrics for authenticated user:
    - Total income
    - Total expenses
    - Net balance
    - Monthly spending
    - Category-wise expense breakdown
    - Budget usage status and percentages
    """
    summary = calculate_dashboard_summary(
        db=db,
        user_id=current_user.id,
        month=month,
        year=year
    )
    return summary
