"""Read-only exact RxNorm name checks; no clinical claims or spelling repair."""
from pathlib import Path
import sqlite3
from contextlib import closing

INDEX = Path(__file__).resolve().parents[1] / 'models/prescription/rxnorm.sqlite3'


def recognized_name(name):
    if not INDEX.is_file():
        return False
    normalized = ' '.join(str(name or '').split()).casefold()
    if not normalized:
        return False
    try:
        with closing(sqlite3.connect(INDEX.resolve().as_uri() + '?mode=ro', uri=True)) as connection:
            return connection.execute('SELECT 1 FROM names WHERE normalized=? LIMIT 1', (normalized,)).fetchone() is not None
    except sqlite3.Error:
        # An optional index must not break analysis if absent or damaged.
        return False
