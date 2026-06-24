from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


def error_detail(error: str, message: str, **extra: Any) -> dict:
    payload = {"error": error, "message": message}
    payload.update(extra)
    return payload


def raise_api_error(status_code: int, error: str, message: str, **extra: Any):
    raise HTTPException(status_code=status_code, detail=error_detail(error, message, **extra))


async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        content = exc.detail
        content.setdefault("error", "http_error")
        content.setdefault("message", str(content.get("error", "HTTP error")))
    else:
        content = error_detail("http_error", str(exc.detail))

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=exc.headers,
    )
