# Magicboard overview

**OneOpen Magicboard** is Loom’s knowledge and documentation product.

It is **independent of Workboard**: install and run only `magicboard/` if you do not need work tracking.

| | |
|---|---|
| **Loom** | Collaboration suite |
| **Workboard** | Work management & delivery (`backend/` + `frontend/`) |
| **Magicboard** | Spaces & pages (`magicboard/`) |

## Run alone

See [magicboard/README.md](../../magicboard/README.md) — API on port **8002**, SPA on **5174**.

## Optional Workboard integration

When both products are deployed with connector env vars (see `platform/README.md`):

- Work item Documentation panel links Magicboard pages  
- `{{workitem:KEY}}` macros resolve live status  
- Suite search merges pages + work items  

## Capabilities

- Spaces with keys and member roles  
- Hierarchical pages, slugs, draft/published  
- Markdown macros (`toc`, `workitem`, `info`, `include`)  
- Templates, versions, comments, watch, favorites  
- Attachments, share links, import/export  
