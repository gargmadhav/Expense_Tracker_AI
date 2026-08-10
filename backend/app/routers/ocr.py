import os
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.ocr import ParsedReceiptData
from app.services.ocr import OCRService
from app.routers.deps import get_current_user

router = APIRouter(prefix="/ocr", tags=["OCR Bill & Receipt Scanner"])


@router.post(
    "/scan-receipt",
    response_model=ParsedReceiptData,
    status_code=status.HTTP_200_OK,
    summary="Scan and extract expense/income details from a bill or receipt image"
)
async def scan_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts an uploaded receipt/bill image (PNG, JPG, WEBP, PDF) and returns
    extracted merchant/title, total amount, category, date, and type.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided for uploaded document."
        )

    # Validate file extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    allowed_exts = set(ext.lower() for ext in settings.ALLOWED_OCR_EXTENSIONS)

    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Allowed formats: {', '.join(sorted(allowed_exts))}"
        )

    # Read image contents into memory
    contents = await file.read()
    max_bytes = settings.MAX_OCR_FILE_SIZE_MB * 1024 * 1024

    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum threshold of {settings.MAX_OCR_FILE_SIZE_MB}MB."
        )

    # Perform OCR parsing
    parsed_result = OCRService.process_receipt_image(contents)
    return parsed_result
