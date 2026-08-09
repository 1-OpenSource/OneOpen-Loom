<p align="center">
  <img src="docs/logo.svg" alt="OneOpen Loom" width="112" height="112">
</p>

<h1 align="center">OneOpen Loom</h1>

<p align="center">
  <strong>The open-source collaboration suite</strong><br>
  Plan work. Capture knowledge. Keep teams aligned.
</p>

<p align="center">
  <a href="https://github.com/1-OpenSource/OneOpen-Loom"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-1--OpenSource%2FOneOpen--Loom-1e293b?style=flat-square&logo=github"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square"></a>
  <a href="https://oneopensource.org"><img alt="OneOpenSource" src="https://img.shields.io/badge/OneOpenSource-suite-0f766e?style=flat-square"></a>
</p>

<p align="center">
  <a href="#why-loom">Why Loom</a> ·
  <a href="#the-suite">The suite</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#documentation">Documentation</a>
</p>

---

## Why Loom

Modern teams split delivery and documentation across too many tools. **OneOpen Loom** brings them together as one open suite—shared identity, shared workspaces, and products that connect when you need them.

- **Ship with clarity** — track work from backlog to done  
- **Write what lasts** — spaces and pages for decisions, runbooks, and specs  
- **Stay connected** — optional links between work items and documentation  
- **Own your stack** — Apache 2.0, self-hostable, built for real teams  

---

## The suite

<p align="center">
  <img src="docs/logo.svg" alt="Loom" width="72" height="72">
  &nbsp;&nbsp;&nbsp;
  <img src="docs/workboard/logo.svg" alt="Workboard" width="72" height="72">
  &nbsp;&nbsp;&nbsp;
  <img src="docs/magicboard/logo.svg" alt="Magicboard" width="72" height="72">
</p>

<p align="center">
  <em>Loom</em> &nbsp;·&nbsp; <em>Workboard</em> &nbsp;·&nbsp; <em>Magicboard</em>
</p>

| | |
|---|---|
| **Loom** | The suite — shared platform contracts and documentation home |
| **[Workboard](#workboard)** | Work management and delivery |
| **[Magicboard](#magicboard)** | Knowledge, spaces, and pages |

### Workboard

<img src="docs/workboard/logo.svg" alt="Workboard" width="48" height="48" align="left" hspace="12">

**Workboard** is where delivery happens: workspaces and projects, ranked backlogs, Kanban boards, sprints, workflows, service queues, and administration—so teams can plan, prioritize, and finish work in one place.

<br clear="all">

| | |
|---|---|
| SPA | [`frontend/`](frontend/) → http://localhost:5173 |
| API | [`backend/`](backend/) → http://localhost:8001 |

### Magicboard

<img src="docs/magicboard/logo.svg" alt="Magicboard" width="48" height="48" align="left" hspace="12">

**Magicboard** is where knowledge lives: spaces and hierarchical pages, TipTap authoring, draft and publish, templates, versions, search, and optional live collaboration—so decisions and runbooks stay close to the work.

<br clear="all">

| | |
|---|---|
| SPA | [`magicboard/frontend/`](magicboard/frontend/) → http://localhost:5174 |
| API | [`magicboard/backend/`](magicboard/backend/) → http://localhost:8002 |

Cross-product links (docs on work items, work-item cards in pages, suite search) are available when both products are configured. See [`platform/README.md`](platform/README.md).

---

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

| Service | URL |
|---------|-----|
| Workboard | http://localhost:5173 |
| Magicboard | http://localhost:5174 |
| Workboard API | http://localhost:8001 |
| Magicboard API | http://localhost:8002 |

Demo login (after seed): `akhil@oneopen.dev` / `password123`

```bash
docker compose up --build
```

Operations: [RUNBOOK.md](RUNBOOK.md).

---

## Documentation

```bash
cd docs
python -m pip install -r requirements-docs.txt
python -m sphinx -b html . _build/html
```

Open `docs/_build/html/index.html` for the suite guides (`docs/workboard/`, `docs/magicboard/`).

---

## Repository

```text
OneOpen-Loom/
├── docs/                 # Suite Sphinx + product logos
├── platform/             # Shared identity contracts
├── magicboard/           # Magicboard API + SPA
├── backend/              # Workboard API
├── frontend/             # Workboard SPA
├── workboard/connectors/ # Integration notes
└── docker-compose.yml
```

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).

<p align="center">
  <img src="docs/logo.svg" alt="OneOpen Loom" width="48" height="48"><br>
  <sub>Part of <a href="https://oneopensource.org">OneOpenSource</a></sub>
</p>
