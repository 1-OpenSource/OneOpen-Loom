# Projects and work items

## Create a workspace

After sign-in, create a **workspace**. Invite teammates and assign roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).

Owners and admins can open **Administration** for security, branding, email, and domains.

## Create a project

Inside a workspace, create a **project** with a unique key. Choose product type when relevant (software / service / business).

Project members can have project-scoped roles in addition to workspace membership.

## Work items

Create items from the backlog list, board, or detail flows:

| Type | Typical use |
|------|-------------|
| Epic | Large outcome spanning many items |
| Story | User-facing slice of value |
| Task | Implementation work |
| Bug | Defect |
| Subtask | Child of another item |

Each item supports:

- Title, description, acceptance criteria  
- Status, priority, assignee, reporter  
- Labels, components, custom fields  
- Comments, attachments, links, watchers  
- Activity / audit history  

## Backlog and ranking

Use the work item list as inventory. Rank items to express priority. Hierarchy (parent / epic) keeps large efforts structured.

## Finding work

Open **Navigator** and query with OQL, for example:

```text
type = STORY AND status != DONE ORDER BY priority DESC
assignee = currentUser() AND status = "IN_PROGRESS"
```

Save useful queries as filters for reuse on dashboards and queues.
