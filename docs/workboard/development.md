# Development

## Layout

```text
backend/app/          # FastAPI routers, services, models, schemas
backend/alembic/      # Migrations
backend/tests/        # Pytest suite
frontend/src/         # React SPA
docs/                 # This Sphinx site
```

## Backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m pip install -r requirements-dev.txt   # if present
python -m pytest tests
```

## Frontend

```bash
cd frontend
npm install
npm run build    # tsc + vite build
```

## Documentation

```bash
cd docs
python -m pip install -r requirements-docs.txt
sphinx-build -b html . _build/html
```

Open `_build/html/index.html`.

## Conventions

- Keep Workboard product naming in UI/docs; reserve **Loom** for the suite.
- Do not use third-party proprietary product brand names in docs or UI copy.
- Prefer focused PRs; match existing patterns in services and pages.
