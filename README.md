<p align="center">
  <img src="docs/logo.svg" alt="OneOpen Loom" width="96" height="96">
</p>

<h1 align="center">OneOpen Loom</h1>

<p align="center">
  <strong>Open-source collaboration suite</strong><br>
  A family of products for work, knowledge, and delivery — under one OneOpenSource roof.
</p>

<p align="center">
  <a href="https://github.com/1-OpenSource/OneOpen-Loom"><img alt="Status" src="https://img.shields.io/badge/status-active-14b8a6?style=flat-square"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square"></a>
  <a href="https://oneopensource.org"><img alt="OneOpenSource" src="https://img.shields.io/badge/part%20of-OneOpenSource-14b8a6?style=flat-square"></a>
</p>

<p align="center">
  <a href="#what-is-oneopen-loom">What is Loom</a> ·
  <a href="#products">Products</a> ·
  <a href="#repository-layout">Layout</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="#quick-start-workboard">Quick start</a> ·
  <a href="#oneopen-ecosystem">Ecosystem</a>
</p>

---

## What is OneOpen Loom?

**OneOpen Loom** is the open-source **collaboration suite** in [OneOpenSource](https://oneopensource.org).

Think of Loom as the **platform brand and home** for several focused products — not as a single app. Teams pick the product they need; over time those products share identity, admin patterns, and integrations under Loom.

| | |
|---|---|
| **Loom** | The suite (umbrella) |
| **Workboard** | Work management & delivery tracking *(shipped in this repo)* |
| **Spaces** *(roadmap)* | Knowledge / wiki surfaces |
| **More** | Additional Loom products as they land |

> **Workboard is not Loom.** Workboard is one product *inside* Loom — the piece for issues, boards, sprints, workflows, and project delivery.

---

## Products

### OneOpen Workboard *(available now)*

**Workboard** is Loom’s work-management product: workspaces, projects, work items, backlog, Kanban workboard, sprints, OQL navigator, workflows, service queues, dashboards, and workspace administration.

| | |
|---|---|
| Code | `backend/`, `frontend/` in this repository |
| Docs | Sphinx docs under [`docs/`](docs/) — see [Documentation](#documentation) |
| Run | [RUNBOOK.md](RUNBOOK.md) |

### Coming under Loom

| Product | Intent |
|---------|--------|
| **Spaces** | Team documentation and knowledge next to delivery work |
| **Shared platform** | Cross-product identity, branding, and admin patterns |

---

## Repository layout

```text
OneOpen-Loom/                 ← suite repository
├── README.md                 ← you are here (Loom suite overview)
├── RUNBOOK.md                ← how to run Workboard locally / Docker
├── docs/                     ← Sphinx documentation (Workboard-focused)
│   ├── conf.py
│   ├── index.rst
│   └── workboard/…
├── backend/                  ← Workboard API (FastAPI)
├── frontend/                 ← Workboard UI (React)
├── docker-compose.yml
└── LICENSE
```

---

## Documentation

Workboard has **Sphinx** docs (Read the Docs theme), same style as other OneOpen projects.

```bash
cd docs
python -m pip install -r requirements-docs.txt
sphinx-build -b html . _build/html
```

Then open `docs/_build/html/index.html` in your browser.

| Doc | Contents |
|-----|----------|
| Sphinx site | Product guide, concepts, admin, development |
| [RUNBOOK.md](RUNBOOK.md) | Install, database, seed, tests |
| [docs/workboard/roadmap.md](docs/workboard/roadmap.md) | Capability phases |

---

## Quick start (Workboard)

Workboard is the runnable product in this repo today.

**Prerequisites:** Python 3.12+, Node.js 20+

```bash
git clone https://github.com/1-OpenSource/OneOpen-Loom.git
cd OneOpen-Loom

# API
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows
# source .venv/bin/activate           # macOS / Linux
python -m pip install -r requirements.txt
copy .env.example .env                # Windows
# cp .env.example .env
python -m alembic upgrade head
python -m app.scripts.seed            # optional
uvicorn app.main:app --reload --port 8000
```

```bash
# UI
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. API: **http://localhost:8000**.

### Demo login (after seed)

| Email | Password |
|-------|----------|
| `akhil@oneopen.dev` | `password123` |

### Docker (API + Postgres)

```bash
docker compose up --build
```

Run the frontend locally against that API. Details: [RUNBOOK.md](RUNBOOK.md).

---

## OneOpen ecosystem

| Project | Role |
|---------|------|
| **[OneOpen Loom](https://github.com/1-OpenSource/OneOpen-Loom)** | Collaboration suite (Workboard + future products) |
| **[OneOpen Flow](https://github.com/1-OpenSource/OneOpen-Flow)** | Visual workflow orchestration & validation |

---

## Contributing

- Suite-level changes (docs structure, branding, shared platform): discuss in Loom issues/PRs  
- Workboard features and bugs: same repo — keep PRs focused; follow patterns in `backend/app` and `frontend/src`  
- Build Sphinx docs before doc PRs: `sphinx-build -b html docs docs/_build/html`

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).

---

<p align="center">
  <sub>OneOpen Loom · Suite home for Workboard and future products · <a href="https://oneopensource.org">OneOpenSource</a></sub>
</p>
