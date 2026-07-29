from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.income import Income
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse
from app.routers.deps import get_current_user

router = APIRouter(prefix="/income", tags=["Income"])


@router.post(
    "",
    response_model=IncomeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new income entry"
)
def create_income(
    income_in: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new income record associated with the authenticated user."""
    new_income = Income(
        user_id=current_user.id,
        source=income_in.source,
        amount=income_in.amount,
        description=income_in.description,
        transaction_date=income_in.transaction_date
    )
    db.add(new_income)
    db.commit()
    db.refresh(new_income)
    return new_income


@router.get(
    "",
    response_model=List[IncomeResponse],
    summary="List all income records of current authenticated user"
)
def get_income_records(
    source: Optional[str] = Query(None, description="Filter by income source"),
    limit: int = Query(100, ge=1, le=500, description="Number of income records to fetch"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch income records owned exclusively by the authenticated user."""
    query = db.query(Income).filter(Income.user_id == current_user.id)
    if source:
        query = query.filter(Income.source == source)

    records = query.order_by(Income.transaction_date.desc(), Income.id.desc()).offset(offset).limit(limit).all()
    return records


@router.get(
    "/{income_id}",
    response_model=IncomeResponse,
    summary="Get a specific income record by ID"
)
def get_income_record(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific income record owned by the authenticated user."""
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()

    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income record not found or unauthorized access"
        )

    return income


@router.put(
    "/{income_id}",
    response_model=IncomeResponse,
    summary="Update an existing income record by ID"
)
def update_income_record(
    income_id: int,
    income_in: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update fields of an existing income record owned by the authenticated user."""
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()

    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income record not found or unauthorized access"
        )

    update_data = income_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(income, field, value)

    db.commit()
    db.refresh(income)
    return income


@router.delete(
    "/{income_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an income record by ID"
)
def delete_income_record(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an income record owned by the authenticated user."""
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()

    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income record not found or unauthorized access"
        )

    db.delete(income)
    db.commit()
    return None
