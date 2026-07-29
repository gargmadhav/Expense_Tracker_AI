import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("app.middleware.request_logger")


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """Middleware to measure HTTP request execution time and append performance metrics."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        
        response = await call_next(request)
        
        process_time = time.perf_counter() - start_time
        process_time_ms = process_time * 1000.0
        
        # Inject custom performance timing header
        response.headers["X-Process-Time"] = f"{process_time_ms:.2f}ms"
        
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} [{process_time_ms:.2f}ms]"
        )
        return response
