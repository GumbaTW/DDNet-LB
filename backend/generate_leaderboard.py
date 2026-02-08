#!/usr/bin/env python3
from __future__ import annotations

"""
Read player data from a DDNet SQLite DB and write leaderboard.json for the frontend.

Three metrics (all summed per player):
1. Completion points: one per map finished (solo or team), formula: stars×multiplier+offset
   (multiplier/offset by server type: Novice, Moderate, Brutal, etc.).
2. Team rank points: from teamrace ranks per map (1st=25, 2nd=18, ..., 10th=1).
3. Rank points: from race (solo) ranks per map (1st=25, 2nd=18, ..., 10th=1).

Total points = completion + team_rank + rank. Region = server with most solo finishes (GER, POL, etc.).
"""

import argparse
import json
import sqlite3
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# Server type (maps.Server / difficulty) -> (multiplier, offset). DDmaX.* matches prefix.
SERVER_POINTS = {
    "Novice": (1, 0),
    "Moderate": (2, 5),
    "Brutal": (3, 15),
    "Insane": (4, 30),
    "Dummy": (5, 5),
    "Event": (4, 0),
    "Oldschool": (6, 0),
    "Solo": (4, 0),
    "Race": (2, 0),
}
# DDmaX.Pro, DDmaX.Next, etc.
DDMAX_MULT, DDMAX_OFF = 4, 0

# Rank points: 1st=25, 2nd=18, ..., 10th=1 (global and server-wide rank)
RANK_POINTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}


def _completion_points_for_server(stars: int, server: str) -> int:
    mult, off = SERVER_POINTS.get(server, (None, None))
    if mult is not None:
        return stars * mult + off
    if server.startswith("DDmaX."):
        return stars * DDMAX_MULT + DDMAX_OFF
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate leaderboard.json from DDNet SQLite")
    parser.add_argument("db_path", type=Path, help="Path to the .sqlite file (e.g. data/ddnet.sqlite)")
    parser.add_argument("-o", "--output", type=Path, default=Path("leaderboard.json"), help="Output JSON path")
    parser.add_argument("--top", type=int, default=0, help="Only output top N players (default: all)")
    args = parser.parse_args()

    if not args.db_path.exists():
        print(f"Error: DB file not found: {args.db_path}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(args.db_path)

    # --- Maps: max completion points per map (stars×mult+offset over server types) ---
    maps_rows = conn.execute("SELECT Map, Server, Stars FROM maps").fetchall()
    map_max_points: dict[str, int] = {}
    for row in maps_rows:
        map_name, server, stars = str(row[0]), str(row[1]).strip(), int(row[2] or 0)
        p = _completion_points_for_server(stars, server)
        if map_name not in map_max_points or p > map_max_points[map_name]:
            map_max_points[map_name] = p

    # --- Completion: distinct (Map, Name) from race+teamrace, sum map points ---
    completions_query = """
    SELECT DISTINCT Map, Name FROM (
        SELECT Map, Name FROM race UNION SELECT Map, Name FROM teamrace
    )
    """
    completion_points: dict[str, int] = defaultdict(int)
    for row in conn.execute(completions_query).fetchall():
        map_name, name = str(row[0]), str(row[1]).strip()
        completion_points[name] += map_max_points.get(map_name, 0)

    # --- Rank points (solo): per map, rank by best time, top 10 get 25,18,...,1 ---
    race_best = conn.execute("""
    SELECT Map, Name, MIN(Time) AS best_time FROM race GROUP BY Map, Name
    """).fetchall()
    map_times_race: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for row in race_best:
        map_times_race[str(row[0])].append((str(row[1]).strip(), float(row[2])))
    rank_points: dict[str, int] = defaultdict(int)
    for map_name, players in map_times_race.items():
        players.sort(key=lambda x: x[1])
        time_to_rank: dict[float, int] = {}
        r = 1
        for _, t in players:
            if t not in time_to_rank:
                time_to_rank[t] = r
                r += 1
        for name, t in players:
            pos = time_to_rank[t]
            rank_points[name] += RANK_POINTS.get(pos, 0)

    # --- Team rank points: same from teamrace ---
    team_best = conn.execute("""
    SELECT Map, Name, MIN(Time) AS best_time FROM teamrace GROUP BY Map, Name
    """).fetchall()
    map_times_team: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for row in team_best:
        map_times_team[str(row[0])].append((str(row[1]).strip(), float(row[2])))
    team_rank_points: dict[str, int] = defaultdict(int)
    for map_name, players in map_times_team.items():
        players.sort(key=lambda x: x[1])
        time_to_rank = {}
        r = 1
        for _, t in players:
            if t not in time_to_rank:
                time_to_rank[t] = r
                r += 1
        for name, t in players:
            pos = time_to_rank[t]
            team_rank_points[name] += RANK_POINTS.get(pos, 0)

    # --- Region = server with most solo map completions ---
    region_rows = conn.execute("""
    SELECT Name, Server, COUNT(DISTINCT Map) AS completions
    FROM race GROUP BY Name, Server ORDER BY Name, completions DESC
    """).fetchall()
    best_server_per_name: dict[str, str] = {}
    for row in region_rows:
        name = str(row[0]).strip()
        if name not in best_server_per_name:
            best_server_per_name[name] = str(row[1]).strip()

    conn.close()

    # --- All players (any of the three metrics > 0), total = completion + team_rank + rank ---
    all_names = set(completion_points) | set(rank_points) | set(team_rank_points)
    rows = []
    for name in all_names:
        comp = completion_points.get(name, 0)
        team = team_rank_points.get(name, 0)
        rank = rank_points.get(name, 0)
        total = comp + team + rank
        region = best_server_per_name.get(name, "")
        rows.append((name, comp, team, rank, total, region))
    rows.sort(key=lambda x: -x[4])
    if args.top > 0:
        rows = rows[: args.top]

    entries = []
    for i, (name, comp, team, rank, total, region) in enumerate(rows, start=1):
        entries.append({
            "rank": i,
            "name": name,
            "points": total,
            "completionPoints": comp,
            "teamRankPoints": team,
            "rankPoints": rank,
            "region": region,
        })

    payload = {
        "schemaVersion": 2,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "entries": entries,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(entries)} entries to {args.output}")


if __name__ == "__main__":
    main()
