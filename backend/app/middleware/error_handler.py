from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger("app")


class APIException(Exception):
    """Custom Base API Exception class for application-specific error handling."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, code: str = "BAD_REQUEST"):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


def register_error_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on the FastAPI application."""

    @app.exception_handler(APIException)
    async def api_exception_handler(request: Request, exc: APIException):
        logger.info(f"APIException [{exc.status_code}] on {request.url.path}: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # Ignore logging noise for common 404 favicons
        if exc.status_code != 404 or request.url.path != "/favicon.ico":
            logger.info(f"HTTP {exc.status_code} on {request.url.path}: {exc.detail}")

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail if isinstance(exc.detail, str) else "An HTTP error occurred",
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail if isinstance(exc.detail, str) else "An HTTP error occurred",
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.info(f"ValidationError [422] on {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": exc.errors(),
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request parameters or payload",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled Server Exception on {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred on the server.",
                }
            },
        )
