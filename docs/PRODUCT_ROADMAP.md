# Product Roadmap — OneOpen Workboard

Living engineering index for Software + Service + Docs + Enterprise parity goals.

**Baseline:** Phase 1 Kanban coherence is complete. See [PRODUCT_GAP_ANALYSIS.md](./PRODUCT_GAP_ANALYSIS.md).

| Phase | Name | Status |
|---|---|---|
| 1 | Kanban coherence | Done |
| 2 | Ranked backlog + hierarchy | Done |
| 3 | Scrum sprints | Done |
| 4 | Configurable workflows + board mapping + WIP | Done |
| 5 | Field catalog (labels, components, custom fields) | Done |
| 6 | Issue navigator + OQL + saved filters | Done |
| 7 | Agile reports | Done |
| 8 | Automation + webhooks + notifications | Done |
| 9 | Roadmaps, epics, cross-team plans | Done |
| 10 | Releases, versions, time tracking | Done |
| 11 | Dashboards + templates + forms | Done |
| 12 | Service Management essentials | Done |
| 13 | Spaces (docs/wiki) | Done |
| 14 | Permissions, SSO, compliance | Done |
| 15 | Integrations, PWA, apps platform | Done |

## Delivery waves

- **Wave A (2–4):** Real Scrum/Kanban tool — shipped
- **Wave B (5–8):** Fields, query, reports, automation, notify — shipped
- **Wave C (9–13):** Portfolio, releases, time, service desk, wiki, dashboards — shipped
- **Wave D (14–15):** Enterprise identity, Git/CI, PWA, plugins — shipped (stubs where noted)

## Key code anchors

| Area | Backend | Frontend |
|---|---|---|
| Rank / backlog | `work_item_service.update_rank`, `PUT .../rank` | `WorkItemListPage` DnD |
| Sprints | `api/sprints.py` | `SprintBoardPage` |
| Board settings | `api/board.py` | `BoardSettingsPage` |
| Fields | `api/fields.py` | Project Fields tab |
| OQL / navigator | `api/oql.py` | `NavigatorPage` |
| Reports | `api/reports.py` | `ReportsPage` |
| Automation / notify | `api/automation.py`, `notifications.py` | Topbar inbox |
| Roadmap / plans | `api/plans.py` | `RoadmapPage`, `CalendarPage` |
| Versions / time | `api/versions.py` | `ReleasesPage`, detail work logs |
| Dashboards | `api/dashboards.py` | `DashboardPage` |
| Service desk | `api/service_desk.py` | `QueuesPage`, `PortalPage` |
| Spaces | `api/spaces.py` | `SpacesPage`, `SpacePageEditor` |
| Enterprise | `api/enterprise.py` | Workspace Administration |
| Integrations / PWA | `api/integrations.py`, `/api/manifest` | Integrations tab, `manifest.webmanifest` |

## Migration

```bash
cd backend
alembic upgrade head   # includes 202608090002_parity_phases
```

## Non-goals (still)

- Full Marketplace economics
- Exhaustive query language coverage beyond the OQL subset
- Multi-region data residency productization
- Production-grade SAML assertion crypto (OIDC config + validate stub; SAML ACS/metadata present)
