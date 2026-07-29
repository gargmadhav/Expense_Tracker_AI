import calendar
from datetime import date
from typing import List, Optional
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.income import Income
from app.schemas.analytics import (
    MonthlyAnalyticsResponse, MonthlyComparisonPoint,
    CategoryAnalyticsResponse, CategoryAnalysisPoint,
    TrendsAnalyticsResponse, SpendingTrendPoint
)


def get_monthly_comparison(db: Session, user_id: int, year: Optional[int] = None) -> MonthlyAnalyticsResponse:
    """Calculates real monthly income vs expense comparison for a given year."""
    if not year:
        year = date.today().year

    # Aggregate monthly expenses
    expense_query = db.query(
        extract("month", Expense.transaction_date).label("month"),
        func.coalesce(func.sum(Expense.amount), 0.0).label("total_expense")
    ).filter(
        Expense.user_id == user_id,
        extract("year", Expense.transaction_date) == year
    ).group_by("month").all()

    expense_map = {int(row.month): float(row.total_expense) for row in expense_query}

    # Aggregate monthly income
    income_query = db.query(
        extract("month", Income.transaction_date).label("month"),
        func.coalesce(func.sum(Income.amount), 0.0).label("total_income")
    ).filter(
        Income.user_id == user_id,
        extract("year", Income.transaction_date) == year
    ).group_by("month").all()

    income_map = {int(row.month): float(row.total_income) for row in income_query}

    monthly_points = []
    total_annual_income = 0.0
    total_annual_expense = 0.0

    for m in range(1, 13):
        inc = income_map.get(m, 0.0)
        exp = expense_map.get(m, 0.0)
        net = inc - exp
        total_annual_income += inc
        total_annual_expense += exp

        monthly_points.append(MonthlyComparisonPoint(
            month=m,
            month_name=calendar.month_abbr[m],
            total_income=round(inc, 2),
            total_expense=round(exp, 2),
            net_savings=round(net, 2)
        ))

    return MonthlyAnalyticsResponse(
        year=year,
        total_annual_income=round(total_annual_income, 2),
        total_annual_expense=round(total_annual_expense, 2),
        net_annual_savings=round(total_annual_income - total_annual_expense, 2),
        monthly_data=monthly_points
    )


def get_category_analysis(db: Session, user_id: int, month: Optional[int] = None, year: Optional[int] = None) -> CategoryAnalyticsResponse:
    """Calculates category spending breakdown and percentage allocation."""
    today = date.today()
    if not month:
        month = today.month
    if not year:
        year = today.year

    # Aggregate spending by category
    query = db.query(
        Expense.category.label("category"),
        func.coalesce(func.sum(Expense.amount), 0.0).label("total_amount"),
        func.count(Expense.id).label("transaction_count")
    ).filter(
        Expense.user_id == user_id,
        extract("month", Expense.transaction_date) == month,
        extract("year", Expense.transaction_date) == year
    ).group_by(Expense.category).all()

    total_expense = sum(float(row.total_amount) for row in query)

    categories = []
    for row in query:
        amt = float(row.total_amount)
        pct = (amt / total_expense * 100.0) if total_expense > 0 else 0.0
        categories.append(CategoryAnalysisPoint(
            category=row.category,
            total_amount=round(amt, 2),
            percentage=round(pct, 1),
            transaction_count=row.transaction_count
        ))

    # Sort categories by total amount descending
    categories.sort(key=lambda x: x.total_amount, reverse=True)

    return CategoryAnalyticsResponse(
        month=month,
        year=year,
        total_expense=round(total_expense, 2),
        categories=categories
    )


def get_spending_trends(db: Session, user_id: int, months_limit: int = 6) -> TrendsAnalyticsResponse:
    """Computes historical spending & income trends over recent months."""
    today = date.today()
    trend_points = []
    total_exp_sum = 0.0
    total_inc_sum = 0.0

    # Calculate past N months
    for i in range(months_limit - 1, -1, -1):
        # Determine target month/year
        target_month = today.month - i
        target_year = today.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1

        # Sum expense
        exp_val = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
            Expense.user_id == user_id,
            extract("month", Expense.transaction_date) == target_month,
            extract("year", Expense.transaction_date) == target_year
        ).scalar()

        # Sum income
        inc_val = db.query(func.coalesce(func.sum(Income.amount), 0.0)).filter(
            Income.user_id == user_id,
            extract("month", Income.transaction_date) == target_month,
            extract("year", Income.transaction_date) == target_year
        ).scalar()

        exp = float(exp_val or 0.0)
        inc = float(inc_val or 0.0)
        total_exp_sum += exp
        total_inc_sum += inc

        savings_rate = ((inc - exp) / inc * 100.0) if inc > 0 else 0.0

        period_label = f"{calendar.month_abbr[target_month]} {target_year}"
        trend_points.append(SpendingTrendPoint(
            period=period_label,
            income=round(inc, 2),
            expense=round(exp, 2),
            savings_rate=round(savings_rate, 1)
        ))

    avg_exp = total_exp_sum / months_limit if months_limit > 0 else 0.0
    avg_inc = total_inc_sum / months_limit if months_limit > 0 else 0.0

    return TrendsAnalyticsResponse(
        months_limit=months_limit,
        trends=trend_points,
        average_monthly_expense=round(avg_exp, 2),
        average_monthly_income=round(avg_inc, 2)
    )
