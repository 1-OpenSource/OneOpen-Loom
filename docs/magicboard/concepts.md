# Magicboard concepts

## Spaces

A **space** is a knowledge container with:

- Unique **key** (short code used in URLs)
- Name, description
- Optional **members** with roles `VIEW` / `EDIT` / `ADMIN`
- Page tree (hierarchy)

If a space has **no members**, any workspace member can edit (open space).

## Pages

A **page** belongs to one space and may have a parent page (tree).

| Field | Meaning |
|-------|---------|
| Title | Display name (sidebar updates on autosave when changed) |
| Slug | URL-friendly segment |
| Content | TipTap HTML (`data-mb-*` for custom nodes); legacy markdown converted on open/migrate |
| Status | `DRAFT` or `PUBLISHED` |
| Icon / labels | Optional metadata |

### Draft vs published

| Status | How you get there | How you see it |
|--------|-------------------|----------------|
| **Draft** | Autosave while editing | Orange **Draft** badge in the sidebar; byline on read view |
| **Published** | **Publish** button only | No draft badge; byline shows **Published** |

Autosave never publishes. Editing a published page and waiting for autosave moves it back to **Draft** until you Publish again.

## Tree and URLs

- Sidebar: hierarchical page tree for the space
- Hierarchical path: `/magicboard/{spaceKey}/{pageSlug}`
- Resolve API: `GET /workspaces/{id}/magicboard/resolve?space_key=&page_slug=`

## Templates

Create pages from templates: blank, meeting notes, decision record, runbook.

## Attachments

Files upload to a page. Images can be inserted as `attachment:{uuid}` sources in the editor.

## Share links

Workspace-member share URLs (`/magicboard/share/{token}`). Anonymous public read is not enabled in v1.
