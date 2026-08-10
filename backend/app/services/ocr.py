import io
import re
import os
import shutil
import base64
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from PIL import Image

from app.core.config import settings
from app.schemas.ocr import ParsedReceiptData

logger = logging.getLogger("app.services.ocr")


class OCRService:
    """Production hybrid OCR bill & receipt extraction (pypdf, Groq Vision, RapidOCR, Pytesseract, Regex)."""

    @classmethod
    def _setup_tesseract_cmd(cls) -> bool:
        """Configures pytesseract binary command path dynamically from settings or system PATH."""
        try:
            import pytesseract
        except ImportError:
            return False

        if settings.TESSERACT_CMD_PATH and os.path.exists(settings.TESSERACT_CMD_PATH):
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD_PATH
            return True

        common_windows_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
        ]
        for path in common_windows_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                return True

        if shutil.which("tesseract"):
            return True

        return False

    @classmethod
    def extract_pdf_text(cls, pdf_bytes: bytes) -> str:
        """Extracts native text stream from PDF documents using pypdf."""
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(pdf_bytes))
            text_pages = []
            for page in reader.pages:
                txt = page.extract_text()
                if txt and txt.strip():
                    text_pages.append(txt.strip())
            extracted_text = "\n".join(text_pages).strip()
            if extracted_text:
                logger.info(f"Extracted {len(extracted_text)} characters directly from PDF text stream.")
            return extracted_text
        except Exception as e:
            logger.error(f"Error extracting text from PDF document: {e}")
            return ""

    @classmethod
    def preprocess_image(cls, image_bytes: bytes) -> Image.Image:
        """Preprocesses image bytes using PIL / OpenCV for optimal contrast."""
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode not in ("L", "RGB"):
            image = image.convert("RGB")

        try:
            import cv2
            import numpy as np

            np_img = np.array(image)
            if len(np_img.shape) == 3 and np_img.shape[2] == 3:
                gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
            else:
                gray = np_img

            gray = cv2.fastNlMeansDenoising(gray, h=10)
            thresh = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            return Image.fromarray(thresh)
        except Exception as e:
            logger.debug(f"OpenCV preprocessing fallback to PIL conversion: {e}")
            return image.convert("L")

    @classmethod
    def parse_with_groq_vision(cls, image_bytes: bytes) -> Optional[ParsedReceiptData]:
        """Attempts direct multimodal image OCR parsing via Groq Vision models."""
        if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip():
            return None

        # Do not send PDF binary bytes to image vision API
        if image_bytes.startswith(b'%PDF'):
            return None

        try:
            mime = "image/jpeg"
            if image_bytes.startswith(b'\x89PNG'):
                mime = "image/png"
            elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:16]:
                mime = "image/webp"

            base64_img = base64.b64encode(image_bytes).decode("utf-8")
            data_url = f"data:{mime};base64,{base64_img}"

            from groq import Groq
            import json

            client = Groq(api_key=settings.GROQ_API_KEY.strip())
            prompt = (
                "You are an expert financial receipt OCR assistant.\n"
                "Analyze the uploaded receipt/bill image carefully and extract these keys as a single JSON object:\n"
                "- 'title': Merchant name or vendor\n"
                "- 'amount': Final total amount paid (float, e.g. 45.99)\n"
                "- 'currency': Currency ISO code (e.g. 'INR', 'EUR', 'GBP', 'USD', 'CAD', 'JPY', 'AUD'). Look for symbols like ₹, $, €, £ or keywords like Rs, INR, EUR, USD\n"
                "- 'category': One of ['Food & Dining', 'Groceries', 'Housing', 'Utilities', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare', 'Salary', 'Freelance', 'Investments', 'Other']\n"
                "- 'transaction_date': Date formatted as YYYY-MM-DD\n"
                "- 'type': 'expense' or 'income'\n"
                "- 'confidence_score': Float between 0.70 and 0.99\n\n"
                "Return ONLY raw JSON formatting."
            )

            vision_models = ["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]
            for model_name in vision_models:
                try:
                    completion = client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": data_url}}
                                ]
                            }
                        ],
                        temperature=0.1,
                        max_tokens=400
                    )

                    raw_text = completion.choices[0].message.content.strip()
                    json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                    if json_match:
                        raw_json = json_match.group(0)
                        data = json.loads(raw_json)

                        logger.info(f"Groq Vision OCR success with model {model_name}")
                        cur = (data.get("currency") or "INR").upper().strip()
                        return ParsedReceiptData(
                            title=data.get("title") or "Scanned Receipt",
                            amount=float(data.get("amount")) if data.get("amount") is not None else None,
                            currency=cur,
                            category=data.get("category") or "Shopping",
                            transaction_date=data.get("transaction_date") or datetime.now().strftime("%Y-%m-%d"),
                            type=data.get("type", "expense").lower(),
                            confidence_score=float(data.get("confidence_score", 0.95)),
                            raw_text=f"Parsed directly from image via Groq Vision ({model_name}).",
                            message="Scanned receipt details extracted successfully using AI Vision."
                        )
                except Exception as ve:
                    logger.debug(f"Groq Vision model {model_name} error: {ve}")
                    continue
        except Exception as e:
            logger.error(f"Groq Vision OCR pipeline error: {e}")

        return None

    @classmethod
    def extract_raw_text_rapidocr(cls, image_bytes: bytes) -> str:
        """Extracts text using pure-Python RapidOCR engine (ONNX Runtime) with normalized NumPy array."""
        try:
            import numpy as np
            from rapidocr_onnxruntime import RapidOCR

            # Convert bytes to PIL Image RGB then to NumPy array
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            np_img = np.array(pil_img)

            engine = RapidOCR()
            result, _ = engine(np_img)
            if result:
                lines = [line[1] for line in result if line and len(line) >= 2]
                return "\n".join(lines).strip()
        except Exception as e:
            logger.debug(f"RapidOCR extraction notice: {e}")
        return ""

    @classmethod
    def extract_raw_text_tesseract(cls, image_bytes: bytes) -> str:
        """Extracts text using Pytesseract engine if system binary is available."""
        if not cls._setup_tesseract_cmd():
            return ""

        try:
            import pytesseract
            processed_img = cls.preprocess_image(image_bytes)
            raw_text = pytesseract.image_to_string(processed_img, config='--psm 6')
            if not raw_text.strip():
                raw_text = pytesseract.image_to_string(processed_img)
            return raw_text.strip()
        except Exception as e:
            logger.debug(f"Pytesseract extraction notice: {e}")
            return ""

    @classmethod
    def parse_with_groq_text(cls, raw_text: str) -> Optional[ParsedReceiptData]:
        """Leverages Groq API text completions to structure raw OCR text into JSON schema."""
        if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip() or not raw_text.strip():
            return None

        system_prompt = (
            "You are a specialized financial document & receipt OCR parsing assistant.\n"
            "Analyze the provided raw text extracted from a bill, receipt, invoice, or payslip.\n"
            "Extract structured financial data into a single raw JSON object with these keys:\n"
            "- 'title': (string) Merchant name, vendor name, or income source.\n"
            "- 'amount': (float) Final total amount paid or received (e.g. 45.99). Exclude subtotals or taxes.\n"
            "- 'currency': (string) ISO currency code (e.g. 'INR', 'EUR', 'GBP', 'USD', 'CAD', 'JPY', 'AUD'). Look for symbols like ₹, $, €, £ or keywords like Rs, INR, EUR, USD.\n"
            "- 'category': (string) One of: 'Food & Dining', 'Groceries', 'Housing', 'Utilities', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare', 'Salary', 'Freelance', 'Investments', 'Other'.\n"
            "- 'transaction_date': (string) Date formatted strictly as YYYY-MM-DD.\n"
            "- 'type': (string) Either 'expense' or 'income'.\n"
            "- 'confidence_score': (float) Score between 0.50 and 0.99.\n\n"
            "Respond ONLY with raw JSON. No markdown ticks, no code blocks."
        )

        try:
            from groq import Groq
            import json

            client = Groq(api_key=settings.GROQ_API_KEY.strip())
            completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"RAW TEXT FROM DOCUMENT:\n{raw_text}"}
                ],
                temperature=0.2,
                max_tokens=300,
                response_format={"type": "json_object"}
            )

            raw_json = completion.choices[0].message.content.strip()
            data = json.loads(raw_json)
            cur = (data.get("currency") or "INR").upper().strip()

            return ParsedReceiptData(
                title=data.get("title") or "Scanned Receipt",
                amount=float(data.get("amount")) if data.get("amount") is not None else None,
                currency=cur,
                category=data.get("category") or "Shopping",
                transaction_date=data.get("transaction_date") or datetime.now().strftime("%Y-%m-%d"),
                type=data.get("type", "expense").lower(),
                confidence_score=float(data.get("confidence_score", 0.90)),
                raw_text=raw_text,
                message="Document scanned and extracted successfully."
            )
        except Exception as e:
            logger.error(f"Groq text OCR extraction failed: {e}")
            return None

    @classmethod
    def parse_with_regex_heuristics(cls, raw_text: str) -> ParsedReceiptData:
        """Regex-based rule heuristic fallback for parsing amounts, dates, titles, and categories."""
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        title = "Scanned Bill / Receipt"
        for line in lines[:5]:
            clean_line = re.sub(r'[^a-zA-Z0-9\s]', '', line).strip()
            if len(clean_line) > 3 and not clean_line.isdigit():
                title = line.title()
                break

        amount = None
        amount_patterns = [
            r'(?:total|total amount|amount due|grand total|net amount|net pay|paid|val|bal|usd|inr|rs\.?|₹|\$|€|£)\s*[:=\-]?\s*[₹\$€£\s]*([0-9,]+\.[0-9]{2})',
            r'[₹\$€£\s]*([0-9,]+\.[0-9]{2})\s*(?:total|paid|usd|inr|rs\.?|₹|\$|€|£)',
            r'\b([0-9,]+\.[0-9]{2})\b'
        ]

        found_amounts: List[float] = []
        for line in lines:
            line_lower = line.lower()
            for pattern in amount_patterns:
                matches = re.findall(pattern, line_lower)
                for m in matches:
                    try:
                        val = float(m.replace(',', ''))
                        if 0.01 <= val <= 100000.0:
                            if any(kw in line_lower for kw in ['total', 'due', 'amount', 'net', 'paid', 'grand', 'pay']):
                                found_amounts.insert(0, val)
                            else:
                                found_amounts.append(val)
                    except ValueError:
                        continue

        if found_amounts:
            amount = found_amounts[0]

        trans_date = datetime.now().strftime("%Y-%m-%d")
        date_patterns = [
            (r'\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b', "%Y-%m-%d"),
            (r'\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b', "%d/%m/%Y"),
            (r'\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b', "%d %b %Y")
        ]

        for line in lines:
            for pattern, fmt in date_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    try:
                        matched_str = match.group(0)
                        if fmt == "%Y-%m-%d":
                            trans_date = matched_str
                        else:
                            dt = datetime.strptime(matched_str, fmt)
                            trans_date = dt.strftime("%Y-%m-%d")
                        break
                    except Exception:
                        continue

        raw_text_lower = raw_text.lower()
        category = "Shopping"
        tx_type = "expense"

        if any(kw in raw_text_lower for kw in ['salary', 'paycheck', 'dividend', 'stipend', 'deposit', 'income', 'payroll']):
            category = "Salary"
            tx_type = "income"
        elif any(kw in raw_text_lower for kw in ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food', 'dining', 'baking', 'kitchen']):
            category = "Food & Dining"
        elif any(kw in raw_text_lower for kw in ['grocery', 'supermarket', 'mart', 'market', 'vegetable', 'fruit', 'store']):
            category = "Groceries"
        elif any(kw in raw_text_lower for kw in ['electric', 'water', 'internet', 'power', 'utility', 'gas', 'bill', 'mobile']):
            category = "Utilities"
        elif any(kw in raw_text_lower for kw in ['uber', 'lyft', 'taxi', 'fuel', 'petrol', 'diesel', 'parking', 'transport', 'cab']):
            category = "Transportation"
        elif any(kw in raw_text_lower for kw in ['rent', 'lease', 'apartment', 'housing', 'tenant']):
            category = "Housing"
        elif any(kw in raw_text_lower for kw in ['hospital', 'pharmacy', 'doctor', 'medical', 'clinic', 'health']):
            category = "Healthcare"

        # Detect currency from raw document text symbols & ISO codes
        detected_currency = "USD"
        if any(sym in raw_text_lower for sym in ['₹', 'rs', 'inr', 'rupees', 'pvt ltd', 'ltd', 'india']):
            detected_currency = "INR"
        elif any(sym in raw_text_lower for sym in ['€', 'eur', 'euro']):
            detected_currency = "EUR"
        elif any(sym in raw_text_lower for sym in ['£', 'gbp', 'pound']):
            detected_currency = "GBP"
        elif any(sym in raw_text_lower for sym in ['ca$', 'cad']):
            detected_currency = "CAD"
        elif any(sym in raw_text_lower for sym in ['a$', 'aud']):
            detected_currency = "AUD"
        elif '$' in raw_text_lower:
            detected_currency = "USD"
        elif any(sym in raw_text_lower for sym in ['a$', 'aud']):
            detected_currency = "AUD"
        elif '$' in raw_text_lower:
            detected_currency = "USD"

        confidence = 0.80 if amount is not None else 0.45

        return ParsedReceiptData(
            title=title,
            amount=amount,
            currency=detected_currency,
            category=category,
            transaction_date=trans_date,
            type=tx_type,
            confidence_score=confidence,
            raw_text=raw_text,
            message="Document parsed successfully using OCR."
        )

    @classmethod
    def process_receipt_image(cls, file_bytes: bytes) -> ParsedReceiptData:
        """Main entry point for processing uploaded images and PDF documents."""

        raw_text = ""

        # 1. Check if uploaded file is a PDF document (%PDF)
        if file_bytes.startswith(b'%PDF'):
            pdf_text = cls.extract_pdf_text(file_bytes)
            if pdf_text:
                raw_text = pdf_text

        # 2. If not PDF or PDF produced empty text, try Groq Multimodal Vision directly
        if not raw_text:
            vision_result = cls.parse_with_groq_vision(file_bytes)
            if vision_result:
                return vision_result

        # 3. Try RapidOCR (with normalized NumPy RGB array)
        if not raw_text:
            raw_text = cls.extract_raw_text_rapidocr(file_bytes)

        # 4. Try Pytesseract OCR
        if not raw_text:
            raw_text = cls.extract_raw_text_tesseract(file_bytes)

        # 5. If raw text extracted from PDF, RapidOCR, or Tesseract: parse with Groq Text or Regex Heuristics
        if raw_text.strip():
            ai_parsed = cls.parse_with_groq_text(raw_text)
            if ai_parsed:
                return ai_parsed
            return cls.parse_with_regex_heuristics(raw_text)

        # 6. Fallback if no readable text could be extracted
        return ParsedReceiptData(
            title="Scanned Document",
            amount=None,
            category="Shopping",
            transaction_date=datetime.now().strftime("%Y-%m-%d"),
            type="expense",
            confidence_score=0.0,
            raw_text="",
            message="Could not automatically extract text from file. Please enter details manually."
        )
