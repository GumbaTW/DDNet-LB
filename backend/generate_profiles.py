#!/usr/bin/env python3
from __future__ import annotations

"""
Generate profile data for player profile pages. Outputs one small JSON file per player.
Uses atomic writes (temp then rename) so stopping mid-run does not leave corrupt files.

Usage:
  python generate_profiles.py data/ddnet.sqlite --players-file ../frontend/public/leaderboard.json -o ../frontend/public/profiles
"""

import argparse
import base64
import json
import os
import sqlite3
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

SERVER_POINTS = {
    "Novice": (1, 0), "Moderate": (2, 5), "Brutal": (3, 15), "Insane": (4, 30),
    "Dummy": (5, 5), "Event": (4, 0), "Oldschool": (6, 0), "Solo": (4, 0), "Race": (2, 0),
}
DDMAX_MULT, DDMAX_OFF = 4, 0


def _player_to_filename(name: str) -> str:
    raw = base64.urlsafe_b64encode(name.encode("utf-8")).decode("ascii")
    return raw.replace("+", "-").replace("/", "_").rstrip("=")


def _points_from_stars(stars: int, server: str) -> int:
    t = SERVER_POINTS.get(server.strip(), (None, None))
    if t[0] is not None:
        return stars * t[0] + t[1]
    if server.startswith("DDmaX."):
        return stars * DDMAX_MULT + DDMAX_OFF
    return 0


def _parse_ts(ts: str | None) -> str | None:
    if ts is None or not ts:
        return None
    s = str(ts).strip()
    if s and s != "current_timestamp":
        return s
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate per-player profile JSON from DDNet SQLite")
    parser.add_argument("db_path", type=Path, help="Path to .sqlite file")
    parser.add_argument("--players-file", type=Path, help="Path to leaderboard.json (player names to include)")
    parser.add_argument("-o", "--output", type=Path, default=Path("profiles"), help="Output directory (one .json per player)")
    args = parser.parse_args()

    if not args.db_path.exists():
        print(f"Error: DB not found: {args.db_path}", file=sys.stderr)
        sys.exit(1)
    if not args.players_file or not args.players_file.exists():
        print("Error: --players-file (leaderboard.json) required", file=sys.stderr)
        sys.exit(1)

    with open(args.players_file, encoding="utf-8") as f:
        data = json.load(f)
    player_names = [e["name"] for e in data.get("entries", [])]
    if not player_names:
        print("Error: no entries in leaderboard file", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(args.db_path)

    categories = [
        str(r[0]).strip()
        for r in conn.execute("SELECT DISTINCT Server FROM maps ORDER BY Server").fetchall()
    ]

    try:
        maps_rows = conn.execute("SELECT Map, Server, Points FROM maps").fetchall()
        use_stars = False
    except sqlite3.OperationalError:
        maps_rows = conn.execute("SELECT Map, Server, Stars FROM maps").fetchall()
        use_stars = True

    maps_by_cat: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for row in maps_rows:
        map_name, server = str(row[0]), str(row[1]).strip()
        if use_stars:
            points = _points_from_stars(int(row[2] or 0), server)
        else:
            points = int(row[2] or 0)
        maps_by_cat[server].append((map_name, points))
    for cat in maps_by_cat:
        maps_by_cat[cat].sort(key=lambda x: x[0])

    race_stats: dict[tuple[str, str], tuple[float | None, str | None, int]] = {}
    for row in conn.execute("""
        SELECT Map, Name, MIN(Time), MIN(Timestamp), COUNT(*)
        FROM race GROUP BY Map, Name
    """).fetchall():
        map_name, name = str(row[0]), str(row[1]).strip()
        best_time = float(row[2]) if row[2] is not None else None
        first_ts = _parse_ts(row[3])
        count = int(row[4])
        race_stats[(map_name, name)] = (best_time, first_ts, count)

    team_stats: dict[tuple[str, str], tuple[float | None, str | None, int]] = {}
    for row in conn.execute("""
        SELECT Map, Name, MIN(Time), MIN(Timestamp), COUNT(*)
        FROM teamrace GROUP BY Map, Name
    """).fetchall():
        map_name, name = str(row[0]), str(row[1]).strip()
        best_time = float(row[2]) if row[2] is not None else None
        first_ts = _parse_ts(row[3])
        count = int(row[4])
        team_stats[(map_name, name)] = (best_time, first_ts, count)

    conn.close()

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out_dir = args.output
    out_dir.mkdir(parents=True, exist_ok=True)
    written = 0

    for name in player_names:
        cat_data: dict[str, dict] = {}
        for category in categories:
            total_maps = len(maps_by_cat[category])
            rows: list[dict] = []
            for map_name, points in maps_by_cat[category]:
                r = race_stats.get((map_name, name), (None, None, 0))
                t = team_stats.get((map_name, name), (None, None, 0))
                rank_time, team_rank_time = r[0], t[0]
                first_race, first_team = r[1], t[1]
                first_finish = min(first_race, first_team) if (first_race and first_team) else (first_race or first_team)
                finishes = r[2] + t[2]
                if finishes == 0:
                    continue
                rows.append({
                    "map": map_name,
                    "points": points,
                    "rankTime": round(rank_time, 2) if rank_time is not None else None,
                    "teamRankTime": round(team_rank_time, 2) if team_rank_time is not None else None,
                    "finishes": finishes,
                    "firstFinish": first_finish,
                })
            if total_maps > 0 or rows:
                cat_data[category] = {
                    "totalMaps": total_maps,
                    "finished": len(rows),
                    "maps": rows,
                }
        if not cat_data:
            continue
        payload = {
            "schemaVersion": 1,
            "generatedAt": generated_at,
            "profile": cat_data,
        }
        filename = _player_to_filename(name) + ".json"
        path = out_dir / filename
        tmp = path.with_suffix(path.suffix + ".tmp")
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            os.replace(tmp, path)
            written += 1
        except Exception as e:
            if tmp.exists():
                try:
                    tmp.unlink()
                except OSError:
                    pass
            print(f"Warning: failed to write {path}: {e}", file=sys.stderr)

    print(f"Wrote {written} profile files to {out_dir}")


if __name__ == "__main__":
    main()
