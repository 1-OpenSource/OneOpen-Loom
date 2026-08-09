import { Bell, ChevronRight, Command, Plus, Search, SunMoon } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../ui/ToastProvider";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import { notificationService } from "../../services/notificationService";
import { projectService } from "../../services/projectService";
import { searchService, type SearchResultItem } from "../../services/searchService";
import { workItemService } from "../../services/workItemService";
import { workspaceService } from "../../services/workspaceService";
import type { NotificationItem } from "../../types/notification";
import { formatDateTime } from "../../utils/formatDate";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "../../utils/workspaceState";

type QuickCreateKind = "workspace" | "project" | "work-item";

function formatEntityType(entityType: string): string {
  return entityType.replaceAll("_", " ");
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const { pushToast } = useToast();
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [quickCreateKind, setQuickCreateKind] = useState<QuickCreateKind>("workspace");
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [workItemTitle, setWorkItemTitle] = useState("");
  const [workItemDescription, setWorkItemDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeWorkspaceId = workspaceId ?? getActiveWorkspaceId() ?? "";
  const trimmedSearch = searchValue.trim();
  const showSearchPanel = isSearchOpen && Boolean(activeWorkspaceId) && trimmedSearch.length >= 2;

  useEffect(() => {
    if (workspaceId) {
      setActiveWorkspaceId(workspaceId);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId || trimmedSearch.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchService.search(activeWorkspaceId, trimmedSearch);
        if (!cancelled) {
          setSearchResults(results);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeWorkspaceId, trimmedSearch]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (activeWorkspaceId) {
          searchInputRef.current?.focus();
          setIsSearchOpen(true);
        }
      }
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    let cancelled = false;
    async function refreshUnread() {
      const count = await notificationService.unreadCount();
      if (!cancelled) {
        setUnreadCount(count);
      }
    }
    void refreshUnread();
    const interval = window.setInterval(refreshUnread, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  async function handleToggleNotifications() {
    const next = !isNotificationsOpen;
    setIsNotificationsOpen(next);
    if (next) {
      const items = await notificationService.list();
      setNotifications(items);
    }
  }

  async function handleMarkRead(notification: NotificationItem) {
    if (!notification.is_read) {
      await notificationService.markRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setIsNotificationsOpen(false);
    if (notification.href) {
      navigate(notification.href);
    }
  }

  async function handleMarkAllRead() {
    await notificationService.markAllRead();
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
  }

  const breadcrumbs = useMemo(() => {
    const items: Array<{ label: string; href?: string }> = [{ label: "OneOpen" }];
    if (location.pathname.startsWith("/workspaces")) {
      items.push({ label: "Workspaces", href: "/workspaces" });
      if (workspaceId) {
        items.push({ label: "Workspace", href: `/workspaces/${workspaceId}` });
      }
      if (location.pathname.includes("/projects")) {
        items.push({ label: "Projects" });
      }
    } else if (location.pathname.startsWith("/projects")) {
      items.push({ label: "Project", href: `/projects/${projectId}` });
      if (location.pathname.endsWith("/work-items")) {
        items.push({ label: "Work Items" });
      } else if (location.pathname.endsWith("/workboard")) {
        items.push({ label: "Workboard" });
      }
    } else if (location.pathname.startsWith("/work-items")) {
      items.push({ label: "Work Item" });
    }
    return items;
  }, [location.pathname, projectId, workspaceId]);

  async function handleQuickCreate(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (quickCreateKind === "workspace") {
        const workspace = await workspaceService.createWorkspace({ name: workspaceName, slug: workspaceSlug || undefined });
        setActiveWorkspaceId(workspace.id);
        navigate(`/workspaces/${workspace.id}`);
        pushToast("Workspace created", "success");
        setWorkspaceName("");
        setWorkspaceSlug("");
      } else if (quickCreateKind === "project" && activeWorkspaceId) {
        const project = await projectService.createProject(activeWorkspaceId, {
          name: projectName,
          key: projectKey
        });
        navigate(`/projects/${project.id}`);
        pushToast("Project created", "success");
        setProjectName("");
        setProjectKey("");
      } else if (quickCreateKind === "work-item" && projectId) {
        const workItem = await workItemService.createWorkItem(projectId, {
          title: workItemTitle,
          description: workItemDescription || null
        });
        navigate(`/work-items/${workItem.id}`);
        pushToast("Work item created", "success");
        setWorkItemTitle("");
        setWorkItemDescription("");
      }
      setIsQuickCreateOpen(false);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Create action failed", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-main">
        <div className="breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="breadcrumb-item">
              {index > 0 ? <ChevronRight size={14} /> : null}
              {item.href ? <Link to={item.href}>{item.label}</Link> : <span>{item.label}</span>}
            </span>
          ))}
        </div>

        <div className="global-search" ref={searchRef}>
          <Search size={16} />
          <input
            ref={searchInputRef}
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder={activeWorkspaceId ? "Search projects, work items, members" : "Select a workspace to search"}
            disabled={!activeWorkspaceId}
            aria-label="Global search"
            aria-expanded={showSearchPanel}
            aria-controls="global-search-results"
          />
          <span className="search-shortcut" aria-hidden="true">
            <Command size={12} />
            K
          </span>
          {showSearchPanel ? (
            <div className="search-results" id="global-search-results" role="listbox">
              {isSearching ? <div className="search-status">Searching…</div> : null}
              {!isSearching && searchResults.length === 0 ? (
                <div className="search-empty">No matches for “{trimmedSearch}”</div>
              ) : null}
              {!isSearching
                ? searchResults.map((result) => (
                    <Link
                      key={`${result.href}-${result.identifier}`}
                      to={result.href}
                      className="search-result"
                      role="option"
                      onClick={() => {
                        setSearchValue("");
                        setIsSearchOpen(false);
                      }}
                    >
                      <span className="search-result-type">{formatEntityType(result.entity_type)}</span>
                      <strong>{result.identifier}</strong>
                      <span>{result.title}</span>
                      {result.context ? <small>{result.context}</small> : null}
                    </Link>
                  ))
                : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="topbar-actions">
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            setQuickCreateKind(projectId ? "work-item" : activeWorkspaceId ? "project" : "workspace");
            setIsQuickCreateOpen(true);
          }}
        >
          Create
        </Button>
        <div className="notifications-menu" ref={notificationsRef}>
          <button
            type="button"
            className="icon-button notifications-bell"
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
            onClick={() => void handleToggleNotifications()}
          >
            <Bell size={18} />
            {unreadCount > 0 ? <span className="notifications-dot">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
          </button>
          {isNotificationsOpen ? (
            <div className="notifications-dropdown">
              <div className="notifications-dropdown-header">
                <strong>Notifications</strong>
                <button type="button" onClick={() => void handleMarkAllRead()}>
                  Mark all read
                </button>
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="search-empty">You're all caught up.</div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      className={`notification-item ${notification.is_read ? "" : "notification-item-unread"}`}
                      onClick={() => void handleMarkRead(notification)}
                    >
                      <strong>{notification.title}</strong>
                      {notification.body ? <span>{notification.body}</span> : null}
                      <small>{formatDateTime(notification.created_at)}</small>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
        <button type="button" className="icon-button" aria-label="Theme">
          <SunMoon size={18} />
        </button>
        <div className="user-menu">
          <Avatar user={user ?? undefined} />
          <div className="user-menu-copy">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <Button variant="ghost" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      <Modal isOpen={isQuickCreateOpen} title="Quick Create" onClose={() => setIsQuickCreateOpen(false)}>
        <div className="segmented-control">
          <button
            type="button"
            className={quickCreateKind === "workspace" ? "segmented-active" : ""}
            onClick={() => setQuickCreateKind("workspace")}
          >
            Workspace
          </button>
          <button
            type="button"
            className={quickCreateKind === "project" ? "segmented-active" : ""}
            onClick={() => setQuickCreateKind("project")}
            disabled={!activeWorkspaceId}
          >
            Project
          </button>
          <button
            type="button"
            className={quickCreateKind === "work-item" ? "segmented-active" : ""}
            onClick={() => setQuickCreateKind("work-item")}
            disabled={!projectId}
          >
            Work Item
          </button>
        </div>

        <form className="form-stack" onSubmit={handleQuickCreate}>
          {quickCreateKind === "workspace" ? (
            <>
              <Input label="Name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required />
              <Input label="Slug" value={workspaceSlug} onChange={(event) => setWorkspaceSlug(event.target.value)} />
            </>
          ) : null}

          {quickCreateKind === "project" ? (
            <>
              <Input label="Project Name" value={projectName} onChange={(event) => setProjectName(event.target.value)} required />
              <Input label="Project Key" value={projectKey} onChange={(event) => setProjectKey(event.target.value.toUpperCase())} required />
            </>
          ) : null}

          {quickCreateKind === "work-item" ? (
            <>
              <Input label="Title" value={workItemTitle} onChange={(event) => setWorkItemTitle(event.target.value)} required />
              <label className="field" htmlFor="quick-create-description">
                <span>Description</span>
                <textarea
                  id="quick-create-description"
                  value={workItemDescription}
                  onChange={(event) => setWorkItemDescription(event.target.value)}
                />
              </label>
            </>
          ) : null}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsQuickCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
}
