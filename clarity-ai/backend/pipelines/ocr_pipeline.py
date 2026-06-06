import os
import io
import shutil
import base64
import logging
from PIL import Image

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.pdf', '.txt', '.docx'}


def allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


# ── Gemini Vision extraction (works without tesseract) ───────────────────────

def _gemini_vision_extract(image_bytes: bytes, mime_type: str = "image/png") -> str | None:
    """Send an image to Gemini Vision and extract all text from it.

    Requires GEMINI_API_KEY env var. Returns None if unavailable or if it fails.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        import httpx

        model = os.environ.get("GEMINI_FREE_MODEL", "gemini-2.0-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        payload = {
            "contents": [{
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64.b64encode(image_bytes).decode("utf-8"),
                        }
                    },
                    {
                        "text": (
                            "Extract ALL text from this image exactly as it appears. "
                            "Include every word, number, date, subject name, marks, grade, and any other text. "
                            "Preserve the structure and layout. Output only the raw extracted text, nothing else."
                        )
                    }
                ]
            }],
            "generationConfig": {"maxOutputTokens": 4096, "temperature": 0.0},
        }

        with httpx.Client(timeout=60) as client:
            resp = client.post(url, json=payload)
            data = resp.json()

        if resp.status_code != 200:
            logger.warning(f"Gemini vision failed: {data.get('error', {}).get('message', resp.status_code)}")
            return None

        candidates = data.get("candidates", [])
        if not candidates:
            return None

        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        return text if text else None

    except Exception as e:
        logger.warning(f"Gemini vision extraction failed: {e}")
        return None


# ── Tesseract OCR (requires system tesseract binary) ─────────────────────────

def _find_tesseract() -> str | None:
    custom = os.environ.get("TESSERACT_CMD")
    if custom and os.path.isfile(custom):
        return custom
    found = shutil.which("tesseract")
    if found:
        return found
    for p in ("/usr/bin/tesseract", "/usr/local/bin/tesseract", "/nix/var/nix/profiles/default/bin/tesseract"):
        if os.path.isfile(p):
            return p
    return None


def _tesseract_ocr_image(img: Image.Image) -> str | None:
    tess = _find_tesseract()
    if not tess:
        logger.warning("tesseract binary not found — skipping tesseract OCR")
        return None
    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = tess
        # Try with Hindi first, fall back to English-only
        try:
            text = pytesseract.image_to_string(img, lang="eng+hin").strip()
        except Exception:
            text = ""
        if not text:
            text = pytesseract.image_to_string(img, lang="eng").strip()
        return text if text else None
    except ImportError:
        logger.warning("pytesseract not installed")
        return None
    except Exception as e:
        logger.error(f"Tesseract failed: {e}")
        return None


# ── Image extraction (JPG, PNG, etc.) ────────────────────────────────────────

def extract_text_from_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        img_bytes = f.read()

    ext = os.path.splitext(image_path)[1].lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                ".webp": "image/webp", ".bmp": "image/bmp", ".tiff": "image/tiff"}
    mime = mime_map.get(ext, "image/png")

    # 1. Try Gemini Vision (best quality, no system deps)
    text = _gemini_vision_extract(img_bytes, mime)
    if text:
        logger.info(f"Image read via Gemini Vision: {len(text)} chars")
        return text

    # 2. Fall back to tesseract
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        return f"[Image Error: could not open image — {e}]"

    text = _tesseract_ocr_image(img)
    if text:
        logger.info(f"Image read via tesseract: {len(text)} chars")
        return text

    return "[OCR: no text detected in image — try uploading a clearer scan]"


# ── PDF extraction ────────────────────────────────────────────────────────────

def _pdf_native_text(pdf_path: str) -> str | None:
    """Try fast native text layer extraction — works for digital PDFs."""
    # pdfplumber
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                t = (page.extract_text() or "").strip()
                if t:
                    pages.append(f"--- Page {i+1} ---\n{t}")
        if pages:
            return "\n\n".join(pages)
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")

    # pypdf
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        pages = []
        for i, page in enumerate(reader.pages):
            t = (page.extract_text() or "").strip()
            if t:
                pages.append(f"--- Page {i+1} ---\n{t}")
        if pages:
            return "\n\n".join(pages)
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"pypdf failed: {e}")

    return None


def _pdf_render_pages(pdf_path: str) -> list[bytes] | None:
    """Render each PDF page to PNG bytes using pymupdf. No poppler needed."""
    try:
        import fitz  # pymupdf
        doc = fitz.open(pdf_path)
        pages = []
        for page in doc:
            mat = fitz.Matrix(2, 2)  # 2x zoom for better quality
            pix = page.get_pixmap(matrix=mat)
            pages.append(pix.tobytes("png"))
        doc.close()
        return pages if pages else None
    except ImportError:
        logger.warning("pymupdf not installed — cannot render PDF pages")
        return None
    except Exception as e:
        logger.error(f"PDF render failed: {e}")
        return None


def extract_text_from_pdf(pdf_path: str) -> str:
    # 1. Native text layer (instant, no AI/OCR needed)
    text = _pdf_native_text(pdf_path)
    if text:
        logger.info(f"PDF extracted via native text layer: {len(text)} chars")
        return text

    logger.info("No text layer — rendering pages for OCR/Vision")
    page_images = _pdf_render_pages(pdf_path)
    if not page_images:
        return "[PDF Error: Could not render PDF pages. The file may be corrupted.]"

    extracted_pages = []
    for i, img_bytes in enumerate(page_images):
        page_num = i + 1

        # 2a. Gemini Vision per page (best for scanned marksheets)
        text = _gemini_vision_extract(img_bytes, "image/png")
        if text:
            logger.info(f"Page {page_num}: Gemini Vision — {len(text)} chars")
            extracted_pages.append(f"--- Page {page_num} ---\n{text}")
            continue

        # 2b. Tesseract OCR per page
        try:
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception:
            continue

        text = _tesseract_ocr_image(img)
        if text:
            logger.info(f"Page {page_num}: tesseract — {len(text)} chars")
            extracted_pages.append(f"--- Page {page_num} ---\n{text}")

    if extracted_pages:
        return "\n\n".join(extracted_pages)

    tess = _find_tesseract()
    gemini_key = bool(os.environ.get("GEMINI_API_KEY"))
    logger.error(
        f"All PDF extraction methods failed. "
        f"tesseract={tess or 'not found'}, gemini_key={gemini_key}"
    )
    if not gemini_key and not tess:
        return (
            "[PDF Error: Cannot read this scanned PDF. "
            "Please set GEMINI_API_KEY in Railway environment variables to enable AI-powered reading, "
            "or the server needs to rebuild with tesseract support.]"
        )
    return "[PDF Error: Could not extract text from this PDF. The scan quality may be too low.]"


# ── DOCX extraction ───────────────────────────────────────────────────────────

def extract_text_from_docx(docx_path: str) -> str:
    try:
        from docx import Document
        doc = Document(docx_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        if not paragraphs:
            return "[DOCX: document appears to be empty]"
        return "\n".join(paragraphs)
    except ImportError:
        return "[DOCX not supported: install python-docx]"
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return f"[DOCX Error: {e}]"


# ── TXT extraction ────────────────────────────────────────────────────────────

def extract_text_from_txt(txt_path: str) -> str:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            with open(txt_path, "r", encoding=encoding) as f:
                content = f.read()
            if content.strip():
                return content
        except UnicodeDecodeError:
            continue
        except Exception as e:
            return f"[Text file error: {e}]"
    return "[Error: could not decode text file]"


# ── Main dispatcher ───────────────────────────────────────────────────────────

def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext in (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"):
        return extract_text_from_image(file_path)
    elif ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    elif ext == ".txt":
        return extract_text_from_txt(file_path)
    else:
        return f"[Unsupported file format: {ext}]"
