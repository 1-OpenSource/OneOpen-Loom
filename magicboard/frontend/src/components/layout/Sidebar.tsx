import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, ChevronLeft, ChevronRight, LayoutGrid, Menu, X } from "lucide-react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useApi } from "../../hooks/useApi";
import { workspaceService } from "../../services/workspaceService";
import { applyWorkspaceBranding } from "../../utils/workspaceBranding";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "../../utils/workspaceState";

const workboardAppUrl = (import.meta.env.VITE_WORKBOARD_APP_URL as string | undefined)?.trim();

function SidebarLink({
  to,
  icon,
  label,
  collapsed,
  end = false,
  onNavigate
}: {
  to: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
      to={to}
      end={end}
      title={label}
      onClick={onNavigate}
    >
      {icon}
      {!collapsed ? <span>{label}</span> : null}
    </NavLink>
  );
}

export default function Sidebar() {
  const { workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: workspaces } = useApi(() => workspaceService.listWorkspaces(), []);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedWorkspaceId = workspaceId ?? getActiveWorkspaceId() ?? workspaces?.[0]?.id ?? "";
  const activeWorkspace = useMemo(
    () => (workspaces ?? []).find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [workspaces, selectedWorkspaceId]
  );
  const { data: workspaceDetail } = useApi(
    () => (selectedWorkspaceId ? workspaceService.getWorkspace(selectedWorkspaceId) : Promise.resolve(null)),
    [selectedWorkspaceId]
  );
  const brandedWorkspace = workspaceDetail ?? activeWorkspace;

  useEffect(() => {
    if (selectedWorkspaceId) {
      setActiveWorkspaceId(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
    applyWorkspaceBranding(brandedWorkspace);
  }, [brandedWorkspace]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const brandName = brandedWorkspace?.brand_name || brandedWorkspace?.name || "Magicboard";
  const brandSubtitle = brandedWorkspace?.brand_tagline || "Magicboard";

  return (
    <>
      <button type="button" className="sidebar-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu size={18} />
      </button>
      {mobileOpen ? <button type="button" className="sidebar-backdrop" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-lockup">
            <img
              src={brandedWorkspace?.logo_url || "/icon.svg"}
              alt=""
              className="sidebar-brand-logo"
            />
            {!collapsed ? (
              <div>
                <strong>{brandName}</strong>
                <p>{brandSubtitle}</p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button type="button" className="sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        {workboardAppUrl ? (
          <div className="sidebar-product-switcher">
            <a className="sidebar-product-link" href={workboardAppUrl}>
              Workboard
            </a>
            <span className="sidebar-product-link active">Magicboard</span>
          </div>
        ) : null}

        <nav className="sidebar-nav">
          <SidebarLink
            to="/"
            icon={<LayoutGrid size={16} />}
            label="Spaces"
            collapsed={collapsed}
            end
            onNavigate={() => setMobileOpen(false)}
          />
          {selectedWorkspaceId ? (
            <SidebarLink
              to={`/workspaces/${selectedWorkspaceId}`}
              icon={<BookOpen size={16} />}
              label="Workspace"
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ) : null}
        </nav>

        <div className="sidebar-footer">
          {!collapsed ? (
            <>
              <label className="field">
                <span>Workspace</span>
                <select
                  value={selectedWorkspaceId}
                  onChange={(event) => {
                    const next = event.target.value;
                    setActiveWorkspaceId(next);
                    navigate(`/workspaces/${next}`);
                  }}
                >
                  {(workspaces ?? []).map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted-copy">{user?.email}</p>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
