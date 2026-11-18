import re
from urllib.parse import quote

import httpx


# =========================================================
# CONSTANTS
# =========================================================

GOOGLE_IMAGE_SEARCH_URL = (
    "https://www.google.com/search?tbm=isch&q="
)

MAX_IMAGES = 5


# =========================================================
# IMAGE URL CLEANING
# =========================================================

def clean_image_url(image_url: str) -> str | None:
    """
    Clean a scraped image URL and return it only when it
    looks like a valid HTTP/HTTPS URL.
    """

    if not image_url:
        return None

    image_url = image_url.strip()

    # Remove escaped quote characters sometimes found in
    # Google search HTML.
    image_url = image_url.replace('\\"', '"')

    # Remove wrapping quotation marks.
    image_url = image_url.strip('"').strip("'")

    if not image_url.startswith(
        ("http://", "https://")
    ):
        return None

    return image_url


# =========================================================
# IMAGE URL EXTRACTION
# =========================================================

def extract_image_urls(html: str) -> list[str]:
    """
    Extract likely direct image URLs from the Google Images
    HTML response.

    Google can change its HTML structure at any time, so
    this helper intentionally treats image extraction as
    best-effort rather than guaranteed.
    """

    if not html:
        return []

    pattern = re.compile(
        r'https?://[^"\'\\\s<>]+?'
        r'\.(?:jpg|jpeg|png|webp)'
        r'(?:\?[^"\'\\\s<>]*)?',
        re.IGNORECASE,
    )

    matches = pattern.findall(html)

    images: list[str] = []
    seen: set[str] = set()

    for match in matches:
        image_url = clean_image_url(match)

        if not image_url:
            continue

        if image_url in seen:
            continue

        seen.add(image_url)
        images.append(image_url)

        if len(images) >= MAX_IMAGES:
            break

    return images


# =========================================================
# SEARCH MEDICINE IMAGE
# =========================================================

async def search_medicine_image(
    medicine_name: str,
) -> dict:
    """
    Search Google Images for medicine packaging.

    This endpoint is only an image-search helper.
    It does not insert anything into MongoDB.
    """

    medicine_name = medicine_name.strip()

    if not medicine_name:
        return {
            "images": [],
            "message": "Medicine name cannot be empty.",
        }

    query = (
        f"{medicine_name} medicine packaging"
    )

    url = (
        GOOGLE_IMAGE_SEARCH_URL
        + quote(query)
    )

    headers = {
        "User-Agent": (
            "Mozilla/5.0 "
            "(Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "(KHTML, like Gecko) "
            "Chrome/154.0.0.0 "
            "Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml",
    }

    try:
        async with httpx.AsyncClient(
            timeout=20.0,
            follow_redirects=True,
        ) as client:

            response = await client.get(
                url,
                headers=headers,
            )

            response.raise_for_status()

        image_urls = extract_image_urls(
            response.text
        )

        images = [
            {
                "url": image_url,
                "title": query,
            }
            for image_url in image_urls
        ]

        return {
            "images": images,
            "message": (
                "Search completed"
                if images
                else "No images found"
            ),
        }

    except httpx.HTTPError as error:
        return {
            "images": [],
            "message": (
                "Image search request failed."
            ),
            "error": str(error),
        }

    except Exception as error:
        return {
            "images": [],
            "message": (
                "Unexpected error during image search."
            ),
            "error": str(error),
        }