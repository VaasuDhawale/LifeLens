from dataclasses import dataclass
from pathlib import Path

from PIL import Image, UnidentifiedImageError
import pytesseract


class OCRExtractionError(RuntimeError):
    """Raised when OCR text extraction cannot complete."""


@dataclass(frozen=True)
class OCRConfig:
    """Configuration for Tesseract OCR extraction."""

    language: str = "eng"
    tesseract_cmd: str | None = None
    pdf_dpi: int = 200
    max_pdf_pages: int = 20


class OCRService:
    """Extract visible text from images and scanned PDF pages."""

    def __init__(self, config: OCRConfig | None = None) -> None:
        self.config = config or OCRConfig()
        if self.config.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = self.config.tesseract_cmd

    def extract_text_from_image(self, image_path: str | Path) -> str:
        """Run OCR against one image file."""
        path = Path(image_path).expanduser()
        try:
            with Image.open(path) as image:
                return pytesseract.image_to_string(
                    image.convert("RGB"),
                    lang=self.config.language,
                ).strip()
        except UnidentifiedImageError as exc:
            raise OCRExtractionError(f"Unsupported image for OCR: {path}") from exc
        except pytesseract.TesseractError as exc:
            raise OCRExtractionError(f"Tesseract failed while reading image: {path}") from exc
        except OSError as exc:
            raise OCRExtractionError(f"Unable to read image for OCR: {path}") from exc

    def extract_text_from_pdf(self, pdf_path: str | Path) -> str:
        """Render PDF pages and run OCR over each rendered page."""
        path = Path(pdf_path).expanduser()
        try:
            import fitz
        except ImportError as exc:
            raise OCRExtractionError(
                "PDF OCR requires PyMuPDF. Install requirements.txt first."
            ) from exc

        try:
            document = fitz.open(path)
        except Exception as exc:
            raise OCRExtractionError(f"Unable to open PDF for OCR: {path}") from exc

        page_text: list[str] = []
        zoom = self.config.pdf_dpi / 72
        matrix = fitz.Matrix(zoom, zoom)

        try:
            for page_index in range(min(document.page_count, self.config.max_pdf_pages)):
                page = document.load_page(page_index)
                pixmap = page.get_pixmap(matrix=matrix, alpha=False)
                image = Image.frombytes(
                    "RGB",
                    (pixmap.width, pixmap.height),
                    pixmap.samples,
                )
                text = pytesseract.image_to_string(
                    image,
                    lang=self.config.language,
                ).strip()
                if text:
                    page_text.append(text)
        except pytesseract.TesseractError as exc:
            raise OCRExtractionError(f"Tesseract failed while reading PDF: {path}") from exc
        except Exception as exc:
            raise OCRExtractionError(f"Unable to OCR PDF: {path}") from exc
        finally:
            document.close()

        return "\n".join(page_text).strip()

