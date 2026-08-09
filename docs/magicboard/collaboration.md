# Collaboration in Magicboard

## Autosave (draft)

While a page is in edit mode, Magicboard **autosaves** title, content, icon, and labels as **`DRAFT`** after a short debounce (~1.5s).

- Status indicator: Unsaved → Saving draft… → Draft saved  
- Autosave does **not** publish  
- Title changes refresh the space page tree  

## Publish

The **Publish** toolbar action:

1. Saves content with status **`PUBLISHED`**
2. Refreshes version history
3. Updates the sidebar tree (clears Draft badge)
4. Leaves edit mode

## Versions

Each content update can create a version row. Restore from **History** on the page.

## Comments, watch, favorites

- Page comments on the page view  
- Watch page / space for notifications  
- Favorite pages; recent views recorded on open  

## Optional live multiplayer (Confluence-like)

When `VITE_COLLAB_URL` is set, TipTap uses **Yjs** over **Hocuspocus**:

1. Run `magicboard/collab` (`npm run dev`, port `1234`)
2. Set `VITE_COLLAB_URL=ws://localhost:1234`
3. Collab server checks JWT access via Magicboard `GET /api/pages/{id}`

Presence shows how many others are editing. Debounced HTML snapshots still persist to the REST API so non-collab readers stay current.

## Workboard connector

When `WORKBOARD_API_URL` is configured:

- Insert → **Work item** opens a search picker  
- Smart cards refresh from `GET .../connector/work-items/by-key/{key}`  
- Suite search merges work items  

See [Workboard integration](workboard-integration.md).
