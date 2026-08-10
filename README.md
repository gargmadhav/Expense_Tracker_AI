# Smart Expense Tracker AI

A full-stack personal finance platform that combines expense tracking, AI-driven financial insights, and OCR-based receipt scanning into a single application.

Instead of just logging transactions, the app analyzes spending patterns, scores overall financial health, answers natural-language questions about your finances, and turns a photo of a receipt into a structured transaction — automatically.

---

## Features

- **Expense & Income Management** — Full CRUD for transactions, category budgets, and cash flow tracking
- **AI Financial Insights** — LLM-driven analysis of spending patterns via Groq (Llama 3.3 70B)
- **Financial Health Score (0–100)** — A consolidated score summarizing overall financial health
- **AI Financial Chat** — Conversational assistant that answers questions using your real transaction data as context
- **AI Receipt Scanner** — Upload a receipt image; OCR extracts merchant, total, tax, and date and converts it into a transaction
- **Budget Monitoring** — Category-level budgets with color-coded, threshold-based progress alerts
- **Analytics Dashboard** — Spending trends, category breakdowns, income vs. expenses, and savings growth, rendered with a custom Canvas/SVG charting engine (no charting library dependency)
- **Auth & Security** — JWT-based authentication with bcrypt password hashing
- **Dark/Light Theme** — Persistent user preference across sessions

## Architecture

The project is split into two independently runnable parts that communicate over a REST API:

```
Expense_Tracker_AI/
├── backend/     FastAPI + PostgreSQL API (auth, business logic, AI, OCR)
├── frontend/    Vanilla HTML/CSS/JS SaaS-style UI, no framework dependency
```

The backend follows a layered structure — routers → services → models/schemas — with dedicated modules for expenses, income, budgets, dashboard aggregation, analytics, AI, OCR, and notifications. Full details, including endpoint list and setup, are in [`backend/README.md`](./backend/README.md).

The frontend is a multi-page vanilla JS app with a centralized API service layer (`assets/js/api.js`) that talks to the backend over JWT-authenticated `fetch()` calls. Full details are in [`frontend/README.md`](./frontend/README.md).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | FastAPI (Python) |
| Database / ORM | PostgreSQL, SQLAlchemy |
| Migrations | Alembic |
| Auth | JWT (PyJWT), bcrypt password hashing |
| AI / LLM | Groq API, Llama 3.3 70B |
| OCR | RapidOCR (ONNX Runtime), Tesseract, OpenCV |
| Validation | Pydantic v2 |
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) — no framework |
| Charts | Custom HTML5 Canvas & SVG engine |

## Getting Started

The backend and frontend run as two separate local servers.

**1. Start the backend** (see [`backend/README.md`](./backend/README.md) for full steps):
```bash
cd backend
pip install -r requirements.txt
# configure .env from .env.example
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
API docs available at `http://127.0.0.1:8000/docs`.

**2. Start the frontend** (see [`frontend/README.md`](./frontend/README.md) for full steps):
```bash
cd frontend
py start_server.py
# or: npm start
```
Opens at `http://localhost:8000` (or `:5500` depending on server used) and connects to the backend automatically based on `ENV_API_BASE_URL`.

## Project Status

Actively in development. Core flows (auth, expenses, income, budgets, dashboard, analytics, AI chat, AI insights, OCR receipt scanning, notifications) are implemented end-to-end across both layers. Deployment is in progress — a live link will be added here once available.


## Author

Built by [Madhav Garg](https://github.com/gargmadhav).
