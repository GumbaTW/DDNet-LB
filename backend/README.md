# Leaderboard data pipeline

You don’t have live DB access; you fetch a `.sqlite` file once a day and run a script to produce the data the frontend consumes. No real-time backend is required.

## Data format (JSON)

The frontend expects a single JSON file (e.g. served statically or by a minimal server). Schema:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2025-02-08T12:00:00Z",
  "entries": [
    { "rank": 1, "name": "PlayerName", "points": 12450, "region": "EU" },
    { "rank": 2, "name": "Another", "points": 11820, "region": "NA" }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | number | Schema version for future changes. Frontend can ignore unknown versions or migrate. |
| `generatedAt` | string | ISO 8601 UTC timestamp when the data was generated. Shown as “Last updated” in the UI. |
| `entries` | array | Sorted by points descending. Global rank = position (1-based). |

Each **entry**:

| Field | Type | Description |
|-------|------|-------------|
| `rank` | number | Global rank (1-based). Backend assigns so you can add tie-breaking later. |
| `name` | string | Player display name. |
| `points` | number | Total points. |
| `region` | string | Region code (e.g. EU, NA, SA, AS, OC, AF). |

**Extending later:** add optional fields to entries (e.g. `mapsFinished`, `country`) or new top-level fields; keep `schemaVersion` and existing fields so old frontends still work.

## Pipeline

1. **Fetch** the game’s `.sqlite` file (daily, however you get it).
2. **Run** the generator script (see below); it reads the SQLite DB and writes `leaderboard.json`.
3. **Deploy** the frontend and put `leaderboard.json` where the app can load it (e.g. `frontend/public/leaderboard.json` so it’s at `/leaderboard.json`, or upload to a CDN and set the URL in the frontend).

No long-running server is required unless you add one later (e.g. for auth or extra APIs).

## Generator script

See `generate_leaderboard.py`. Usage:

```bash
cd backend
pip install -r requirements.txt
python generate_leaderboard.py path/to/your.db -o ../frontend/public/leaderboard.json
```

**DDNet schema (already wired in):** The script uses `race` (Map, Name, Server) and `maps` (Map, Points). In DDNet, `race.Server` is the region (GER, USA, …); `maps.Server` is difficulty/category (Brutal, Novice, …), so the join is on `Map` only and we use `MAX(Points)` per map. Player points = sum of those points per distinct map finish; region = server where they have the most points. Use `--top 10000` (or similar) to limit the JSON size for the frontend.

Your ratio query (solo min(time) vs teamrace min(time) per map) is a different metric—useful for “solo vs team” views or map difficulty—and is not used for this leaderboard; the leaderboard uses the `Points` column from the `maps` table.

## Profile data (player category breakdown)

`generate_profiles.py` writes **one small JSON file per player** into an output directory. The frontend fetches only that player’s file when you open their profile, so no large payload and no UI freeze. Run it **after** generating `leaderboard.json` (same player list):

```bash
python generate_profiles.py data/ddnet.sqlite --players-file ../frontend/public/leaderboard.json -o ../frontend/public/profiles
```

This creates `frontend/public/profiles/<player>.json` (one per player; filenames are URL-safe encoded names). Deploy the whole `profiles/` folder. If a player’s file is missing, their profile page still works but without the “Maps by category” sections.
