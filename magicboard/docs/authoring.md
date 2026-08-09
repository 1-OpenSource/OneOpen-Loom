# Authoring in Magicboard

## Spaces

Create a space with a short **key** (e.g. `ENG`). Spaces can be archived and exported as Markdown JSON.

## Pages

Pages support:

- Title and **slug** (URL-friendly)  
- Hierarchy via parent page  
- Status: `DRAFT` or `PUBLISHED`  
- Icon, labels, optional owner  
- Markdown body  

## Templates

`GET /magicboard/templates` provides:

- `blank`  
- `meeting_notes`  
- `decision_record`  
- `runbook`  

Create with `POST /spaces/{id}/pages/from-template`.

## Collaboration

- Page comments  
- Watch page / watch space  
- Favorite pages  
- Recent views recorded on open  

## Permissions

If a space has **Space members**, roles `VIEW` / `EDIT` / `ADMIN` apply.  
If no members are set, any workspace member can edit (default open space).

## Share links

`POST /pages/{id}/share-links` creates a workspace-member share URL (`/magicboard/share/{token}`).  
Anonymous public read is not enabled in v1. Revoke with `DELETE /share-links/{id}`.

## Hierarchical paths

Resolve `/{spaceKey}/{pageSlug}` via  
`GET /workspaces/{id}/magicboard/resolve?space_key=&page_slug=`.  
Frontend route: `/magicboard/:spaceKey/:pageSlug`.

## Attachments

Upload with `POST /pages/{id}/attachments` (multipart). List and delete via the page attachments APIs.
