# Workboard ↔ Magicboard connector

Optional integration when both products are deployed.

## Environment

| Side | Variable | Example |
|------|----------|---------|
| Workboard API | `MAGICBOARD_API_URL` | `http://localhost:8002` |
| Workboard SPA | `VITE_MAGICBOARD_APP_URL` | `http://localhost:5174` |
| Workboard SPA | `VITE_MAGICBOARD_API_URL` | `http://localhost:8002` |
| Magicboard API | `WORKBOARD_API_URL` | `http://localhost:8001` |
| Magicboard SPA | `VITE_WORKBOARD_APP_URL` | `http://localhost:5173` |
| Magicboard SPA | `VITE_WORKBOARD_API_URL` | `http://localhost:8001` |

Use the **same `SECRET_KEY`** (or shared SSO) so JWTs work across both APIs.

## Responsibilities

- **Magicboard** owns spaces and pages.
- **Workboard** owns `work_item_pages` links and the Documentation panel.
- Macros / suite search call the other product only when its URL is configured.
