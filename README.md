<p align="center">
  <img src="docs/logo.svg" alt="OneOpen Loom" width="96" height="96">
</p>

<h1 align="center">OneOpen Loom</h1>

<p align="center">
  <strong>Open-source collaboration suite</strong><br>
  Workboard for delivery · Magicboard for knowledge — under one OneOpenSource roof.
</p>

<p align="center">
  <a href="https://github.com/1-OpenSource/OneOpen-Loom"><img alt="Status" src="https://img.shields.io/badge/status-active-14b8a6?style=flat-square"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square"></a>
  <a href="https://oneopensource.org"><img alt="OneOpenSource" src="https://img.shields.io/badge/part%20of-OneOpenSource-14b8a6?style=flat-square"></a>
</p>

<p align="center">
  <a href="#what-is-oneopen-loom">What is Loom</a> ·
  <a href="#products">Products</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="#oneopen-ecosystem">Ecosystem</a>
</p>

---

## What is OneOpen Loom?

**OneOpen Loom** is the open-source **collaboration suite** in [OneOpenSource](https://oneopensource.org).

Loom is the **umbrella** — not a single app. Products share workspace identity, branding, and integrations.

| | |
|---|---|
| **Loom** | The suite |
| **Workboard** | Work management & delivery *(shipped)* |
| **Magicboard** | Knowledge, spaces & pages *(shipped)* |

> **Workboard ≠ Magicboard ≠ Loom.**  
> Workboard tracks work. Magicboard holds docs. Loom is the suite that hosts both.

---

## Products

### OneOpen Workboard

Workspaces, projects, work items, backlog, Kanban workboard, sprints, OQL, workflows, service queues, dashboards, administration.

| | |
|---|---|
| UI | React app (`frontend/`) — project routes, `/workspaces/...` |
| API | FastAPI (`backend/`) |

### OneOpen Magicboard

Team knowledge: spaces, hierarchical pages, templates, versions, comments, watch/favorites, search, Markdown macros, import/export.

**Magicboard is an independent product** — it has its own API and SPA under [`magicboard/`](magicboard/) and can run without Workboard installed.

| | |
|---|---|
| UI | `magicboard/frontend` → http://localhost:5174 |
| API | `magicboard/backend` → http://localhost:8002 |
| Docs | `magicboard/docs/` (+ Sphinx `docs/magicboard/`) |

**Optional Workboard ↔ Magicboard connector** (env-gated):

- Documentation panel on work items (when `VITE_MAGICBOARD_*` set)  
- `{{workitem:KEY}}` embeds (when `WORKBOARD_API_URL` / `VITE_WORKBOARD_*` set)  
- Suite search across pages + work items  
- See [`workboard/connectors/magicboard/`](workboard/connectors/magicboard/) and [`platform/README.md`](platform/README.md)

---

## Repository layout

```text
OneOpen-Loom/
├── README.md
├── platform/             # Shared identity contract (JWT, workspaces)
├── magicboard/           # Standalone Magicboard (API + SPA + docs)
├── workboard/connectors/ # Optional Magicboard integration notes
├── docs/                 # Suite Sphinx
├── backend/              # Workboard API
├── frontend/             # Workboard SPA
├── docker-compose.yml
└── LICENSE
```

---

## Quick start

**Prerequisites:** Python 3.12+, Node.js 20+

### Workboard alone

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

### Magicboard alone

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

| App | URL |
|-----|-----|
| Workboard | http://localhost:5173 |
| Magicboard | http://localhost:5174 |
| Workboard API | http://localhost:8001 |
| Magicboard API | http://localhost:8002 |

### Demo login (after seed)

| Email | Password |
|-------|----------|
| `akhil@oneopen.dev` | `password123` |

### Docker

```bash
docker compose up --build
```

Details: [RUNBOOK.md](RUNBOOK.md).

---

## Documentation

```bash
cd docs
python -m pip install -r requirements-docs.txt
python -m sphinx -b html . _build/html
```

Open `docs/_build/html/index.html`.

| Section | Path |
|---------|------|
| Workboard guide | `docs/workboard/` |
| Magicboard guide | `docs/magicboard/` |
| Ops | [RUNBOOK.md](RUNBOOK.md) |

---

## OneOpen ecosystem

| Project | Role |
|---------|------|
| **[OneOpen Loom](https://github.com/1-OpenSource/OneOpen-Loom)** | Suite: Workboard + Magicboard |
| **[OneOpen Flow](https://github.com/1-OpenSource/OneOpen-Flow)** | Visual workflow orchestration |

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
