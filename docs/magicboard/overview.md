# Magicboard overview

**OneOpen Magicboard** is Loom’s knowledge and documentation product.

## Capabilities

| Area | Details |
|------|---------|
| Spaces | Keys, optional member roles |
| Pages | Hierarchy, slugs, draft/published |
| Authoring | TipTap WYSIWYG, Insert / slash menu |
| Collaboration | Comments, watch, favorites; optional live editing |
| Templates | Blank, meeting notes, decision record, runbook |
| Search | Full-text; suite search when Workboard is connected |
| Other | Attachments, share links, import/export, versions |

## Stack

| Layer | Location |
|-------|----------|
| API | FastAPI — http://localhost:8002 |
| SPA | React / Vite — http://localhost:5174 |
| Optional collab | Hocuspocus / Yjs — ws://localhost:1234 |

## Next

- [Quick start](quickstart.md)
- [Concepts](concepts.md)
- [Authoring](authoring.md)
