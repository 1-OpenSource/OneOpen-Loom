# Concepts

## Loom vs Workboard

```{mermaid}
flowchart TB
  Loom[OneOpen Loom suite]
  WB[Workboard product]
  SP[Spaces roadmap]
  Loom --> WB
  Loom --> SP
```

| Term | Meaning |
|------|---------|
| **Loom** | Collaboration suite / umbrella |
| **Workboard** | Work-management product in this repo |
| **workboard** (lowercase) | The Kanban board *view* inside a project |

## Core objects

### Workspace

Organization boundary. Owns members, branding, SSO, SMTP, domains, and apps.

### Project

Delivery container with a short **key** (for example `LOOM`). Work items are numbered `KEY-1`, `KEY-2`, …

### Work item

Unit of work: epic, story, task, bug, or subtask — with status, priority, assignee, labels, comments, attachments, and links.

### Stage vs blocked

Board columns are delivery **stages** (`TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`).

**Blocked** is an interruption **flag** (`is_blocked`), not a column. Blocked items stay in their stage and show a badge.

### Workboard (view)

Kanban surface mapped to stages, with drag-and-drop and transition rules.

### OQL

**OneOpen Query Language** — filter language used in Navigator and service queues.

### Issue-type scheme

Controls which work item types a project may create.

### Workflow transition rules

Per transition: **conditions**, **validators**, and **post-functions** enforced when status changes.
