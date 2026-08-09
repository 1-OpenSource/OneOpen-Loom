# OneOpen Loom — Runbook

## Prerequisites

- Python 3.12+
- Node.js 20+
- Optional: Docker Desktop for PostgreSQL + backend containers

## Database choice

The backend supports both SQLite and PostgreSQL through `DATABASE_URL`.

### SQLite

Good for local development without Docker.

```bash
DATABASE_URL=sqlite:///./oneopen_loom.db
```

### PostgreSQL

Good for Docker and production-like local environments.

```bash
DATABASE_URL=postgresql+psycopg://oneopen:oneopen@localhost:5432/oneopen_loom
```

## Backend setup

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate    # macOS / Linux
python -m pip install -r requirements.txt
Copy-Item .env.example .env    # Windows
# cp .env.example .env         # macOS / Linux
python -m alembic upgrade head
uvicorn app.main:app --reload
```

Update `backend/.env` if you want PostgreSQL instead of SQLite.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000` unless `VITE_API_BASE_URL` is overridden.

## Seed data

After migrations, load demo data with:

```bash
cd backend
python -m app.scripts.seed
```

This typically creates sample workspaces, projects, members, and work items for exploration.

## Docker

From the repository root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL
- FastAPI backend

The compose file is backend-focused. Run the frontend locally with `npm run dev`.

## Tests

Backend:

```bash
cd backend
python -m pytest tests
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Useful URLs

- Frontend dev server: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
