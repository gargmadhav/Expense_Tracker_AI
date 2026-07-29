from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.routers.deps import get_current_user
from app.services.notification import check_budget_limits_and_notify

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new expense entry"
)
def create_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new expense associated with the authenticated user and check budget caps."""
    new_expense = Expense(
        user_id=current_user.id,
        title=expense_in.title,
        category=expense_in.category,
        amount=expense_in.amount,
        description=expense_in.description,
        transaction_date=expense_in.transaction_date
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    # Check budget thresholds and auto-generate notifications if needed
    try:
        check_budget_limits_and_notify(
            db,
            user_id=current_user.id,
            category=new_expense.category,
            transaction_date=new_expense.transaction_date
        )
    except Exception as e:
        # Don't fail expense creation if notification generation encounters an issue
        pass

    return new_expense


@router.get(
    "",
    response_model=List[ExpenseResponse],
    summary="List all expenses of current authenticated user"
)
def get_expenses(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(100, ge=1, le=500, description="Number of expenses to fetch"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch expenses owned exclusively by the authenticated user."""
    query = db.query(Expense).filter(Expense.user_id == current_user.id)
    if category:
        query = query.filter(Expense.category == category)
    
    expenses = query.order_by(Expense.transaction_date.desc(), Expense.id.desc()).offset(offset).limit(limit).all()
    return expenses


@router.get(
    "/{expense_id}",
    response_model=ExpenseResponse,
    summary="Get a specific expense by ID"
)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific expense record owned by the authenticated user."""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense item not found or unauthorized access"
        )

    return expense


@router.put(
    "/{expense_id}",
    response_model=ExpenseResponse,
    summary="Update an existing expense by ID"
)
def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update fields of an existing expense owned by the authenticated user."""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense item not found or unauthorized access"
        )

    update_data = expense_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)

    try:
        check_budget_limits_and_notify(
            db,
            user_id=current_user.id,
            category=expense.category,
            transaction_date=expense.transaction_date
        )
    except Exception:
        pass

    return expense


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an expense by ID"
)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an expense record owned by the authenticated user."""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense item not found or unauthorized access"
        )

    db.delete(expense)
    db.commit()
    return None
