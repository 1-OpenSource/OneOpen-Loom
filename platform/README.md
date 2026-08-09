# OneOpen Loom — platform contract

Shared identity used by **Workboard** and **Magicboard**.

## What is shared

| Concern | Contract |
|---------|----------|
| Auth | JWT (`sub` = user id), same `SECRET_KEY` when products share a suite login |
| Users | `users` table / equivalent email+password identity |
| Workspaces | `workspaces` + `workspace_members` with roles OWNER/ADMIN/MEMBER/VIEWER |
| Branding | `logo_url`, `accent_color`, `brand_name`, `brand_tagline` on workspace |

## Independence

- **Magicboard** ships its own API + SPA under `magicboard/` and can run with only its database (users, workspaces, spaces).
- **Workboard** ships under `backend/` + `frontend/` and can run without Magicboard.
- Optional integration uses HTTP + the same JWT when both are deployed:

| Product | Env |
|---------|-----|
| Magicboard API | `WORKBOARD_API_URL` (optional) |
| Magicboard SPA | `VITE_WORKBOARD_API_URL`, `VITE_WORKBOARD_APP_URL` (optional) |
| Workboard API | `MAGICBOARD_API_URL` (optional) |
| Workboard SPA | `VITE_MAGICBOARD_APP_URL` (optional) |

## Not shared

Projects, work items, sprints, boards, workflows, and `work_item_pages` live in Workboard (connector). Spaces and pages live in Magicboard.
