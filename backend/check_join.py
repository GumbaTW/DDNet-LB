"""Quick check why race JOIN maps might return 0 rows."""
import sqlite3
from pathlib import Path

db = Path(__file__).parent / "data" / "ddnet.sqlite"
conn = sqlite3.connect(db)

print("--- race: sample Map, Server ---")
for r in conn.execute("SELECT DISTINCT Map, Server FROM race LIMIT 8").fetchall():
    print(r)

print("\n--- maps: sample Map, Server ---")
for r in conn.execute("SELECT DISTINCT Map, Server FROM maps LIMIT 8").fetchall():
    print(r)

print("\n--- race Map format (first 3) ---")
for r in conn.execute("SELECT Map FROM race LIMIT 3").fetchall():
    print(repr(r[0]))

print("\n--- maps Map format (first 3) ---")
for r in conn.execute("SELECT Map FROM maps LIMIT 3").fetchall():
    print(repr(r[0]))

# maps: Server is difficulty/category, not region. So join only on Map.
print("\n--- maps rows for #MegaRosenkohl ---")
for r in conn.execute("SELECT Map, Server, Points FROM maps WHERE Map = '#MegaRosenkohl'").fetchall():
    print(r)

print("\n--- Count race distinct (Map, Name) that have Map in maps ---")
n = conn.execute("""
SELECT COUNT(*) FROM (
    SELECT DISTINCT r.Map, r.Name FROM race r
    JOIN maps m ON r.Map = m.Map
) x
""").fetchone()[0]
print(n)

# One map can have multiple Points in maps (different Server/difficulty). Use MAX(Points) per map.
print("\n--- Player points if we use MAX(Points) per map (sample: first 5 players) ---")
sample = conn.execute("""
SELECT r.Name, SUM(maxpts) AS total
FROM (SELECT DISTINCT Map, Name FROM race) r
JOIN (
    SELECT Map, MAX(Points) AS maxpts FROM maps GROUP BY Map
) m ON r.Map = m.Map
GROUP BY r.Name
ORDER BY total DESC
LIMIT 5
""").fetchall()
for r in sample:
    print(r)

conn.close()
