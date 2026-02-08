"""One-off script to inspect ddnet.sqlite schema."""
import sqlite3
from pathlib import Path

db = Path(__file__).parent / "data" / "ddnet.sqlite"
conn = sqlite3.connect(db)

print("=== TABLES ===")
tables = [r[0] for r in conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
).fetchall()]
print(tables)

for t in tables:
    cols = conn.execute(f"PRAGMA table_info({t})").fetchall()
    print(f"\n--- {t} ---")
    for c in cols:
        print(" ", c)

# Sample a few rows from race and teamrace if they exist
for t in ["race", "teamrace"]:
    if t in tables:
        print(f"\n--- Sample from {t} (first 2 rows) ---")
        try:
            rows = conn.execute(f"SELECT * FROM {t} LIMIT 2").fetchall()
            for r in rows:
                print(" ", r)
        except Exception as e:
            print(" ", e)

conn.close()
