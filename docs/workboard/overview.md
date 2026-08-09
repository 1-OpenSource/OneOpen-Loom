# Overview

**OneOpen Workboard** is Loom’s product for tracking and delivering work.

It sits inside the **OneOpen Loom** suite the same way a work-management app
sits inside a broader collaboration platform: Loom is the home; Workboard is
the delivery engine.

## What Workboard is for

| Job | Surface |
|-----|---------|
| Organize teams | Workspaces, members, groups, invitations |
| Scope delivery | Projects with keys and roles |
| Capture work | Work items (epic, story, task, bug, subtask) |
| Prioritize | Ranked backlog and hierarchy |
| Execute | Workboard (Kanban stages), sprints |
| Govern process | Workflows, transition rules, issue-type schemes |
| Find work | Navigator + OQL |
| Serve requesters | Service queues + customer portal |
| Operate the org | Administration (SSO, branding, SMTP, domains, apps) |

## What Workboard is not

- **Not the whole Loom suite** — Spaces and other Loom products are separate surfaces.
- **Not only a board** — the Kanban **workboard** is one view; backlog, detail, sprints, and admin are first-class too.

## Stack

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript, Vite |
| API | FastAPI, SQLAlchemy, Alembic, JWT |
| Data | SQLite (local) or PostgreSQL (Docker / production-style) |

## Related docs

- {doc}`quickstart` — run Workboard locally
- {doc}`concepts` — vocabulary and product model
- Suite README on GitHub — Loom umbrella overview
