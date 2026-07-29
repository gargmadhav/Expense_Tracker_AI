# Smart Expense Tracker AI - Backend (Phase 1 Foundation)

Production-ready FastAPI backend foundation for the Smart Expense Tracker AI application.

## Directory Structure

```
backend/
├── app/
│   ├── main.py               # Application entrypoint & health endpoint
│   ├── core/
│   │   ├── config.py         # Application settings via Pydantic
│   │   └── database.py       # SQLAlchemy engine & session dependency
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic schemas
│   ├── routers/              # API router endpoints
│   ├── services/             # Core business logic
│   ├── utils/                # Helper utilities
│   └── middleware/
│       └── error_handler.py  # Structured error handling & custom exceptions
├── alembic/                  # Database migration scripts
├── alembic.ini               # Alembic configuration
├── .env                      # Local environment configuration
├── .env.example              # Environment variables template
├── requirements.txt          # Python dependencies
└── README.md
```

## Quick Start

### 1. Environment Setup

Create and activate Python virtual environment:

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

Copy `.env.example` to `.env` and configure your PostgreSQL database credentials:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_tracker_db
SECRET_KEY=your_secret_key
ENVIRONMENT=development
```

### 4. Run Migration Commands (Alembic)

```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 5. Run FastAPI Server

```bash
uvicorn app.main:app --reload --port 8000
```

Access API docs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
Health check endpoint at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 6. Run Foundation Test

```bash
python test_backend.py
```
