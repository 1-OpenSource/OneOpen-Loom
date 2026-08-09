import { Link } from "react-router-dom";
import type { AdminSection } from "./adminSections";
import { ADMIN_SECTIONS } from "./adminSections";

interface AdminNavProps {
  workspaceId: string;
  activeSection: AdminSection;
}

const NAV_GROUPS: { label: string; ids: AdminSection[] }[] = [
  { label: "Home", ids: ["overview"] },
  { label: "Access", ids: ["users", "groups", "permissions"] },
  { label: "Configuration", ids: ["projects", "issues", "workflows"] },
  { label: "Integrations", ids: ["apps", "marketplace", "email", "domains"] },
  { label: "Workspace", ids: ["branding", "security", "general"] }
];

export default function AdminNav({ workspaceId, activeSection }: AdminNavProps) {
  return (
    <nav className="admin-nav" aria-label="Administration">
      {NAV_GROUPS.map((group) => {
        const items = ADMIN_SECTIONS.filter((section) => group.ids.includes(section.id));
        if (!items.length) return null;
        return (
          <div className="admin-nav-group" key={group.label}>
            <div className="admin-nav-group-label">{group.label}</div>
            {items.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <Link
                  key={section.id}
                  to={`/workspaces/${workspaceId}/admin?section=${section.id}`}
                  className={`admin-nav-link${isActive ? " is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="admin-nav-icon">{section.icon}</span>
                  <span className="admin-nav-copy">
                    <strong>{section.label}</strong>
                    <span>{section.blurb}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
