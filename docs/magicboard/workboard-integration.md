# Workboard integration

Magicboard and Workboard can share Loom workspace identity (login, members, branding) and an **optional HTTP connector**.

Magicboard runs **without** Workboard. Integration is env-gated.

## Connector configuration

| Side | Variable | Purpose |
|------|----------|---------|
| Magicboard API | `WORKBOARD_API_URL` | Base URL of Workboard API (e.g. `http://localhost:8001`) |
| Magicboard SPA | `VITE_WORKBOARD_APP_URL` | Deep links into Workboard UI |
| Workboard SPA | `VITE_MAGICBOARD_APP_URL` | Open Magicboard from Workboard |
| Workboard | Magicboard API URL vars | Docs panel / redirects (see `platform/README.md`) |

`GET /health` on Magicboard reports `workboard_connector: true|false`.

## Linked documentation on work items

On a Workboard work item, the **Documentation** panel can list, link, create, and unlink Magicboard pages (when the Workboard app is wired to Magicboard).

Typical APIs (Workboard side / shared contract):

- `POST/GET /work-items/{id}/pages`
- `DELETE /work-items/{id}/pages/{page_id}`
- `GET /pages/{id}/work-items`

## Work item smart cards

In Magicboard TipTap, use **Insert → Work item** (or `/` → Work item) to search and insert a smart card.

Connector routes on Magicboard:

- `GET /workspaces/{id}/connector/work-items/search?q=`
- `GET /workspaces/{id}/connector/work-items/by-key/{key}`

Legacy markdown `{{workitem:PROJ-12}}` still converts to a card node.

UI labels say **Work item** (not third-party tracker names).

## Suite search

`GET /workspaces/{id}/suite-search?q=` returns Magicboard pages; when the connector is enabled, Workboard hits are merged into `work_items`.

## See also

- ``platform/README.md`` — shared identity and env contract  
- ``workboard/connectors/magicboard/`` — connector notes in the repo  
