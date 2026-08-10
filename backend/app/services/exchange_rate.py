import logging
import time
from typing import Dict, Any, Tuple, Optional, List
import httpx

from app.core.config import settings

logger = logging.getLogger("app.services.exchange_rate")

# Supported currencies map (Code -> Label / Name)
SUPPORTED_CURRENCIES: Dict[str, str] = {
    "USD": "USD ($) - US Dollar",
    "INR": "INR (₹) - Indian Rupee",
    "EUR": "EUR (€) - Euro",
    "GBP": "GBP (£) - British Pound",
    "CAD": "CAD (CA$) - Canadian Dollar",
    "AUD": "AUD (A$) - Australian Dollar",
    "JPY": "JPY (¥) - Japanese Yen",
    "CHF": "CHF (Fr) - Swiss Franc",
    "CNY": "CNY (¥) - Chinese Yuan",
    "SGD": "SGD (S$) - Singapore Dollar",
    "AED": "AED (AED) - UAE Dirham",
    "SAR": "SAR (SAR) - Saudi Riyal",
    "NZD": "NZD (NZ$) - New Zealand Dollar",
    "ZAR": "ZAR (R) - South African Rand",
    "BRL": "BRL (R$) - Brazilian Real",
    "KRW": "KRW (₩) - South Korean Won",
    "MXN": "MXN ($) - Mexican Peso",
}


class ExchangeRateService:
    """Service to fetch real-time live market exchange rates dynamically using .env configured endpoints."""

    _cached_rates: Dict[str, float] = {}
    _last_fetched: float = 0.0

    @classmethod
    def _is_cache_valid(cls) -> bool:
        ttl = getattr(settings, 'EXCHANGE_RATE_CACHE_TTL', 3600)
        return bool(cls._cached_rates) and (time.time() - cls._last_fetched < ttl)

    @classmethod
    def fetch_latest_rates(cls) -> Dict[str, float]:
        """Fetch latest rates relative to USD from live market API (or use cache)."""
        if cls._is_cache_valid():
            return cls._cached_rates

        primary_url = getattr(settings, 'EXCHANGE_RATE_API_URL', "https://open.er-api.com/v6/latest/USD")
        fallback_url = getattr(settings, 'EXCHANGE_RATE_FALLBACK_URL', "https://api.exchangerate-api.com/v4/latest/USD")

        for url in [primary_url, fallback_url]:
            try:
                with httpx.Client(timeout=5.0) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        rates = data.get("rates", {})
                        if rates and "USD" in rates:
                            cls._cached_rates = rates
                            cls._last_fetched = time.time()
                            logger.info(f"Successfully updated live exchange rates for {len(rates)} currencies from {url}")
                            return cls._cached_rates
            except Exception as e:
                logger.warning(f"Failed to fetch exchange rates from {url}: {e}")

        # If network calls fail and cache is empty, return minimal safe defaults
        if not cls._cached_rates:
            logger.error("Network unavailable and no cached exchange rates available. Using fallback rates.")
            return {"USD": 1.0, "INR": 83.5, "EUR": 0.92, "GBP": 0.79, "CAD": 1.36, "AUD": 1.52, "JPY": 155.0}

        return cls._cached_rates

    @classmethod
    def convert_to_usd(cls, amount: float, from_currency: str) -> Tuple[float, float]:
        """
        Converts an amount in `from_currency` to USD using the latest live market rate.
        Returns: (converted_amount_usd, exchange_rate_vs_usd)
        - exchange_rate_vs_usd is units of native currency per 1 USD (e.g. 83.5 for INR).
        """
        currency = (from_currency or "USD").upper().strip()
        if amount is None or amount <= 0:
            return 0.0, 1.0

        if currency == "USD":
            return round(float(amount), 2), 1.0

        rates = cls.fetch_latest_rates()
        rate_vs_usd = float(rates.get(currency, 1.0))

        if rate_vs_usd <= 0:
            rate_vs_usd = 1.0

        # Convert to USD: native_amount / (native_currency_per_usd)
        usd_amount = round(float(amount) / rate_vs_usd, 2)
        return usd_amount, round(rate_vs_usd, 4)

    @classmethod
    def get_supported_currencies(cls) -> List[Dict[str, str]]:
        """Returns list of supported currencies with codes and display names."""
        rates = cls.fetch_latest_rates()
        result = []
        for code, name in SUPPORTED_CURRENCIES.items():
            result.append({
                "code": code,
                "name": name,
                "rate_vs_usd": round(rates.get(code, 1.0), 4)
            })
        return result
