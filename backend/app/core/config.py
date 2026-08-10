from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the base directory (backend folder)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application settings derived from environment variables."""

    # Project metadata
    PROJECT_NAME: str = "Smart Expense Tracker AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database Settings
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/expense_tracker_db"

    # Security & Auth Settings
    SECRET_KEY: str = "dev_secret_key_change_in_production_9f8e7d6c5b4a3210"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Groq LLM API Settings
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # OCR Settings
    TESSERACT_CMD_PATH: str | None = None
    ALLOWED_OCR_EXTENSIONS: list[str] = ["png", "jpg", "jpeg", "webp", "pdf", "bmp", "tiff"]
    MAX_OCR_FILE_SIZE_MB: int = 10

    # Environment
    ENVIRONMENT: str = "development"

    # CORS Settings
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5500",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )


# Instantiate settings instance
settings = Settings()
