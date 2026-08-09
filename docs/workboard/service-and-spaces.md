# Service desk and Magicboard

## Service desk (Workboard)

Service-oriented projects can expose:

| Capability | Description |
|------------|-------------|
| **Queues** | Named queues backed by OQL filters |
| **Portal** | Public request form at `/portal/{projectKey}` |
| **Request types** | Categorize incoming requests |

Share the portal link with customers who should not need a full Workboard seat.

## Magicboard (Loom knowledge product)

**Magicboard** is Loom’s documentation product (spaces & pages). It is a sibling of Workboard, not a board view.

- Open `/magicboard` from the product switcher  
- Link pages from a work item’s **Documentation** panel  
- Embed work items in pages with `{{workitem:KEY}}`  

See {doc}`../magicboard/overview` and {doc}`../magicboard/workboard-integration`.
