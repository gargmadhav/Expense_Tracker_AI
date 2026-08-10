# Smart Expense Tracker AI — Backend

FastAPI backend powering the Smart Expense Tracker AI application: authentication, transaction management, budgeting, analytics, an AI financial assistant, and OCR-based receipt scanning.

## Directory Structure

```
backend/
├── app/
│   ├── main.py                # Application entrypoint, router registration, health endpoint
│   ├── core/
│   │   ├── config.py          # Application settings via Pydantic (env-driven)
│   │   ├── database.py        # SQLAlchemy engine & session dependency
│   │   └── security.py        # Password hashing & JWT helpers
│   ├── models/                # SQLAlchemy ORM models (user, expense, income, budget, notification)
│   ├── schemas/                # Pydantic request/response schemas
│   ├── routers/                # API endpoints (auth, expenses, income, budgets, dashboard, analytics, ai, ocr, notifications)
│   ├── services/                # Business logic layer (ai.py, analytics.py, dashboard.py, notification.py, ocr.py)
│   ├── middleware/
│   │   ├── error_handler.py    # Structured error handling & custom exceptions
│   │   ├── request_logger.py   # Request timing middleware
│   │   └── security_headers.py # Security response headers
│   └── utils/                  # Helper utilities
├── alembic/                    # Database migration scripts
├── alembic.ini                 # Alembic configuration
├── test_*.py                   # Test scripts for backend, transactions, dashboard/budget, analytics/notifications, frontend integration
├── .env.example                 # Environment variables template
├── requirements.txt             # Python dependencies
└── README.md
```

## API Overview

All routes are registered both at root and under `/api/v1`. Full interactive documentation is available at `/docs` (Swagger) and `/redoc` once the server is running.

| Router | Responsibility |
|---|---|
| `auth` | Signup, login, JWT issuance |
| `expenses` | CRUD for expense transactions |
| `income` | CRUD for income entries |
| `budgets` | Category budget configuration & threshold tracking |
| `dashboard` | Aggregated financial overview (income, expenses, savings, remaining budget) |
| `analytics` | Spending trends, category breakdowns, income vs. expense, savings growth |
| `ai` | Groq-LLM-powered chat assistant and financial insights, using live user transaction data as context |
| `ocr` | Receipt/bill image upload → parsed transaction data |
| `notifications` | Budget alerts and system notification feed |

## Quick Start

### 1. Environment Setup

Create and activate a Python virtual environment:

```bash
# Windows
py -m venv .venv
.\.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_tracker_db
SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development

# Required for AI chat & insights
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Optional — only needed if Tesseract isn't on your system PATH
TESSERACT_CMD_PATH=
```

> Note: `GROQ_API_KEY` is required for the AI chat and insights endpoints to function — without it, those routes will fail even though the rest of the API works normally.

### 4. Run Database Migrations (Alembic)

```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 5. Run the FastAPI Server

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 6. Run Tests

```bash
python test_backend.py
python test_transactions.py
python test_dashboard_budget.py
python test_analytics_notifications.py
python test_frontend_integration.py
```
