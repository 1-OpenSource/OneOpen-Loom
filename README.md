<p align="center">
  <img src="docs/logo.svg" alt="OneOpen Loom" width="96" height="96">
</p>

<h1 align="center">OneOpen Loom</h1>

<p align="center">
  <strong>Open-source work management for teams that ship</strong><br>
  Workspaces, projects, work items, boards, sprints, service queues, spaces, and enterprise admin — in one coherent product.
</p>

<p align="center">
  <a href="https://github.com/1-OpenSource/OneOpen-Loom"><img alt="Status" src="https://img.shields.io/badge/status-active-14b8a6?style=flat-square"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square"></a>
  <a href="https://www.python.org/"><img alt="Python" src="https://img.shields.io/badge/python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white"></a>
  <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=black"></a>
  <a href="https://fastapi.tiangolo.com/"><img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white"></a>
  <a href="https://oneopensource.org"><img alt="OneOpenSource" src="https://img.shields.io/badge/part%20of-OneOpenSource-14b8a6?style=flat-square"></a>
</p>

<p align="center">
  <a href="#why-oneopen-loom">Why Loom</a> ·
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#how-to-use-loom">How to use</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#documentation">Docs</a> ·
  <a href="#oneopen-ecosystem">Ecosystem</a>
</p>

---

## Why OneOpen Loom?

Modern teams need more than a sticky-note board. Delivery spans backlog grooming, sprint execution, cross-team roadmaps, customer requests, documentation, and admin controls for identity and branding.

