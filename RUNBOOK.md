# OneOpen Workboard — Runbook

Operations guide for the **Workboard** product inside the **OneOpen Loom** suite repository.

## Prerequisites

- Python 3.12+
- Node.js 20+
- Optional: Docker Desktop for PostgreSQL + backend containers

## Database choice

The backend supports both SQLite and PostgreSQL through `DATABASE_URL`.

### SQLite

```bash
DATABASE_URL=sqlite:///./oneopen_loom.db
```

### PostgreSQL

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

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000` unless `VITE_API_BASE_URL` is overridden.

## Seed data

```bash
cd backend
python -m app.scripts.seed
```

## Docker

```bash
docker compose up --build
```

Starts PostgreSQL + the Workboard API. Run the frontend locally with `npm run dev`.

## Tests

```bash
cd backend
python -m pytest tests
```

```bash
cd frontend
npm run build
```

## Sphinx docs

```bash
cd docs
python -m pip install -r requirements-docs.txt
sphinx-build -b html . _build/html
```

Open `docs/_build/html/index.html`.

## Useful URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Health: `http://localhost:8000/health`
