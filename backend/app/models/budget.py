from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


def utc_now() -> datetime:
    """Helper to return current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Budget(Base):
    """Budget database ORM model."""
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    monthly_limit: Mapped[float] = mapped_column(Float, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )

    # Unique constraint per user, category, month, and year
    __table_args__ = (
        UniqueConstraint("user_id", "category", "month", "year", name="uq_user_category_month_year"),
    )

    # Relationship back to User
    user: Mapped["User"] = relationship("User", back_populates="budgets")

    def __repr__(self) -> str:
        return f"<Budget(id={self.id}, user_id={self.user_id}, category='{self.category}', limit={self.monthly_limit}, period={self.month}/{self.year})>"
