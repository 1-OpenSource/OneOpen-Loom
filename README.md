# OneOpen Loom

Open-source collaboration suite: **Workboard** (work management) and **Magicboard** (knowledge and documentation).

| Product | Role | SPA | API |
|---------|------|-----|-----|
| Workboard | Workspaces, projects, work items, boards, sprints, workflows | http://localhost:5173 | http://localhost:8001 |
| Magicboard | Spaces, pages, authoring, search, templates | http://localhost:5174 | http://localhost:8002 |

## Repository

```text
OneOpen-Loom/
├── platform/               # Shared identity (JWT, workspaces)
├── magicboard/             # Magicboard API + SPA
├── workboard/connectors/   # Cross-product connector notes
├── docs/                   # Sphinx documentation
├── backend/                # Workboard API
├── frontend/               # Workboard SPA
└── docker-compose.yml
```

## Quick start

**Prerequisites:** Python 3.12+, Node.js 20+

### Workboard

```bash
cd backend
python -m pip install -r requirements.txt
copy .env.example .env
python -m alembic upgrade head
python -m app.scripts.seed
uvicorn app.main:app --reload --port 8001
```

```bash
cd frontend
npm install
npm run dev
```

### Magicboard

```bash
cd magicboard/backend
python -m pip install -r requirements.txt
copy .env.example .env
python -m app.scripts.seed
uvicorn app.main:app --reload --port 8002
```

```bash
cd magicboard/frontend
npm install
npm run dev
```

After seed: `akhil@oneopen.dev` / `password123`

```bash
docker compose up --build
```

See [RUNBOOK.md](RUNBOOK.md) for operations. Connector env: [`platform/README.md`](platform/README.md).

## Documentation

```bash
cd docs
python -m pip install -r requirements-docs.txt
python -m sphinx -b html . _build/html
```

Open `docs/_build/html/index.html`. Guides: `docs/workboard/`, `docs/magicboard/`.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
