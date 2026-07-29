from datetime import date
from typing import Optional, List
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.income import Income
from app.models.budget import Budget
from app.schemas.dashboard import DashboardSummaryResponse, CategoryBreakdown, BudgetStatus


def calculate_dashboard_summary(
    db: Session,
    user_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None
) -> DashboardSummaryResponse:
    """
    Perform database SQL aggregation queries to compute dashboard metrics:
    - Total lifetime income
    - Total lifetime expenses
    - Current overall balance
    - Target monthly spending
    - Category-wise expense breakdown
    - Category budget usage and percentage
    """
    today = date.today()
    target_month = month if month is not None else today.month
    target_year = year if year is not None else today.year

    # 1. Total lifetime income aggregation
    total_income = db.query(
        func.coalesce(func.sum(Income.amount), 0.0)
    ).filter(Income.user_id == user_id).scalar() or 0.0

    # 2. Total lifetime expense aggregation
    total_expense = db.query(
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(Expense.user_id == user_id).scalar() or 0.0

    # 3. Current net balance
    balance = round(total_income - total_expense, 2)

    # 4. Target monthly spending aggregation
    monthly_spending = db.query(
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(
        Expense.user_id == user_id,
        extract("month", Expense.transaction_date) == target_month,
        extract("year", Expense.transaction_date) == target_year
    ).scalar() or 0.0

    # 5. Category-wise expense breakdown aggregation (for target month & year)
    category_rows = db.query(
        Expense.category,
        func.coalesce(func.sum(Expense.amount), 0.0).label("cat_total")
    ).filter(
        Expense.user_id == user_id,
        extract("month", Expense.transaction_date) == target_month,
        extract("year", Expense.transaction_date) == target_year
    ).group_by(Expense.category).all()

    category_breakdown: List[CategoryBreakdown] = []
    month_exp_total = sum(row.cat_total for row in category_rows) if category_rows else 0.0

    for cat_name, cat_amount in category_rows:
        pct = round((cat_amount / month_exp_total * 100.0), 2) if month_exp_total > 0 else 0.0
        category_breakdown.append(
            CategoryBreakdown(
                category=cat_name,
                total_amount=round(float(cat_amount), 2),
                percentage=pct
            )
        )

    # Sort category breakdown descending by total amount
    category_breakdown.sort(key=lambda x: x.total_amount, reverse=True)

    # 6. Budget status calculation for target month & year
    budgets = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.month == target_month,
        Budget.year == target_year
    ).all()

    budget_status_list: List[BudgetStatus] = []
    for b in budgets:
        # Aggregate spent amount for this category in target month/year
        spent_for_cat = db.query(
            func.coalesce(func.sum(Expense.amount), 0.0)
        ).filter(
            Expense.user_id == user_id,
            Expense.category == b.category,
            extract("month", Expense.transaction_date) == target_month,
            extract("year", Expense.transaction_date) == target_year
        ).scalar() or 0.0

        spent_val = round(float(spent_for_cat), 2)
        limit_val = round(float(b.monthly_limit), 2)
        remaining_val = round(limit_val - spent_val, 2)
        usage_pct = round((spent_val / limit_val * 100.0), 2) if limit_val > 0 else 0.0
        is_exceeded = spent_val > limit_val

        budget_status_list.append(
            BudgetStatus(
                budget_id=b.id,
                category=b.category,
                monthly_limit=limit_val,
                spent=spent_val,
                remaining=remaining_val,
                usage_percentage=usage_pct,
                is_exceeded=is_exceeded
            )
        )

    return DashboardSummaryResponse(
        total_income=round(float(total_income), 2),
        total_expense=round(float(total_expense), 2),
        balance=balance,
        monthly_spending=round(float(monthly_spending), 2),
        category_breakdown=category_breakdown,
        budget_status=budget_status_list
    )
