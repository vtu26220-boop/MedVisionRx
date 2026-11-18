"""Run after deployment to verify real CPU OCR using synthetic text only."""
import io
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

load_dotenv()
os.environ["PRESCRIPTION_OCR_PROVIDER"] = "local"

from app.services.prescription_ocr import capabilities, extract_document


def main():
    image = Image.new("RGB", (1200, 480), "white")
    font = ImageFont.load_default(size=35)
    ImageDraw.Draw(image).multiline_text(
        (55, 45), "SYNTHETIC OCR TEST\nTab Metformin 500 mg\nTab Amlodipine 5 mg",
        font=font, fill="black", spacing=30,
    )
    data = io.BytesIO()
    image.save(data, "JPEG", quality=95)
    with tempfile.TemporaryDirectory() as folder:
        result = extract_document([data.getvalue()], Path(folder))
    print("Provider:", capabilities()["provider"])
    print("Synthetic text recognized:", result["text"])
    text = result["text"].lower()
    if "metformin" not in text or "amlodipine" not in text:
        raise RuntimeError("Local OCR did not recognize the synthetic medicine names.")
    print("PASS: free local OCR is working. Handwriting accuracy still needs separate validation.")


if __name__ == "__main__":
    main()
