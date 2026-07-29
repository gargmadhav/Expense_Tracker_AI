from datetime import date
import logging
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.budget import Budget
from app.models.expense import Expense

logger = logging.getLogger("app.services.notification")


def create_notification(db: Session, user_id: int, message: str, type: str = "info") -> Notification:
    """Helper to create and persist a new notification for a user."""
    notif = Notification(
        user_id=user_id,
        message=message,
        type=type,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    logger.info(f"Created notification [ID: {notif.id}, Type: {type}] for user {user_id}")
    return notif


def check_budget_limits_and_notify(db: Session, user_id: int, category: str, transaction_date: date) -> None:
    """Checks category spending against monthly budget cap and generates warning/exceeded notifications."""
    month = transaction_date.month
    year = transaction_date.year

    # Find budget for category in month/year
    budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.category == category,
        Budget.month == month,
        Budget.year == year
    ).first()

    if not budget or budget.monthly_limit <= 0:
        return

    # Calculate total category spent for month
    spent_query = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
        Expense.user_id == user_id,
        Expense.category == category,
        extract("month", Expense.transaction_date) == month,
        extract("year", Expense.transaction_date) == year
    ).scalar()

    total_spent = float(spent_query)
    limit = float(budget.monthly_limit)
    usage_pct = (total_spent / limit) * 100.0

    if total_spent > limit:
        msg = f"Budget Exceeded: You have exceeded your {category} budget! Spent: ${total_spent:.2f} / Limit: ${limit:.2f} ({usage_pct:.1f}%)"
        # Check if identical message already sent today to prevent duplicate spam
        existing = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type == "budget_exceeded",
            Notification.message == msg
        ).first()
        if not existing:
            create_notification(db, user_id, msg, type="budget_exceeded")

    elif usage_pct >= 85.0:
        msg = f"Budget Warning: You have used {usage_pct:.1f}% of your {category} budget. Spent: ${total_spent:.2f} / Limit: ${limit:.2f}"
        existing = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type == "budget_warning",
            Notification.message == msg
        ).first()
        if not existing:
            create_notification(db, user_id, msg, type="budget_warning")
