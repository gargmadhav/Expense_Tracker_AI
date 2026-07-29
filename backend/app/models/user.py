from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.expense import Expense
    from app.models.income import Income
    from app.models.budget import Budget
    from app.models.notification import Notification


def utc_now() -> datetime:
    """Helper to return current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    """User database ORM model."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False
    )

    # Relationships
    expenses: Mapped[List["Expense"]] = relationship(
        "Expense",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    income_records: Mapped[List["Income"]] = relationship(
        "Income",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    budgets: Mapped[List["Budget"]] = relationship(
        "Budget",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', full_name='{self.full_name}')>"
