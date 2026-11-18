"""Copy legacy local originals to Atlas. Dry run by default; never deletes sources."""
import argparse
import asyncio
from collections import Counter
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.mongodb import database, client
from app.services.prescription_storage import STORAGE, MAX_BYTES, local_path, migrate_original


async def run(apply=False):
    rows = await database["prescriptions"].find({"file_path": {"$exists": True}, "storage_file_id": {"$exists": False}}).to_list(length=None)
    eligible = [row for row in rows if (path := local_path(row)) is not None and 0 < path.stat().st_size <= MAX_BYTES and row.get("status") != "processing"]
    total = sum(local_path(row).stat().st_size for row in eligible)
    stats = await database.command("dbStats", scale=1)
    usage = stats.get("dataSize", 0) + stats.get("indexSize", 0)
    # Stay below the free allowance, allowing room for GridFS chunks and indexes.
    if usage + total * 1.1 > 400 * 1024 * 1024:
        raise RuntimeError("Migration would exceed the conservative 400 MiB storage budget. No files were copied.")
    print(f"Legacy records: {len(rows)}; eligible: {len(eligible)}; skipped/missing/processing: {len(rows)-len(eligible)}")
    print(f"Estimated data plus indexes: {usage/1024**2:.2f} MiB; originals to copy: {total/1024**2:.2f} MiB")
    if not apply:
        print("DRY RUN ONLY. Add --apply to copy and verify originals. Local files and analysis reports are preserved.")
        return
    counts = Counter()
    for row in eligible:
        counts[await migrate_original(row, database["prescriptions"])] += 1
    print("Migration results:", dict(counts))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        asyncio.run(run(args.apply))
    finally:
        client.close()
