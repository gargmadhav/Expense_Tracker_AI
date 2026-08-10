from typing import Optional
from pydantic import BaseModel, Field


class ParsedReceiptData(BaseModel):
    """Pydantic schema representing structured transaction details parsed from bill/receipt image."""

    title: Optional[str] = Field(None, description="Extracted merchant, store, or income source title")
    amount: Optional[float] = Field(None, description="Extracted total monetary amount")
    category: Optional[str] = Field(None, description="Extracted or predicted financial category")
    transaction_date: Optional[str] = Field(None, description="Extracted transaction date in YYYY-MM-DD format")
    type: str = Field("expense", description="Detected transaction type: 'expense' or 'income'")
    confidence_score: float = Field(0.0, ge=0.0, le=1.0, description="Overall parsing confidence score between 0.0 and 1.0")
    raw_text: str = Field("", description="Raw unparsed OCR text extracted from the image")
    message: Optional[str] = Field(None, description="Informational message or warnings during processing")
