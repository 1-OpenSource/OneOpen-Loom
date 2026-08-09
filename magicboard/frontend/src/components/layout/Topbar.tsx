import { ChevronDown, Plus, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useApi } from "../../hooks/useApi";
import { magicboardService } from "../../services/magicboardService";
import { workspaceService } from "../../services/workspaceService";
import { applyWorkspaceBranding } from "../../utils/workspaceBranding";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "../../utils/workspaceState";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";

const workboardAppUrl = (import.meta.env.VITE_WORKBOARD_APP_URL as string | undefined)?.trim();

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId: routeWorkspaceId } = useParams();
  const { data: workspaces } = useApi(() => workspaceService.listWorkspaces(), []);
  const selectedWorkspaceId = routeWorkspaceId ?? getActiveWorkspaceId() ?? workspaces?.[0]?.id ?? "";
  const activeWorkspace = useMemo(
    () => (workspaces ?? []).find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [workspaces, selectedWorkspaceId]
  );
  const { data: workspaceDetail } = useApi(
    () => (selectedWorkspaceId ? workspaceService.getWorkspace(selectedWorkspaceId) : Promise.resolve(null)),
    [selectedWorkspaceId]
  );
  const brandedWorkspace = workspaceDetail ?? activeWorkspace;
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (selectedWorkspaceId) setActiveWorkspaceId(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    applyWorkspaceBranding(brandedWorkspace);
  }, [brandedWorkspace]);

  useEffect(() => {
    setCreateOpen(false);
  }, [location.pathname]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!selectedWorkspaceId || !query.trim()) return;
    setIsSearching(true);
    try {
      const results = await magicboardService.suiteSearch(selectedWorkspaceId, query.trim());
      const first = results.pages[0];
      if (first) {
        navigate(`/magicboard/spaces/${first.space_id}/pages/${first.page_id}`);
      } else {
        navigate(`/?q=${encodeURIComponent(query.trim())}`);
      }
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <header className="mb-topnav">
      <div className="mb-topnav-left">
        <Link to="/" className="mb-topnav-brand" title="Magicboard home">
          <img
            src={brandedWorkspace?.logo_url || "/icon.svg"}
            alt=""
            className="mb-topnav-logo"
            width={28}
            height={28}
          />
          <span className="mb-topnav-brand-text">
            {brandedWorkspace?.brand_name || "Magicboard"}
          </span>
        </Link>
        <nav className="mb-topnav-links" aria-label="Primary">
          <Link to="/" className={location.pathname === "/" ? "is-active" : undefined}>
            Spaces
          </Link>
          {selectedWorkspaceId ? (
            <Link
              to={`/workspaces/${selectedWorkspaceId}`}
              className={location.pathname.startsWith("/workspaces") ? "is-active" : undefined}
            >
              Settings
            </Link>
          ) : null}
          {workboardAppUrl ? (
            <a href={workboardAppUrl} className="mb-topnav-external">
              Workboard
            </a>
          ) : null}
        </nav>
      </div>

      <form className="mb-topnav-search" onSubmit={handleSearch}>
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Magicboard"
          aria-label="Search Magicboard"
        />
        <button type="submit" className="mb-topnav-search-submit" disabled={!query.trim() || isSearching}>
          Search
        </button>
      </form>

      <div className="mb-topnav-right">
        <div className="mb-topnav-create">
          <Button
            type="button"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen((value) => !value)}
            aria-expanded={createOpen}
          >
            Create
          </Button>
          {createOpen ? (
            <div className="mb-topnav-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setCreateOpen(false);
                  navigate("/?createSpace=1");
                }}
              >
                Space
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setCreateOpen(false);
                  if (location.pathname.includes("/magicboard/spaces/")) {
                    window.dispatchEvent(new CustomEvent("magicboard:create-page"));
                  } else {
                    navigate("/");
                  }
                }}
              >
                Page
              </button>
            </div>
          ) : null}
        </div>

        <label className="mb-topnav-workspace">
          <span className="sr-only">Workspace</span>
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
          <ChevronDown size={14} aria-hidden="true" />
        </label>

        {user ? (
          <div className="mb-topnav-user">
            <Avatar user={user} />
            <div className="mb-topnav-user-meta">
              <strong>{user.name}</strong>
              <button type="button" className="mb-topnav-logout" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
