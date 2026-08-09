# Magicboard quick start

## Prerequisites

- Python 3.12+
- Node.js 20+

## Start the API

```bash
cd magicboard/backend
python -m pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
python -m app.scripts.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

Health check: http://localhost:8002/health

## Start the SPA

```bash
cd magicboard/frontend
npm install
npm run dev
```

Open http://localhost:5174

### Demo login (after seed)

| Email | Password |
|-------|----------|
| `akhil@oneopen.dev` | `password123` |

## Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | API | SQLite/Postgres URL |
| `SECRET_KEY` | API | JWT signing |
| `WORKBOARD_API_URL` | API | Optional Workboard connector |
| `VITE_API_BASE_URL` | SPA | Defaults to `http://localhost:8002` |
| `VITE_WORKBOARD_APP_URL` | SPA | Deep links to Workboard |
| `VITE_COLLAB_URL` | SPA | Optional live editing (`ws://localhost:1234`) |

## Optional live collaboration

```bash
cd magicboard/collab
npm install
npm run dev
```

Set `VITE_COLLAB_URL=ws://localhost:1234` in the SPA `.env`, then restart Vite.

## Legacy content migration

If you have markdown pages from an older build:

```bash
cd magicboard/backend
python -m app.scripts.migrate_page_content --dry-run
python -m app.scripts.migrate_page_content
```

## First steps in the UI

1. Open **Spaces** (home).
2. Enter a space → create or open a page.
3. Click **Edit** → write with TipTap; changes **autosave as Draft**.
4. Click **Publish** when the page should be published.
5. Confirm the sidebar **Draft** badge clears after publish.
