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
      className={({ isActive }) => `sidebar-link${collapsed ? " collapsed-link" : ""}${isActive ? " active" : ""}`}
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
  const closeMobile = () => setMobileOpen(false);

  return (
    <aside
      className={`sidebar${collapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}
    >
      <div className="sidebar-header">
        <button
          type="button"
          className="brand-lockup"
          title={`${brandName} · ${brandSubtitle}`}
          onClick={() => navigate("/")}
        >
          <img
            className="brand-mark"
            src={brandedWorkspace?.logo_url || "/icon.svg"}
            alt=""
            width={36}
            height={36}
          />
          {!collapsed ? (
            <span className="brand-copy">
              <strong className="brand-title">{brandName}</strong>
              <span className="brand-subtitle is-product">{brandSubtitle}</span>
            </span>
          ) : null}
        </button>
        <div className="sidebar-header-actions">
          <button
            type="button"
            className="icon-button sidebar-mobile-toggle"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <button
            type="button"
            className="icon-button sidebar-desktop-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </div>

      <div className="sidebar-panel">
        {!collapsed ? (
          <>
            <label className="sidebar-workspace-switcher">
              <span>Workspace</span>
              <select
                value={selectedWorkspaceId}
                onChange={(event) => {
                  const next = event.target.value;
                  setActiveWorkspaceId(next);
                  navigate(`/workspaces/${next}`);
                  closeMobile();
                }}
              >
                {(workspaces ?? []).map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>
            {workboardAppUrl ? (
              <div className="sidebar-product-switcher" role="group" aria-label="Product">
                <a className="sidebar-product-link" href={workboardAppUrl} onClick={closeMobile}>
                  Workboard
                </a>
                <span className="sidebar-product-link active">Magicboard</span>
              </div>
            ) : null}
          </>
        ) : null}

        <nav className="sidebar-nav" aria-label="Primary">
          <SidebarLink
            to="/"
            icon={<LayoutGrid size={18} />}
            label="Spaces"
            collapsed={collapsed}
            end
            onNavigate={closeMobile}
          />
          {selectedWorkspaceId ? (
            <SidebarLink
              to={`/workspaces/${selectedWorkspaceId}`}
              icon={<BookOpen size={18} />}
              label="Workspace"
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ) : null}
        </nav>

        {!collapsed && user ? <p className="muted-copy sidebar-user-email">{user.email}</p> : null}
      </div>
    </aside>
  );
}
