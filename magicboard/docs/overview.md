# Magicboard overview

**OneOpen Magicboard** is Loom’s knowledge and documentation product.

## Capabilities

- Spaces with keys and optional member roles
- Hierarchical pages, draft/published status
- TipTap WYSIWYG authoring (Insert / slash menu)
- Autosave as draft; Publish sets published
- Optional live collaborative editing (Yjs / Hocuspocus)
- Templates, versions, comments, watch, favorites
- Attachments, share links, search
- Optional Workboard connector (suite search, work-item cards)

## Ports

| Service | Port |
|---------|------|
| API | `8002` |
| SPA | `5174` |
| Collab WS | `1234` (optional) |

Sphinx guide: `docs/magicboard/` (`cd docs && sphinx -b html . _build/html`).

### Migrate legacy markdown → HTML

```bash
cd magicboard/backend
python -m app.scripts.migrate_page_content --dry-run
python -m app.scripts.migrate_page_content
```

### Live collaboration

```bash
cd magicboard/collab && npm install && npm run dev
```

Set `VITE_COLLAB_URL=ws://localhost:1234` on the SPA. Optionally set `MAGICBOARD_API_URL=http://localhost:8002` for the collab process.

### Workboard connector

Set `WORKBOARD_API_URL` on the Magicboard API.
