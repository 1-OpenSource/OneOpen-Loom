# Workboard integration

Magicboard and Workboard share Loom workspace identity (login, members, branding).

## Linked documentation on work items

On a work item detail page, the **Documentation** panel can:

- List linked Magicboard pages  
- Link an existing page  
- Create a page from a template in a chosen space  
- Unlink a page  
- Open the page in Magicboard  

APIs:

- `POST/GET /work-items/{id}/pages`  
- `DELETE /work-items/{id}/pages/{page_id}`  
- `GET /pages/{id}/work-items`  

## Work item macros in pages

In Magicboard page content:

```text
{{workitem:PROJ-12}}
```

The editor preview loads a live card via `GET /workspaces/{id}/work-items/by-key/{key}`.

Other macros:

| Macro | Effect |
|-------|--------|
| `{{toc}}` | Table of contents from headings |
| `{{info:message}}` | Callout panel |
| `{{include:page-slug}}` | Transclude another page body |

## Automation

Workflow **post-function** `create_magicboard_page` (config: `space_id`, optional `template_key`, `title`) creates a page and links it when a work item transitions.

## Suite search

`GET /workspaces/{id}/suite-search?q=` returns Magicboard pages and Workboard items together.
