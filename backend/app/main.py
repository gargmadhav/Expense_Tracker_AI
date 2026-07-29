import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.core.config import settings
from app.middleware.error_handler import register_error_handlers
from app.middleware.request_logger import RequestTimingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers import auth, expenses, income, budgets, dashboard, analytics, notifications

# Configure clean logging format for backend server
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s - %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("app.main")


def create_application() -> FastAPI:
    """FastAPI application factory."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Add custom middlewares
    application.add_middleware(RequestTimingMiddleware)
    application.add_middleware(SecurityHeadersMiddleware)

    # Configure CORS middleware to allow requests from any frontend port
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register error handlers
    register_error_handlers(application)

    # Register API routers under both root / and /api/v1 prefix for max compatibility
    routers = [
        auth.router,
        expenses.router,
        income.router,
        budgets.router,
        dashboard.router,
        analytics.router,
        notifications.router
    ]
    for r in routers:
        application.include_router(r)
        application.include_router(r, prefix=settings.API_V1_STR)

    return application


app = create_application()


@app.get("/", tags=["Root"])
@app.get(f"{settings.API_V1_STR}", tags=["Root"])
async def root():
    """Root endpoint welcoming API consumers."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs"
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Favicon endpoint to prevent noisy 404 logs in browsers."""
    return Response(content=b"", media_type="image/x-icon")


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify backend operational status."""
    return {"status": "running"}
