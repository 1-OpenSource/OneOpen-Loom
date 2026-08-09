# OneOpen Magicboard

Standalone **team knowledge & documentation** product in the OneOpen Loom suite.

Magicboard runs **without Workboard**. Optional Workboard integration is env-gated.

**Brand:** Ink ledger (celadon folio mark) — see [docs/brand.md](docs/brand.md). Distinct from Workboard’s orange kanban identity.

## Quick start

### API (port 8002)

```bash
cd magicboard/backend
python -m pip install -r requirements.txt
copy .env.example .env
python -m app.scripts.seed
uvicorn app.main:app --reload --port 8002
```

### SPA (port 5174)

```bash
cd magicboard/frontend
npm install
npm run dev
```

| | URL |
|---|---|
| Magicboard UI | http://localhost:5174 |
| API | http://localhost:8002 |
| Health | http://localhost:8002/health |

Demo login (after seed): `akhil@oneopen.dev` / `password123`

## Optional Workboard connector

```env
# magicboard/backend/.env
WORKBOARD_API_URL=http://localhost:8001

# magicboard/frontend/.env
VITE_WORKBOARD_API_URL=http://localhost:8001
VITE_WORKBOARD_APP_URL=http://localhost:5173
```

When unset, page search is pages-only and `{{workitem:KEY}}` shows “Workboard not connected”.

## Layout

```text
magicboard/
├── backend/     # FastAPI — auth, workspaces, spaces/pages
├── frontend/    # React SPA — Magicboard shell only
└── docs/        # Product docs
```

Platform identity contract: [`../platform/README.md`](../platform/README.md).
