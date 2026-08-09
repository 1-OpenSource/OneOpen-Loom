# Quick start

## Prerequisites

- Python 3.12+
- Node.js 20+
- Optional: Docker Desktop for PostgreSQL + API containers

## Backend

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

python -m pip install -r requirements.txt
copy .env.example .env    # Windows
# cp .env.example .env    # macOS / Linux

python -m alembic upgrade head
python -m app.scripts.seed   # optional demo data
uvicorn app.main:app --reload --port 8000
```

Default SQLite URL (see `.env.example`):

```text
DATABASE_URL=sqlite:///./oneopen_loom.db
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — API defaults to http://localhost:8000
(`VITE_API_BASE_URL` overrides).

## Demo users (seed)

| Email | Password |
|-------|----------|
| `akhil@oneopen.dev` | `password123` |
| `maria@oneopen.dev` | `password123` |
| `samir@oneopen.dev` | `password123` |
| `ivy@oneopen.dev` | `password123` |

## Docker

From the repository root:

```bash
docker compose up --build
```

Starts Postgres + the Workboard API. Run the frontend locally against it.

## More

See the repository root ``RUNBOOK.md`` for tests, health checks, and database options.
