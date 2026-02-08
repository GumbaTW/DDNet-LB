# DDNet Leaderboard

Leaderboard system for a 2D speedrunning game: players finish maps and earn points. No live DB access: you fetch a `.sqlite` file once a day and generate a static JSON for the frontend.

## First push to GitHub

If the repo is freshly cloned or you re-initialized git, set your identity and push:

```powershell
cd C:\Users\mmb\Projects\DDNet-LB
git config user.name "Your Name"
git config user.email "your.email@example.com"
git add .
git commit -m "Initial commit: DDNet leaderboard frontend + backend generator"
git branch -M main
git push -u origin main
```

(Remote `origin` should already point to `https://github.com/GumbaTW/DDNet-LB.git`.)

## Project layout

- **`frontend/`** – React (Vite + TypeScript) leaderboard UI. Loads `/leaderboard.json` (or falls back to dummy data).
- **`backend/`** – Python script that reads your `.sqlite`, runs a query, and writes `leaderboard.json` in the format the frontend expects. See `backend/README.md` for the data schema and how to adapt the query.

## Frontend (leaderboard page)

### Run locally

```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**.

### Build

```bash
cd frontend
npm run build
```

Output is in `frontend/dist/`. Preview with `npm run preview`.

### Current features

- Leaderboard table with **Rank**, **Name**, **Points**, **Region**
- Dummy data (10 entries) in `frontend/src/data/dummyLeaderboard.ts`
- Modern dark UI (Outfit + JetBrains Mono, cyan accent)
- Gold/silver/bronze styling for top 3
- Region badges; responsive layout

The app fetches `leaderboard.json` on load (from `frontend/public/` in dev, or wherever you deploy it). If the file is missing or invalid, it uses built-in dummy data. Footer shows "Last updated: …" when using the JSON, or "Using fallback data" on error.

### Updating the deployed leaderboard data (e.g. GitHub Pages)

1. Put your SQLite file in `backend/data/` (e.g. `ddnet.sqlite`).
2. Generate the JSON and write it into the frontend so the next deploy includes it:
   ```bash
   cd backend
   python generate_leaderboard.py data/ddnet.sqlite -o ../frontend/public/leaderboard.json --top 10000
   ```
3. Commit and push (the workflow will rebuild and deploy with the new data):
   ```bash
   git add frontend/public/leaderboard.json
   git commit -m "Update leaderboard data"
   git push
   ```
