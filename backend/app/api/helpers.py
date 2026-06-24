from fastapi import UploadFile, HTTPException
from app.core.config import settings

async def read_file_safe(file: UploadFile) -> bytes:
    """
    Reads an UploadFile safely in chunks to prevent memory exhaustion.
    Raises HTTPException if the file is too large.
    """
    max_file_bytes = getattr(settings, "MAX_FILE_BYTES", 25 * 1024 * 1024)
    content_bytes = bytearray()
    while chunk := await file.read(1024 * 1024):
        content_bytes.extend(chunk)
        if len(content_bytes) > max_file_bytes:
            max_mb = max_file_bytes / (1024 * 1024)
            raise ValueError(f"The file {file.filename} is too large (>{max_mb:.0f}MB)")

    return bytes(content_bytes)
