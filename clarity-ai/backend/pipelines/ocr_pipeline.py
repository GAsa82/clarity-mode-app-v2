import os
import logging
from PIL import Image

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.pdf', '.txt', '.docx'}


def allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


# ── Image OCR via tesseract ──────────────────────────────────────────────────

def extract_text_from_image(image_path: str) -> str:
    try:
        import pytesseract
        img = Image.open(image_path).convert("RGB")
        text = pytesseract.image_to_string(img, lang="eng")
        text = text.strip()
        if text:
            return text
        return "[OCR: no text detected in image]"
    except ImportError:
        logger.warning("pytesseract not installed — image OCR unavailable")
        return "[OCR not available: install pytesseract and tesseract-ocr]"
    except Exception as e:
        logger.error(f"Image OCR failed for {image_path}: {e}")
        return f"[OCR Error: {e}]"


# ── PDF extraction ───────────────────────────────────────────────────────────

def _pdf_pdfplumber(pdf_path: str) -> str | None:
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                t = page.extract_text() or ""
                if t.strip():
                    pages.append(f"--- Page {i+1} ---\n{t.strip()}")
        return "\n\n".join(pages) if pages else None
    except ImportError:
        return None
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")
        return None


def _pdf_pypdf(pdf_path: str) -> str | None:
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        pages = []
        for i, page in enumerate(reader.pages):
            t = (page.extract_text() or "").strip()
            if t:
                pages.append(f"--- Page {i+1} ---\n{t}")
        return "\n\n".join(pages) if pages else None
    except ImportError:
        return None
    except Exception as e:
        logger.warning(f"pypdf failed: {e}")
        return None


def _pdf_ocr(pdf_path: str) -> str | None:
    """Convert PDF pages to images, then OCR each page."""
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, dpi=200)
        pages = []
        for i, img in enumerate(images):
            temp_path = f"{pdf_path}_page_{i}.png"
            try:
                img.save(temp_path, "PNG")
                text = extract_text_from_image(temp_path)
                if text and not text.startswith("[OCR"):
                    pages.append(f"--- Page {i+1} ---\n{text}")
            finally:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
        return "\n\n".join(pages) if pages else None
    except ImportError:
        logger.warning("pdf2image not installed — cannot OCR scanned PDFs")
        return None
    except Exception as e:
        logger.error(f"PDF OCR failed: {e}")
        return None


def extract_text_from_pdf(pdf_path: str) -> str:
    # 1. Try native text extraction (fast, no OCR needed)
    text = _pdf_pdfplumber(pdf_path)
    if text:
        logger.info(f"PDF extracted via pdfplumber: {len(text)} chars")
        return text

    text = _pdf_pypdf(pdf_path)
    if text:
        logger.info(f"PDF extracted via pypdf: {len(text)} chars")
        return text

    # 2. Scanned PDF — use OCR
    logger.info("No text layer found, attempting OCR on PDF pages")
    text = _pdf_ocr(pdf_path)
    if text:
        logger.info(f"PDF OCR result: {len(text)} chars")
        return text

    return "[PDF Error: Could not extract text. The PDF may be a scanned image with no readable text layer. Try uploading the image pages directly as JPG/PNG.]"


# ── DOCX extraction ──────────────────────────────────────────────────────────

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


# ── TXT extraction ───────────────────────────────────────────────────────────

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


# ── Main dispatcher ──────────────────────────────────────────────────────────

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
