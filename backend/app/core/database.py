import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.core.config import settings

logger = logging.getLogger("app.core.database")

# Declarative Base class for all ORM models
class Base(DeclarativeBase):
    """Base class for SQLAlchemy declarative models."""
    pass


def create_db_engine():
    """Create SQLAlchemy engine with automatic SQLite fallback if PostgreSQL is unavailable."""
    db_url = settings.DATABASE_URL
    
    if db_url.startswith("postgresql"):
        try:
            # Test PostgreSQL connection with 2 second timeout
            test_engine = create_engine(db_url, connect_args={"connect_timeout": 2})
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            test_engine.dispose()
            logger.info("Successfully connected to PostgreSQL database.")
            return create_engine(db_url, pool_pre_ping=True)
        except Exception as e:
            logger.warning(
                "PostgreSQL server on port 5432 is not reachable (%s). "
                "Falling back to local SQLite database (expense_tracker.db).",
                str(e).split('\n')[0]
            )
            db_url = "sqlite:///./expense_tracker.db"

    # SQLite Configuration
    engine = create_engine(db_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    return engine


engine = create_db_engine()

# Auto-create tables if running on SQLite or fallback
try:
    import app.models  # Import all ORM models
    Base.metadata.create_all(bind=engine)
except Exception as err:
    logger.error("Failed to auto-initialize database tables: %s", err)

# Session factory for creating database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
