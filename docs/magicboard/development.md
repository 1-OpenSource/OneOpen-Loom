# Magicboard development

## Layout

```text
magicboard/
├── backend/          # FastAPI app (port 8002)
│   ├── app/
│   │   ├── api/
│   │   ├── services/          # includes content_migrate.py
│   │   └── scripts/           # seed.py, migrate_page_content.py
│   └── tests/
├── frontend/         # React SPA (port 5174)
│   └── src/components/magicboard/editor/   # TipTap
├── collab/           # Optional Hocuspocus server (port 1234)
└── docs/             # Product brand + overview (see also Sphinx docs/magicboard/)
```

## Backend

```bash
cd magicboard/backend
python -m pip install -r requirements.txt
pytest -q
python -m app.scripts.migrate_page_content --dry-run
```

## Frontend

```bash
cd magicboard/frontend
npm install
npm run build    # tsc + vite
npm run dev
```

## Content migration

`python -m app.scripts.migrate_page_content` rewrites legacy markdown/macros to TipTap HTML. Idempotent; skips rows that already look like HTML.

Shared rules live in:

- Python: `app/services/content_migrate.py`
- TypeScript: `frontend/src/components/magicboard/editor/legacyMarkdown.ts`

## Collab server

```bash
cd magicboard/collab
npm install
npm run dev
```

Auth: client JWT; server calls Magicboard `GET /api/pages/{pageId}`.

## Sphinx

Suite docs (including this guide) build from the repo `docs/` tree:

```bash
cd docs
python -m pip install -r requirements-docs.txt
python -m sphinx -b html . _build/html
```
