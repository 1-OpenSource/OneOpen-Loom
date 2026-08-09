# Magicboard brand guidelines

**Direction:** Ink ledger — celadon teal on charcoal ink. Distinct from Workboard’s warm orange kanban mark.

## Logo

- Mark: stacked folio / open knowledge pages on a teal rounded square
- File: `docs/logo.svg` (same as SPA `frontend/public/icon.svg`)
- Clear space: keep at least 1/8 of the mark width empty around the icon
- Do not recolor to Workboard orange (`#e86a17`)
- Do not replace the folio with kanban columns or work-item cards

## Color

| Role | Hex | Use |
|------|-----|-----|
| Accent | `#0f766e` | Primary buttons, links, focus, active nav |
| Accent hover | `#0d5c56` | Hover / pressed |
| Accent soft | `#e6f4f2` | Soft chips, selected rows |
| Accent border | `#9dccc7` | Focus rings, soft borders |
| Ink / text | `#14201e` | Headings and body |
| Mist background | `#eef5f3` | App chrome / auth wash |

Workspace white-label may override `--accent` via branding settings; product default remains celadon.

## Typography

Use the **same suite font stack as Workboard / Loom**:

`Segoe UI`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`

Do not introduce a separate product typeface for Magicboard.

## Tone

- Product role: **team knowledge & documentation**
- Suite: OneOpen Loom (umbrella); Magicboard is not Workboard
- Avoid third-party proprietary wiki/product names in UI copy

## Auth atmosphere

Login/register use a soft teal→ink diagonal wash with faint horizontal “page lines.” Do not reuse Workboard’s orange radial glow.