**OneOpen Loom** is the open-source work management hub of the [OneOpenSource](https://oneopensource.org) suite. It gives communities and companies a single place to:

- plan and track work across workspaces and projects  
- run Scrum and Kanban delivery on a real workboard  
- query and filter work with **OQL** (OneOpen Query Language)  
- operate a lightweight service desk with queues and a customer portal  
- publish internal docs in **Spaces**  
- administer users, permissions, SSO, branding, email, and domains  

Loom is designed to feel product-complete day one, while staying simple enough to run on a laptop with SQLite.

---

## Features

| Area | What you get |
|------|----------------|
| **Workspaces & projects** | Multi-workspace orgs, project keys, roles, invitations |
| **Work items** | Epics, stories, tasks, bugs, subtasks — with comments, attachments, links, watchers |
| **Workboard** | Drag-and-drop Kanban, stage transitions, blocked flag, WIP-aware columns |
| **Backlog & ranking** | Ranked lists, hierarchy, parent/epic relationships |
| **Sprints** | Sprint planning and sprint boards |
| **Workflows** | Statuses, transitions, conditions / validators / post-functions |
| **Fields** | Labels, components, custom fields, issue-type schemes |
| **Navigator + OQL** | Saved filters and a query language for finding work fast |
| **Reports & dashboards** | Agile charts plus configurable dashboard gadgets |
| **Roadmaps & calendar** | Timeline and calendar views for planning |
| **Releases & time** | Versions, releases, work logs / estimates |
| **Service desk** | Queues, request types, customer portal |
| **Spaces** | Wiki-style documentation pages |
| **Administration** | Users, groups, permissions, apps/marketplace, SMTP, domains/DNS, branding, SSO (OIDC/SAML), GDPR export |
| **Integrations** | Plugins, Slack config, API tokens, PWA install |

---

## Quick start

### Option A — Local (fastest)

**Prerequisites:** Python 3.12+, Node.js 20+

```bash
git clone https://github.com/1-OpenSource/OneOpen-Loom.git
cd OneOpen-Loom

# Backend
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

python -m pip install -r requirements.txt
copy .env.example .env          # Windows
# cp .env.example .env          # macOS / Linux

python -m alembic upgrade head
python -m app.scripts.seed      # optional demo data
uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — API at **http://localhost:8000**, OpenAPI at **http://localhost:8000/docs**.

### Option B — Docker (API + Postgres)

```bash
git clone https://github.com/1-OpenSource/OneOpen-Loom.git
cd OneOpen-Loom
docker compose up --build
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| OpenAPI | http://localhost:8000/docs |
| Postgres | `localhost:5432` |

Run the frontend locally (`cd frontend && npm install && npm run dev`) against that API.

### Demo login (after seed)

| Email | Password |
|-------|----------|
| `akhil@oneopen.dev` | `password123` |

Other seeded users (`maria@oneopen.dev`, `samir@oneopen.dev`, `ivy@oneopen.dev`) use the same password. For real work, register your own owner account instead.

---

## How to use Loom

### 1. Create a workspace

After signing in, create a **workspace**. This is your organization boundary — members, branding, SSO, SMTP, and domains are managed here under **Administration**.

### 2. Create a project

Inside a workspace, create a **project** with a short key (e.g. `LOOM`). Work items will be numbered `LOOM-1`, `LOOM-2`, and so on.

### 3. Capture work

Use **Backlog** / work items to create epics, stories, tasks, and bugs. Open any item for:

- description & acceptance criteria  
- assignee, priority, labels, components  
- comments, attachments, links, subtasks  
- activity history  

### 4. Deliver on the Workboard

Open **Board** to move items across stages (`To do` → `In progress` → `In review` → `Done`). Mark interruptions with the **blocked** flag without inventing a fake column.

Configure columns, WIP limits, statuses, and transitions under **Administration → Workflows** or project board settings.

### 5. Plan in sprints (optional)

For Scrum teams, create sprints, pull ranked backlog items in, and track delivery on the sprint board.

### 6. Find work with OQL

Use **Navigator** to filter with OneOpen Query Language, for example:

```text
type = STORY AND status != DONE ORDER BY priority DESC
assignee = currentUser() AND status = "IN_PROGRESS"
```

Save useful queries as filters.

### 7. Serve customers

For service-style projects, open **Queues**, define OQL-backed queues, and share the **customer portal** link so requesters can submit tickets without a full Loom seat.

### 8. Document in Spaces

Use **Spaces** for runbooks, ADRs, and team docs next to the work that references them. Richer knowledge surfaces continue to expand here over time.

### 9. Administer the workspace

Workspace **Owners** and **Admins** open **Administration** to manage:

| Section | Purpose |
|---------|---------|
| Users / Groups | Membership, invites, team access |
| Permissions | Project permission schemes |
| Issue types / Workflows | Type schemes, statuses, transition rules |
| Apps / Marketplace | Plugins and catalog installs |
| Email | BYO SMTP + templates |
| Domains | Custom hosts + DNS automation (incl. mock provider for local) |
| Branding | Logo, accent color, brand name / tagline (applied in the shell) |
| Security | API tokens, OIDC/SAML SSO, GDPR export |
| General | Workspace profile; owner-only delete |

---

## Architecture

```text
┌─────────────────┐     REST / JWT      ┌──────────────────────┐
│  React + Vite   │ ──────────────────► │  FastAPI + SQLAlchemy│
│  (frontend)     │ ◄────────────────── │  Alembic migrations  │
└─────────────────┘                     └──────────┬───────────┘
                                                   │
                                        ┌──────────▼───────────┐
                                        │ SQLite (dev) or      │
                                        │ PostgreSQL (Docker)  │
                                        └──────────────────────┘
```

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | FastAPI, SQLAlchemy, Alembic, JWT |
| Data | SQLite locally · PostgreSQL via Compose |
| Auth | Email/password, API tokens, OIDC/SAML config |

---

## Repository layout

```text
OneOpen-Loom/
├── backend/          # FastAPI app, migrations, tests, seed
├── frontend/         # React SPA
├── docs/             # Product roadmap & gap analysis
├── docker-compose.yml
├── RUNBOOK.md        # Detailed ops / DB / test commands
└── README.md
```

---

## Documentation

| Doc | Contents |
|-----|----------|
| [RUNBOOK.md](RUNBOOK.md) | Prerequisites, DB choice, seed, Docker, tests |
| [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) | Shipped capability phases |
| [docs/PRODUCT_GAP_ANALYSIS.md](docs/PRODUCT_GAP_ANALYSIS.md) | Product model & coherence notes |
| http://localhost:8000/docs | Live OpenAPI reference |

---

## Configuration

Backend reads `backend/.env` (from `.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `sqlite:///./oneopen_loom.db` or Postgres URL |
| `SECRET_KEY` | JWT signing secret (**change in production**) |
| `CORS_ORIGINS` | Allowed frontend origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |

Frontend:

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API base (default `http://localhost:8000`) |

---

## Development commands

```bash
# Backend tests
cd backend
python -m pytest tests

# Frontend production build
cd frontend
npm run build
```

---

## OneOpen ecosystem

Loom is the **work management** product in OneOpenSource. It pairs naturally with:

| Project | Role |
|---------|------|
| **[OneOpen Loom](https://github.com/1-OpenSource/OneOpen-Loom)** | Plan, track, and deliver work |
| **[OneOpen Flow](https://github.com/1-OpenSource/OneOpen-Flow)** | Visual workflow orchestration & validation (can open Loom defects from failures) |

More OneOpen surfaces (knowledge, ML, automation) continue to land as separate repos under [1-OpenSource](https://github.com/1-OpenSource).

---

## Contributing

1. Fork and clone the repo  
2. Use the Quick start flow above  
3. Keep changes focused; match existing patterns in `backend/app` and `frontend/src`  
4. Run backend tests / frontend `tsc` before opening a PR  
5. Prefer clear PR summaries and a short test plan  

Issues and pull requests are welcome for bugs, UX polish, and capability gaps listed in the product docs.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).

---

<p align="center">
  <sub>Built for open-source communities · Part of <a href="https://oneopensource.org">OneOpenSource</a></sub>
</p>
