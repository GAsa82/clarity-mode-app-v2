import os
import shutil
import logging
from PIL import Image

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.pdf', '.txt', '.docx'}


def allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


# ── Image OCR via tesseract ──────────────────────────────────────────────────

def _find_tesseract() -> str | None:
    """Locate the tesseract binary regardless of OS/install path."""
    # Explicit env override
    custom = os.environ.get("TESSERACT_CMD")
    if custom and os.path.isfile(custom):
        return custom
    # Search PATH
    found = shutil.which("tesseract")
    if found:
        return found
    # Common fallback paths
    for p in ("/usr/bin/tesseract", "/usr/local/bin/tesseract", "/nix/var/nix/profiles/default/bin/tesseract"):
        if os.path.isfile(p):
            return p
    return None


def extract_text_from_image(image_path: str) -> str:
    try:
        import pytesseract
        tess = _find_tesseract()
        if tess:
            pytesseract.pytesseract.tesseract_cmd = tess
        else:
            logger.warning("tesseract binary not found in PATH — OCR may fail")

        img = Image.open(image_path).convert("RGB")
        text = pytesseract.image_to_string(img, lang="eng+hin")
        text = text.strip()
        if text:
            return text
        # Retry with just English if hindi data unavailable
        text = pytesseract.image_to_string(img, lang="eng").strip()
        return text if text else "[OCR: no text detected in image]"
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
    """Render PDF pages to images via pymupdf (no poppler needed), then OCR each page."""
    try:
        import fitz  # pymupdf
        import io
        doc = fitz.open(pdf_path)
        pages = []
        for i, page in enumerate(doc):
            mat = fitz.Matrix(2, 2)  # 2x zoom → better OCR accuracy
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
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
        doc.close()
        return "\n\n".join(pages) if pages else None
    except ImportError:
        logger.warning("pymupdf not installed — cannot render scanned PDF pages")
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

    tess = _find_tesseract()
    logger.error(f"All PDF extraction methods failed. tesseract found: {tess}")
    return "[PDF Error: Could not read this PDF. OCR failed — the file may be corrupted or the scanned quality too low. Try saving as JPG/PNG and re-uploading.]"


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
