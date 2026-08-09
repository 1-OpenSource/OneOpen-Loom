import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  GanttChartSquare,
  Headset,
  KanbanSquare,
  LayoutGrid,
  ListChecks,
  Menu,
  Repeat,
  Rocket,
  Rows3,
  Search,
  Settings,
  Shield,
  Users,
  X
} from "lucide-react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { workspaceService } from "../../services/workspaceService";
import { projectService } from "../../services/projectService";
import { useApi } from "../../hooks/useApi";
import { applyWorkspaceBranding } from "../../utils/workspaceBranding";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "../../utils/workspaceState";

function SidebarLink({
  to,
  icon,
  label,
  collapsed,
  end = false,
  active,
  onNavigate
}: {
  to: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
  /** When set, overrides NavLink pathname matching (needed for ?tab= links). */
  active?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      className={({ isActive }) => `sidebar-link${(active ?? isActive) ? " active" : ""}`}
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

function SidebarSectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="sidebar-section-divider" aria-hidden="true" />;
  }
  return <div className="sidebar-section-label">{label}</div>;
}

export default function Sidebar() {
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: workspaces } = useApi(() => workspaceService.listWorkspaces(), []);
  const { data: project } = useApi(
    () => (projectId ? projectService.getProject(projectId) : Promise.resolve(null)),
    [projectId]
  );
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
  const { data: workspaceMembers } = useApi(
    () => (selectedWorkspaceId ? workspaceService.listMembers(selectedWorkspaceId) : Promise.resolve([])),
    [selectedWorkspaceId]
  );
  const isWorkspaceAdmin = Boolean(
    workspaceMembers?.some(
      (member) => member.user_id === user?.id && (member.role === "ADMIN" || member.role === "OWNER")
    )
  );

  useEffect(() => {
    if (workspaceId) {
      setActiveWorkspaceId(workspaceId);
    }
  }, [workspaceId]);

  useEffect(() => {
    applyWorkspaceBranding(brandedWorkspace?.accent_color);
  }, [brandedWorkspace?.accent_color]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 980px)");
    const sync = () => {
      if (media.matches) {
        setCollapsed(false);
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const membersPath = useMemo(() => {
    if (projectId) {
      return `/projects/${projectId}?tab=members`;
    }
    return selectedWorkspaceId ? `/workspaces/${selectedWorkspaceId}?tab=members` : "/workspaces";
  }, [projectId, selectedWorkspaceId]);

  const settingsPath = useMemo(() => {
    if (projectId) {
      return `/projects/${projectId}?tab=settings`;
    }
    return selectedWorkspaceId ? `/workspaces/${selectedWorkspaceId}?tab=settings` : "/workspaces";
  }, [projectId, selectedWorkspaceId]);

  const closeMobile = () => setMobileOpen(false);
  const isServiceDesk = project?.product_type === "SERVICE";
  const hasProject = Boolean(projectId);
  const brandTitle = brandedWorkspace?.brand_name?.trim() || brandedWorkspace?.name || "OneOpen";
  const customTagline = brandedWorkspace?.brand_tagline?.trim() || "";
  const brandSubtitle = customTagline || "Loom";

  const manageTab = new URLSearchParams(location.search).get("tab");
  const workspacePath = selectedWorkspaceId ? `/workspaces/${selectedWorkspaceId}` : "";
  const projectPath = projectId ? `/projects/${projectId}` : "";
  const onWorkspaceHome = Boolean(workspacePath && location.pathname === workspacePath);
  const onProjectHome = Boolean(projectPath && location.pathname === projectPath);
  const isDashboardActive =
    onWorkspaceHome && manageTab !== "members" && manageTab !== "settings";
  const isMembersActive = Boolean(
    (onWorkspaceHome || onProjectHome) && manageTab === "members"
  );
  const isSettingsActive = Boolean(
    (onWorkspaceHome || onProjectHome) && manageTab === "settings"
  );

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
      <div className="sidebar-header">
        <button
          type="button"
          className="brand-lockup"
          title={`${brandTitle} · ${brandSubtitle}`}
          onClick={() => navigate(selectedWorkspaceId ? `/workspaces/${selectedWorkspaceId}` : "/workspaces")}
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
              <strong className="brand-title">{brandTitle}</strong>
              <span className={`brand-subtitle${customTagline ? "" : " is-product"}`}>{brandSubtitle}</span>
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
          <label className="sidebar-workspace-switcher">
            <span>Workspace</span>
            <select
              value={selectedWorkspaceId}
              onChange={(event) => {
                setActiveWorkspaceId(event.target.value);
                navigate(`/workspaces/${event.target.value}`);
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
        ) : null}

        <nav className="sidebar-nav" aria-label="Primary">
          <SidebarSectionLabel label="Workspace" collapsed={collapsed} />
          <SidebarLink
            to={selectedWorkspaceId ? `/workspaces/${selectedWorkspaceId}` : "/workspaces"}
            icon={<LayoutGrid size={18} />}
            label="Dashboard"
            collapsed={collapsed}
            end
            active={isDashboardActive}
            onNavigate={closeMobile}
          />
          <SidebarLink
            to={selectedWorkspaceId ? `/workspaces/${selectedWorkspaceId}/projects` : "/workspaces"}
            icon={<FolderKanban size={18} />}
            label="Projects"
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
          {selectedWorkspaceId ? (
            <SidebarLink
              to={`/workspaces/${selectedWorkspaceId}/dashboards`}
              icon={<Rows3 size={18} />}
              label="Dashboards"
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ) : null}
          <SidebarLink
            to="/spaces"
            icon={<BookOpen size={18} />}
            label="Spaces"
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
          <SidebarLink
            to={projectId ? `/projects/${projectId}/navigator` : "/navigator"}
            icon={<Search size={18} />}
            label="Navigator"
            collapsed={collapsed}
            onNavigate={closeMobile}
          />

          {hasProject ? (
            <>
              <SidebarSectionLabel label="Project" collapsed={collapsed} />
              <SidebarLink
                to={`/projects/${projectId}/work-items`}
                icon={<ListChecks size={18} />}
                label="Backlog"
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
              <SidebarLink
                to={`/projects/${projectId}/workboard`}
                icon={<KanbanSquare size={18} />}
                label="Board"
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
              <SidebarLink
                to={`/projects/${projectId}/sprints`}
                icon={<Repeat size={18} />}
                label="Sprints"
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
              <SidebarLink
                to={`/projects/${projectId}/roadmap`}
                icon={<GanttChartSquare size={18} />}
                label="Roadmap"
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
              <SidebarLink
                to={`/projects/${projectId}/calendar`}
                icon={<CalendarDays size={18} />}
                label="Calendar"
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
              <SidebarLink
                to={`/projects/${projectId}/reports`}
                icon={<BarChart3 size={18} />}
                label="Reports"
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
              <SidebarLink
                to={`/projects/${projectId}/releases`}
                icon={<Rocket size={18} />}
                label="Releases"
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
              {isServiceDesk ? (
                <SidebarLink
                  to={`/projects/${projectId}/queues`}
                  icon={<Headset size={18} />}
                  label="Queues"
                  collapsed={collapsed}
                  onNavigate={closeMobile}
                />
              ) : null}
            </>
          ) : null}

          {selectedWorkspaceId ? (
            <>
              <SidebarSectionLabel label="Manage" collapsed={collapsed} />
              <SidebarLink
                to={membersPath}
                icon={<Users size={18} />}
                label="Members"
                collapsed={collapsed}
                active={isMembersActive}
                onNavigate={closeMobile}
              />
              <SidebarLink
                to={settingsPath}
                icon={<Settings size={18} />}
                label="Settings"
                collapsed={collapsed}
                active={isSettingsActive}
                onNavigate={closeMobile}
              />
              {isWorkspaceAdmin ? (
                <SidebarLink
                  to={`/workspaces/${selectedWorkspaceId}/admin`}
                  icon={<Shield size={18} />}
                  label="Administration"
                  collapsed={collapsed}
                  onNavigate={closeMobile}
                />
              ) : null}
            </>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
