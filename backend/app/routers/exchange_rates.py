from typing import Dict, Any, List
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field

from app.services.exchange_rate import ExchangeRateService

router = APIRouter(prefix="/exchange-rates", tags=["Exchange Rates"])


class ConversionResponse(BaseModel):
    amount: float
    currency: str
    usd_amount: float
    exchange_rate: float
    rate_display: str


@router.get(
    "/supported",
    summary="Get supported currencies and live exchange rates"
)
def get_supported_currencies():
    """Fetch all supported currencies and current live market rates vs USD."""
    return ExchangeRateService.get_supported_currencies()


@router.get(
    "/convert",
    response_model=ConversionResponse,
    summary="Convert amount from foreign currency to USD dynamically"
)
def convert_currency(
    amount: float = Query(..., gt=0, description="Amount in foreign currency"),
    from_currency: str = Query("USD", description="ISO code of origin currency (e.g. INR, EUR, GBP)")
):
    """Dynamically convert an amount from native currency to USD using live market rates."""
    cur = from_currency.upper().strip()
    usd_amount, rate = ExchangeRateService.convert_to_usd(amount, cur)
    
    if cur == "USD":
        rate_display = "1 USD = 1.00 USD"
    else:
        rate_display = f"1 USD = {rate} {cur}"

    return ConversionResponse(
        amount=amount,
        currency=cur,
        usd_amount=usd_amount,
        exchange_rate=rate,
        rate_display=rate_display
    )
