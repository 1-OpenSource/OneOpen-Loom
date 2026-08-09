# Magicboard overview

**OneOpen Magicboard** is Loom’s knowledge and documentation product.

| | |
|---|---|
| **Loom** | Collaboration suite (slate weave mark in `docs/logo.svg`) |
| **Workboard** | Work management & delivery |
| **Magicboard** | Spaces, pages, templates, and docs linked to work |

Magicboard is **not** Workboard. The Kanban *workboard* view stays inside Workboard.

## Capabilities

- Spaces with unique keys and optional member roles  
- Hierarchical pages (tree), slugs, draft/published status  
- TipTap WYSIWYG authoring with Insert / slash menu (images, video, files, tables, panels, TOC, includes, work-item smart cards)  
- Autosave as **Draft**; **Publish** sets published  
- Optional live collaborative editing (Yjs / Hocuspocus)  
- Templates (blank, meeting notes, decision record, runbook)  
- Version history + restore  
- Comments, watch, favorites, recently viewed  
- Workspace share links  
- Attachments on pages  
- Full-text search and suite search (pages + work items via Workboard connector)  
- Hierarchical URLs (`/magicboard/{spaceKey}/{pageSlug}`)  
- Import / export Markdown  
- Deep links from Workboard work items  

## Documentation

- Product brand: [brand.md](brand.md), logo: [logo.svg](logo.svg)  
- Full Sphinx guide (suite site): `docs/magicboard/` — build with `cd docs && sphinx -b html . _build/html`

## Open Magicboard

In the app shell, use the product switcher or open `/magicboard`.

Local ports:

| Service | Port |
|---------|------|
| API | `8002` |
| SPA | `5174` |
| Collab WS | `1234` (optional) |

### Migrate legacy markdown → HTML

```bash
cd magicboard/backend
python -m app.scripts.migrate_page_content --dry-run
python -m app.scripts.migrate_page_content
```

### Live collaboration

1. `cd magicboard/collab && npm install && npm run dev`
2. Set `VITE_COLLAB_URL=ws://localhost:1234` for the SPA
3. Optionally set `MAGICBOARD_API_URL=http://localhost:8002` for the collab process

### Workboard connector

Set `WORKBOARD_API_URL` on the Magicboard API. Suite search and Insert → Work item use the connector when enabled.
