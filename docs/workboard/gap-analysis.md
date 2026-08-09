# Product Gap Analysis — OneOpen Workboard

Phase 1 establishes a coherent Kanban product model:

| Surface | Job |
|---|---|
| **Work Items (list)** | Backlog / inventory |
| **Workboard** | Delivery stages (`TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`) |
| **Work item detail** | Full edit context |
| **Board stages** | Named columns for the workboard |

`BLOCKED` is an interruption **flag** (`is_blocked`), not a board column.

For the full phased engineering plan, see {doc}`roadmap`.

---

## We already have (basic)

- Workspaces, projects, members/roles, invitations
- Work items CRUD, comments, attachments, links, activity/audit
- Kanban-style board with drag-and-drop and constrained stage transitions
- Blocked flag with badge + filter (list and board)
- Shared type catalog across list, board filters, and create
- Workspace-level search
- Labels model, story points, due dates
- Project overview with stage breakdown and recent work items

---

## Partial / thin → mapped to roadmap phases

| Area | Phase |
|---|---|
| Ranked backlog / hierarchy | 2 |
| Sprints | 3 |
| Workflow designer / board mapping / WIP | 4 |
| Labels / components / custom fields | 5 |
| Work item navigator / OQL | 6 |
| Agile reports | 7 |
| Automation / webhooks / notifications | 8 |
| Roadmaps / epics / plans | 9 |
| Releases / versions / time | 10 |
| Dashboards / templates | 11 |
| Service management | 12 |
| Spaces (docs) | 13 |
| Permissions / SSO / compliance | 14 |
| Integrations / PWA / apps | 15 |

---

## Phase 1 success criteria (coherence)

- List = backlog, board = stages, blocked = interruption flag
- Board has four delivery columns; blocked items remain in their stage with a badge
- Illegal status jumps are rejected with a clear message
- List, board, and create share the same type/status vocabulary
- Project overview shows real stage counts
