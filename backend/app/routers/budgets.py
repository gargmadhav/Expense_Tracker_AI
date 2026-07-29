from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.routers.deps import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new category budget"
)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a monthly budget limit for a specific category."""
    # Check if budget for this user, category, month, and year already exists
    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category == budget_in.category,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Budget for category '{budget_in.category}' already exists for period {budget_in.month}/{budget_in.year}."
        )

    new_budget = Budget(
        user_id=current_user.id,
        category=budget_in.category,
        monthly_limit=budget_in.monthly_limit,
        month=budget_in.month,
        year=budget_in.year
    )
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    return new_budget


@router.get(
    "",
    response_model=List[BudgetResponse],
    summary="List budgets of current authenticated user"
)
def get_budgets(
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Filter by year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch budgets created by the authenticated user."""
    query = db.query(Budget).filter(Budget.user_id == current_user.id)
    if month is not None:
        query = query.filter(Budget.month == month)
    if year is not None:
        query = query.filter(Budget.year == year)

    budgets = query.order_by(Budget.year.desc(), Budget.month.desc(), Budget.category.asc()).all()
    return budgets


@router.put(
    "/{budget_id}",
    response_model=BudgetResponse,
    summary="Update an existing budget by ID"
)
def update_budget(
    budget_id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update fields of a budget owned by the authenticated user."""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget item not found or unauthorized access"
        )

    update_data = budget_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)

    db.commit()
    db.refresh(budget)
    return budget


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a budget by ID"
)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a budget owned by the authenticated user."""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget item not found or unauthorized access"
        )

    db.delete(budget)
    db.commit()
    return None
