import os
from typing import Optional, List
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

# Try to import PaddleOCR, fall back to a simpler approach if not installed
_ocr = None

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.pdf', '.txt'}

def get_ocr():
    global _ocr
    if _ocr is None:
        try:
            from paddleocr import PaddleOCR
            _ocr = PaddleOCR(
                use_angle_cls=True,
                lang='en',
                use_gpu=False,
                show_log=False
            )
            logger.info("PaddleOCR initialized successfully")
        except ImportError:
            logger.warning("PaddleOCR not installed. Using basic text extraction fallback.")
            _ocr = False
        except Exception as e:
            logger.warning(f"PaddleOCR init failed: {e}. Using fallback.")
            _ocr = False
    return _ocr

def extract_text_from_image(image_path: str) -> str:
    """Extract text from a single image using PaddleOCR."""
    ocr = get_ocr()

    if ocr is False:
        return "[OCR not available. Install PaddleOCR: pip install paddleocr paddlepaddle]"

    try:
        result = ocr.ocr(image_path, cls=True)
        lines = []
        for page in result:
            if page is None:
                continue
            for line in page:
                if line and len(line) >= 2:
                    text = line[1][0] if isinstance(line[1], (list, tuple)) else str(line[1])
                    confidence = line[1][1] if isinstance(line[1], (list, tuple)) and len(line[1]) > 1 else 0
                    if confidence > 0.3:  # Filter low confidence
                        lines.append(text)
        return '\n'.join(lines)
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return f"[OCR Error: {str(e)}]"

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF. Tries pdfplumber first (pure Python), then pypdf, then OCR fallback."""
    # Try pdfplumber first — handles text-based PDFs well
    try:
        import pdfplumber
        all_text = []
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                if text.strip():
                    all_text.append(f"--- Page {i+1} ---\n{text}")
        if all_text:
            return '\n\n'.join(all_text)
        logger.info("pdfplumber found no text, trying pypdf fallback")
    except ImportError:
        logger.warning("pdfplumber not installed, trying pypdf")
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}, trying pypdf")

    # Try pypdf as second fallback
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        all_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                all_text.append(f"--- Page {i+1} ---\n{text}")
        if all_text:
            return '\n\n'.join(all_text)
        logger.info("pypdf found no text (likely scanned PDF), trying OCR")
    except ImportError:
        logger.warning("pypdf not installed")
    except Exception as e:
        logger.warning(f"pypdf failed: {e}")

    # Last resort: try pdf2image + PaddleOCR (requires poppler)
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, dpi=200)
        all_text = []
        for i, img in enumerate(images):
            temp_path = pdf_path.replace('.pdf', f'_page_{i}.png')
            img.save(temp_path, 'PNG')
            text = extract_text_from_image(temp_path)
            all_text.append(f"--- Page {i+1} ---\n{text}")
            try:
                os.remove(temp_path)
            except:
                pass
        return '\n\n'.join(all_text)
    except ImportError:
        return "[PDF Error: Could not extract text. The PDF may be scanned. Try converting to TXT first.]"
    except Exception as e:
        return f"[PDF Error: {str(e)}]"

def extract_text_from_txt(txt_path: str) -> str:
    """Extract text from a plain text file."""
    try:
        encodings = ['utf-8', 'latin-1', 'cp1252']
        for encoding in encodings:
            try:
                with open(txt_path, 'r', encoding=encoding) as f:
                    content = f.read()
                if content.strip():
                    return content
            except UnicodeDecodeError:
                continue
        return "[Error: Could not decode text file with any supported encoding]"
    except Exception as e:
        return f"[Text file error: {str(e)}]"

def extract_text(file_path: str) -> str:
    """Extract text from image, PDF, or text file."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']:
        return extract_text_from_image(file_path)
    elif ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext == '.txt':
        return extract_text_from_txt(file_path)
    else:
        return f"[Unsupported file format: {ext}]"

def allowed_file(filename: str) -> bool:
    """Check if file has an allowed extension."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS