# Magicboard overview

**OneOpen Magicboard** is Loom’s knowledge and documentation product.

It is **independent of Workboard**: install and run only `magicboard/` if you do not need work tracking.

| | |
|---|---|
| **Loom** | Collaboration suite (slate weave mark: `docs/logo.svg`) |
| **Workboard** | Work management (`backend/` + `frontend/`, orange kanban mark) |
| **Magicboard** | Spaces & pages (`magicboard/`, teal folio mark) |

## What Magicboard is for

| Job | Surface |
|-----|---------|
| Organize knowledge | Spaces with keys and optional members |
| Write docs | Hierarchical pages, TipTap WYSIWYG |
| Control visibility | Draft vs published status |
| Reuse structure | Templates (blank, meeting notes, decision, runbook) |
| Collaborate | Comments, watch, favorites, optional live editing |
| Attach evidence | Page attachments, images, file cards |
| Find content | Full-text search; suite search when Workboard is connected |

## Stack

| Layer | Technology |
|-------|------------|
| API | FastAPI — http://localhost:8002 |
| SPA | React / Vite — http://localhost:5174 |
| Optional collab | Hocuspocus / Yjs — ws://localhost:1234 |

## Product logo

Sphinx and README use [`logo.svg`](logo.svg) (teal folio). Brand notes: [branding](branding.md) and `magicboard/docs/brand.md`.

## Next

- [Quick start](quickstart.md)
- [Concepts](concepts.md)
- [Authoring](authoring.md)
