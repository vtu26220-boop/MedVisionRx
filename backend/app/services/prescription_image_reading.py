"""In-memory, local-only enhancement and spatial fusion for prescription OCR."""
import re


def reading_variants(pixels, has_text=True, mean_score=1.0):
    import cv2
    import numpy as np
    hsv = cv2.cvtColor(pixels, cv2.COLOR_BGR2HSV)
    ink = cv2.inRange(hsv, np.array([90, 25, 20]), np.array([140, 255, 245]))
    ink_ratio = float(np.count_nonzero(ink)) / max(ink.size, 1)
    has_colored_writing = .002 <= ink_ratio <= .20
    if not has_colored_writing and has_text and mean_score >= .85:
        return []
    gray = cv2.cvtColor(pixels, cv2.COLOR_BGR2GRAY)
    contrast = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    variants = [("contrast", cv2.cvtColor(contrast, cv2.COLOR_GRAY2BGR))]
    if has_colored_writing:
        variants.append(("ink_separation", cv2.cvtColor(255 - ink, cv2.COLOR_GRAY2BGR)))
    return variants


def output_lines(result, variant="original"):
    texts = getattr(result, "txts", None)
    scores = getattr(result, "scores", None)
    boxes = getattr(result, "boxes", None)
    if texts is None:
        return []
    lines = []
    for index, text in enumerate(texts):
        text = str(text).strip()
        if not text:
            continue
        score = float(scores[index]) if scores is not None and index < len(scores) else None
        box = None
        if boxes is not None and index < len(boxes):
            points = boxes[index]
            xs = [float(point[0]) for point in points]
            ys = [float(point[1]) for point in points]
            box = [min(xs), min(ys), max(xs), max(ys)]
        lines.append({"text": text, "score": score, "box": box, "variant": variant, "index": index})
    return lines


def _same_region(first, second):
    a, b = first["box"], second["box"]
    if a is None or b is None:
        return first["index"] == second["index"] and re.sub(r"\s+", " ", first["text"]).casefold() == re.sub(r"\s+", " ", second["text"]).casefold()
    intersection = max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))
    area = min(max(1, (a[2] - a[0]) * (a[3] - a[1])), max(1, (b[2] - b[0]) * (b[3] - b[1])))
    return intersection / area >= .60


def merge_readings(readings):
    """One best observation per spatial area; join fragments on the same line."""
    selected = []
    for item in sorted(readings, key=lambda line: line["score"] or 0, reverse=True):
        if not any(_same_region(item, previous) for previous in selected):
            selected.append(item)
    positioned = [line for line in selected if line["box"] is not None]
    if not positioned:
        return sorted(selected, key=lambda line: line["index"])
    rows = []
    for item in sorted(positioned, key=lambda line: ((line["box"][1] + line["box"][3]) / 2, line["box"][0])):
        box = item["box"]
        center = (box[1] + box[3]) / 2
        height = max(1, box[3] - box[1])
        matching = None
        for row in reversed(rows):
            if abs(center - row["center"]) <= max(8, min(height, row["height"]) * .35):
                matching = row
                break
            if center - row["center"] > height:
                break
        if matching is None:
            matching = {"center": center, "height": height, "items": []}
            rows.append(matching)
        matching["items"].append(item)
    result = []
    for row in rows:
        parts = sorted(row["items"], key=lambda line: line["box"][0])
        scores = [line["score"] for line in parts if line["score"] is not None]
        result.append({"text": " ".join(line["text"] for line in parts), "score": min(scores) if scores else None,
                       "box": [min(line["box"][0] for line in parts), min(line["box"][1] for line in parts), max(line["box"][2] for line in parts), max(line["box"][3] for line in parts)],
                       "variants": sorted({line["variant"] for line in parts})})
    return result
