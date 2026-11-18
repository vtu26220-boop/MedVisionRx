"""OCR and upload validation used only by the Prescription service."""
import base64
import importlib.util
import io
import json
import os
from functools import lru_cache
from threading import Lock
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

MAX_PAGES = 5
MAX_PIXELS = 24_000_000
LOCAL_OCR_LOCK = Lock()


def selected_provider():
    # Local is deliberately the default, even if an old cloud key is present.
    return os.getenv("PRESCRIPTION_OCR_PROVIDER", "local").strip().lower()


@lru_cache(maxsize=1)
def get_local_engine():
    try:
        from rapidocr import RapidOCR
        return RapidOCR()
    except Exception as exc:
        raise RuntimeError("Local OCR could not start. Install requirements-prescription.txt in the Python environment running the backend, then run prescription_local_smoke.py to verify its models.") from exc


def capabilities():
    mode = selected_provider()
    cloud = mode == "google" and bool(os.getenv("PRESCRIPTION_GOOGLE_VISION_API_KEY"))
    local = mode == "local" and all(importlib.util.find_spec(module) is not None for module in ["rapidocr", "onnxruntime"])
    return {
        "available": cloud or local,
        "provider": "Google Cloud Vision" if cloud else "Local RapidOCR (free)" if local else "Not configured",
        "mode": mode,
        "multilingual": cloud,
        "pdf": importlib.util.find_spec("pypdfium2") is not None,
        "max_pages": MAX_PAGES,
        "message": "Handwriting and language coverage vary. Every medicine must be reviewed before the report is finalized.",
    }


def image_pages(content: bytes, extension: str) -> list[bytes]:
    """Decode the real file contents, limit resources, strip image metadata."""
    from PIL import Image, ImageOps, UnidentifiedImageError

    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    if extension == ".pdf":
        try:
            import pypdfium2 as pdfium
        except ImportError as exc:
            raise RuntimeError("PDF support needs pypdfium2. Install requirements-prescription.txt.") from exc
        try:
            document = pdfium.PdfDocument(content)
            try:
                if not 1 <= len(document) <= MAX_PAGES:
                    raise ValueError(f"Upload a PDF with 1–{MAX_PAGES} pages.")
                pages = []
                for index in range(len(document)):
                    page = document[index]
                    try:
                        width, height = page.get_size()
                        scale = min(2, (MAX_PIXELS / max(width * height, 1)) ** .5)
                        bitmap = page.render(scale=scale)
                        try:
                            image = bitmap.to_pil().convert("RGB")
                            output = io.BytesIO()
                            image.save(output, format="JPEG", quality=90)
                            pages.append(output.getvalue())
                        finally:
                            bitmap.close()
                    finally:
                        page.close()
                return pages
            finally:
                document.close()
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError("This PDF cannot be read. Use an unencrypted PDF or clear JPG/PNG images.") from exc
    try:
        with Image.open(io.BytesIO(content)) as original:
            if original.format not in {"JPEG", "PNG"}:
                raise ValueError("The file contents must be a JPG or PNG image.")
            expected = "PNG" if extension == ".png" else "JPEG"
            if original.format != expected:
                raise ValueError("The image contents do not match its file extension. Export it again as JPG or PNG.")
            if original.width * original.height > MAX_PIXELS:
                raise ValueError("Image is too large. Use an image below 24 megapixels.")
            image = ImageOps.exif_transpose(original).convert("RGB")
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=92)
            return [output.getvalue()]
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("The uploaded image is damaged or cannot be decoded.") from exc


def extract_document(pages: list[bytes], work_dir: Path) -> dict:
    key = os.getenv("PRESCRIPTION_GOOGLE_VISION_API_KEY")
    mode = selected_provider()
    if mode == "google" and key:
        body = {"requests": [{"image": {"content": base64.b64encode(page).decode()}, "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]} for page in pages]}
        request = Request("https://vision.googleapis.com/v1/images:annotate", data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "X-Goog-Api-Key": key})
        try:
            with urlopen(request, timeout=90) as response:
                result = json.load(response)
        except (HTTPError, URLError, TimeoutError) as exc:
            raise RuntimeError("The handwriting OCR provider is unavailable. Check its credentials, billing and network connection.") from exc
        text, confidence = [], []
        for page in result.get("responses", []):
            if page.get("error"):
                raise RuntimeError("The OCR provider could not read this document. Check provider configuration or try a clearer image.")
            annotation = page.get("fullTextAnnotation", {})
            text.append(annotation.get("text", ""))
            confidence.extend(p.get("confidence", 0) for p in annotation.get("pages", []))
        return {"text": "\n".join(text).strip(), "provider": "Google Cloud Vision", "confidence": min(confidence) if confidence else None}
    if mode != "local":
        raise RuntimeError("Select PRESCRIPTION_OCR_PROVIDER=local for free OCR, or configure the explicitly selected Google provider.")
    if not capabilities()["available"]:
        raise RuntimeError("Local OCR is not installed in this backend environment. Install requirements-prescription.txt and restart the backend.")
    # Keep images in memory. Concurrent uploads cannot share temporary filenames.
    # A single cached CPU engine is serialized to avoid excessive memory use.
    from PIL import Image
    import numpy as np
    from app.services.prescription_image_reading import reading_variants, output_lines, merge_readings
    text, scores, passes, medicine_readings = [], [], set(), []
    with LOCAL_OCR_LOCK:
        engine = get_local_engine()
        for page in pages:
            with Image.open(io.BytesIO(page)) as image:
                pixels = np.asarray(image.convert("RGB"))[:, :, ::-1].copy()
            original = output_lines(engine(pixels, use_det=True, use_cls=True, use_rec=True))
            readings = list(original)
            passes.add("original")
            original_scores = [line["score"] for line in original if line["score"] is not None]
            mean_score = sum(original_scores) / len(original_scores) if original_scores else 0
            for name, enhanced in reading_variants(pixels, has_text=bool(original), mean_score=mean_score):
                try:
                    readings.extend(output_lines(engine(enhanced, use_det=True, use_cls=True, use_rec=True), name))
                    passes.add(name)
                except Exception:
                    # An optional retry must not discard the successful original scan.
                    continue
            try:
                from app.services.prescription_word_reading import medicine_word_readings
                recovered = medicine_word_readings(pixels, engine, original)
                if recovered:
                    medicine_readings.extend(recovered)
                    passes.add("word_consensus")
            except Exception:
                # Optional word retries cannot discard a successful page scan.
                pass
            merged = merge_readings(readings)
            text.extend(line["text"] for line in merged)
            scores.extend(line["score"] for line in merged if line["score"] is not None)
    return {"text": "\n".join(text).strip(), "provider": "Local RapidOCR (free)", "confidence": min(scores) if scores else None, "passes": sorted(passes), "medicine_readings": medicine_readings}
