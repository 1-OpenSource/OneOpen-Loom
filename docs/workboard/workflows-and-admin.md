# Workflows and administration

## Workflows

Under **Administration → Workflows** (or project board settings):

1. Pick a project  
2. Add / rename / delete **statuses**  
3. Add **transitions** between statuses  
4. Select a transition and attach rules:

| Kind | Examples |
|------|----------|
| Condition | User in role/group, field equals value, issue type in set |
| Validator | Required field, comment required, not blocked |
| Post-function | Set field, assign to role, add comment, clear blocked |

Rules fail closed with clear API errors when a transition is blocked.

## Issue-type schemes

Create schemes listing allowed types, then assign a scheme to a project. Creating a disallowed type is rejected.

## Administration map

| Section | Purpose |
|---------|---------|
| Users / Groups | Membership, invites, group members |
| Permissions | Project permission schemes and grants |
| Projects | Jump to project settings / board |
| Issue types | Schemes + assignment |
| Workflows | Statuses, transitions, rules |
| Apps / Marketplace | Plugins |
| Email | BYO SMTP + templates |
| Domains | Custom hosts + DNS provider (incl. mock) |
| Branding | Logo, accent, brand name / tagline |
| Security | API tokens, OIDC/SAML, GDPR export |
| General | Workspace profile; owner-only delete |

Branding applies in the app shell (sidebar + accent CSS variables) for the active workspace.
