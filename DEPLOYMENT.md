# Deploying the DDNet Leaderboard

The app is a **static site**: HTML, JS, CSS, and one data file (`leaderboard.json`). No server-side code runs in production. You build once, then upload the output to any static host.

---

## 1. Build the site

From the project root:

```bash
cd frontend
npm install
npm run build
```

Output is in **`frontend/dist/`**. That folder (and its contents) is what you deploy.

**Important:** The frontend loads **`/leaderboard.json`** at runtime. Either:

- **Option A:** Generate the JSON before building and put it in `frontend/public/`. It will be copied into `dist/` during the build:
  ```bash
  cd backend
  python generate_leaderboard.py data/ddnet.sqlite -o ../frontend/public/leaderboard.json --top 10000
  cd ../frontend
  npm run build
  ```
- **Option B:** After each build, overwrite `dist/leaderboard.json` with a fresh file (e.g. from a script or CI). Then upload `dist/`.

---

## 2. Where to deploy

### Netlify (recommended – free and simple)

1. Sign up at [netlify.com](https://netlify.com) and connect your Git repo (GitHub/GitLab/Bitbucket).
2. **Build settings:**
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
3. **Optional – fresh data on each deploy:**  
   Netlify runs the build in the cloud. To regenerate `leaderboard.json` on every deploy you’d need the SQLite file available in the repo (or from a URL). If you prefer to update data without code changes, generate `leaderboard.json` locally, put it in `frontend/public/`, commit, and push; Netlify will redeploy with the new file.
4. Deploy. Netlify will assign a URL like `https://your-site.netlify.app`.  
   SPA routing is handled by the included **`frontend/public/_redirects`** (all routes → `index.html`).

### Vercel

1. Sign up at [vercel.com](https://vercel.com) and import your repo.
2. **Root directory:** set to `frontend` (or leave root and set build to run in `frontend`).
3. **Build command:** `npm run build`  
   **Output directory:** `dist`
4. Deploy. **`frontend/vercel.json`** is already set so client-side routes (e.g. `/player/Name`) work.

### GitHub Pages (configured in this repo)

1. **Repo name and base path**  
   The workflow and Vite are set for a project site at **`https://<user>.github.io/DDNet-LB/`**.  
   If your repo is **not** named `DDNet-LB`, change the `base` in **`frontend/vite.config.ts`** to your repo name, e.g. `base: '/my-repo-name/'`.

2. **Turn on GitHub Pages**  
   In the repo: **Settings → Pages**. Under “Build and deployment”, set **Source** to **GitHub Actions**.

3. **Push and deploy**  
   Push to the `main` branch (including the `.github/workflows/deploy-pages.yml` file). The workflow will build the frontend and deploy it. After it runs, the site will be at **`https://<user>.github.io/DDNet-LB/`** (or your repo URL).

4. **Leaderboard data**  
   Put **`leaderboard.json`** in **`frontend/public/`** before pushing so it’s included in the build. Regenerate it with the Python script when you have new data, add it to `public/`, commit, and push to trigger a new deploy.

5. **Optional: lockfile**  
   For faster and more reliable CI, run `npm install` once in `frontend/`, commit **`frontend/package-lock.json`**, and push. The workflow uses `npm ci` when a lockfile exists.

### Your own server (VPS, shared hosting)

1. Build as above; ensure `leaderboard.json` is in `dist/` (via `public/` or by copying after build).
2. Upload the contents of **`frontend/dist/`** to the server (e.g. `public_html`, `www`, or `/var/www/leaderboard`).
3. Point the web server (nginx, Apache, Caddy) at that folder.  
   For **nginx**, a typical SPA config:
   ```nginx
   root /var/www/leaderboard;
   index index.html;
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```
4. To update the leaderboard data: regenerate `leaderboard.json`, upload it to the same folder (overwriting the old one), or replace the whole `dist/` after a new build.

---

## 3. Updating the leaderboard data

- **Manual:** Run the generator, put `leaderboard.json` in `frontend/public/`, rebuild, then redeploy (push to Git if using Netlify/Vercel, or re-upload `dist/`).
- **Scheduled:** Use a cron job or CI (e.g. GitHub Actions) that runs the Python script (with the SQLite file available), then either commits the new JSON and triggers a deploy or uploads only `leaderboard.json` to your host if it supports that (e.g. overwriting a file on the server).

---

## 4. Checklist

- [ ] `leaderboard.json` is present in the deployed output (in `dist/` root).
- [ ] SPA routing is configured (Netlify `_redirects`, Vercel `vercel.json`, or server `try_files` / 404 trick).
- [ ] If using GitHub Pages with a project site, `base` in `vite.config.ts` is set to your repo path.
