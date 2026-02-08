#!/usr/bin/env python3
"""
Export a single JSON file listing all maps per category (Server).
Used by the frontend to compute unfinished maps per player.

Usage:
  python generate_maps_by_category.py data/ddnet.sqlite -o ../frontend/public/maps-by-category.json
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

SERVER_POINTS = {
    "Novice": (1, 0), "Moderate": (2, 5), "Brutal": (3, 15), "Insane": (4, 30),
    "Dummy": (5, 5), "Event": (4, 0), "Oldschool": (6, 0), "Solo": (4, 0), "Race": (2, 0),
}
DDMAX_MULT, DDMAX_OFF = 4, 0


def _points_from_stars(stars: int, server: str) -> int:
    t = SERVER_POINTS.get(server.strip(), (None, None))
    if t[0] is not None:
        return stars * t[0] + t[1]
    if server.startswith("DDmaX."):
        return stars * DDMAX_MULT + DDMAX_OFF
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Export maps per category for frontend")
    parser.add_argument("db_path", type=Path, help="Path to DDNet .sqlite file")
    parser.add_argument("-o", "--output", type=Path, required=True, help="Output JSON path")
    args = parser.parse_args()

    if not args.db_path.exists():
        print(f"Error: DB not found: {args.db_path}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(args.db_path)
    try:
        rows = conn.execute("SELECT Map, Server, Points FROM maps ORDER BY Server, Map").fetchall()
        use_stars = False
    except sqlite3.OperationalError:
        rows = conn.execute("SELECT Map, Server, Stars FROM maps ORDER BY Server, Map").fetchall()
        use_stars = True
    conn.close()

    by_category: dict[str, list[dict[str, object]]] = {}
    for r in rows:
        map_name, server = str(r[0]), str(r[1]).strip()
        if use_stars:
            points = _points_from_stars(int(r[2] or 0), server)
        else:
            points = int(r[2] or 0)
        if server not in by_category:
            by_category[server] = []
        by_category[server].append({"map": map_name, "points": points})

    args.output.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.output.with_suffix(args.output.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(by_category, f, indent=2, ensure_ascii=False)
    tmp.replace(args.output)

    print(f"Wrote {len(by_category)} categories to {args.output}")


if __name__ == "__main__":
    main()
