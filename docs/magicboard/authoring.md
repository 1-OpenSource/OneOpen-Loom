# Authoring in Magicboard

## TipTap editor

Edit mode uses a **TipTap** (ProseMirror) WYSIWYG editor.

- Toolbar formatting: bold, italic, underline, headings, lists, code, undo/redo
- **Insert** menu and **`/` slash** command palette
- Content is stored as **HTML** on the page (`SpacePage.content`)
- Custom nodes serialize with stable `data-mb-*` attributes for read mode

### Insert gallery

| Insert | Behavior |
|--------|----------|
| Image | Upload or URL → image node |
| Video | YouTube / Vimeo / Loom embeds (allowlisted) |
| File | Upload → file card |
| Link | Link mark |
| Table | Editable table |
| Code block | Language-aware code |
| Info / Warning / Note / Tip | Panel callouts |
| Status / Date / Emoji | Inline chips |
| Divider | Horizontal rule |
| TOC | Table of contents node |
| Include page | Embed another page by slug |
| Mention | `@` name insert |
| Work item | Smart card (requires Workboard connector) |

## Draft autosave and Publish

While editing:

1. Changes debounce-autosave as **`DRAFT`** (status text: “Draft saved”).
2. Sidebar title updates when the title changes.
3. **Publish** sets status to **`PUBLISHED`** and exits edit mode.

## Read view

Published/draft content renders as sanitized HTML. Legacy markdown pages still render via the markdown+macros path until migrated or first saved as HTML.

## Templates

`GET` templates list; create with `POST /spaces/{id}/pages/from-template`.

Templates:

- `blank`
- `meeting_notes`
- `decision_record`
- `runbook`

## Permissions

Space members with `VIEW` / `EDIT` / `ADMIN`. Open spaces (no members) allow workspace members to edit.

## Share links

`POST /pages/{id}/share-links` → workspace-member share path. Revoke with `DELETE /share-links/{id}`.

## Hierarchical paths

Frontend: `/magicboard/:spaceKey/:pageSlug`  
API: `GET /workspaces/{id}/magicboard/resolve?space_key=&page_slug=`

## Legacy macros

Older markdown content may still use:

```text
{{toc}}
{{info:message}}
{{include:page-slug}}
{{workitem:PROJ-12}}
```

These convert to TipTap/HTML nodes on open or via `python -m app.scripts.migrate_page_content`.
