import { FolderKanban, Plus, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/ui/Avatar";
import ActivityFeed from "../components/activity/ActivityFeed";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { activityService } from "../services/activityService";
import { projectService } from "../services/projectService";
import { workspaceService } from "../services/workspaceService";
import { useToast } from "../components/ui/ToastProvider";
import { formatDateTime } from "../utils/formatDate";
import { setActiveWorkspaceId } from "../utils/workspaceState";

type WorkspaceTab = "overview" | "members" | "activity" | "admin" | "settings";

export default function WorkspaceDetailPage() {
  const { workspaceId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const tab = (new URLSearchParams(location.search).get("tab") as WorkspaceTab | null) ?? "overview";
  const { data: workspace, isLoading, error, reload } = useApi(() => workspaceService.getWorkspace(workspaceId), [workspaceId]);
  const { data: overview } = useApi(() => workspaceService.getOverview(workspaceId), [workspaceId]);
  const { data: members } = useApi(() => workspaceService.listMembers(workspaceId), [workspaceId]);
  const { data: invitations, reload: reloadInvitations } = useApi(() => workspaceService.listInvitations(workspaceId), [workspaceId]);
  const { data: activity } = useApi(() => activityService.listWorkspaceActivity(workspaceId), [workspaceId]);
  const { data: projectPage } = useApi(() => projectService.listProjects(workspaceId, { page_size: 6 }), [workspaceId]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [workspaceVisibility, setWorkspaceVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");

  useEffect(() => {
    if (workspaceId) {
      setActiveWorkspaceId(workspaceId);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
      setWorkspaceSlug(workspace.slug);
      setWorkspaceDescription(workspace.description ?? "");
      setWorkspaceVisibility(workspace.visibility);
    }
  }, [workspace]);

  if (tab === "admin") {
    return <Navigate to={`/workspaces/${workspaceId}/admin`} replace />;
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    try {
      await workspaceService.inviteMember(workspaceId, inviteEmail, inviteRole);
      pushToast("Invitation sent", "success");
      setInviteEmail("");
      await reloadInvitations();
    } catch (inviteError) {
      pushToast(inviteError instanceof Error ? inviteError.message : "Invite failed", "error");
    }
  }

  async function handleWorkspaceUpdate(event: FormEvent) {
    event.preventDefault();
    try {
      await workspaceService.updateWorkspace(workspaceId, {
        name: workspaceName,
        slug: workspaceSlug,
        description: workspaceDescription,
        visibility: workspaceVisibility
      });
      pushToast("Workspace updated", "success");
      await reload();
    } catch (updateError) {
      pushToast(updateError instanceof Error ? updateError.message : "Update failed", "error");
    }
  }

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    try {
      const project = await projectService.createProject(workspaceId, { name: projectName, key: projectKey });
      pushToast("Project created", "success");
      setIsProjectModalOpen(false);
      navigate(`/projects/${project.id}`);
    } catch (createError) {
      pushToast(createError instanceof Error ? createError.message : "Project creation failed", "error");
    }
  }

  async function handleDeleteWorkspace() {
    try {
      await workspaceService.deleteWorkspace(workspaceId);
      pushToast("Workspace deleted", "success");
      navigate("/workspaces");
    } catch (deleteError) {
      pushToast(deleteError instanceof Error ? deleteError.message : "Delete failed", "error");
    } finally {
      setIsDeleteOpen(false);
    }
  }

  const tabs: WorkspaceTab[] = ["overview", "members", "activity", "admin", "settings"];

  if (isLoading) {
    return (
      <>
        <Skeleton className="skeleton-heading wide" />
        <Skeleton className="skeleton-line" />
        <div className="dashboard-grid">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item}>
              <Skeleton className="skeleton-line short" />
              <Skeleton className="skeleton-heading" />
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (error || !workspace) {
    return <div className="error-banner">Workspace could not be loaded.</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title={workspace.name}
        description={workspace.description || workspace.slug}
        actions={
          <div className="button-row">
            <Link to={`/workspaces/${workspace.id}/admin`}>
              <Button variant="secondary">Administration</Button>
            </Link>
            <Link to={`/workspaces/${workspace.id}/projects`}>
              <Button variant="secondary" icon={<FolderKanban size={16} />}>
                Projects
              </Button>
            </Link>
            <Button icon={<Plus size={16} />} onClick={() => setIsProjectModalOpen(true)}>
              New Project
            </Button>
          </div>
        }
      />

      <div className="tabs-row">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            className={`tab-button ${tab === item ? "tab-button-active" : ""}`}
            onClick={() => {
              if (item === "admin") {
                navigate(`/workspaces/${workspaceId}/admin`);
                return;
              }
              navigate(`/workspaces/${workspaceId}${item === "overview" ? "" : `?tab=${item}`}`);
            }}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="dashboard-grid">
            <Card className="metric-card">
              <span>Projects</span>
              <strong>{overview?.total_projects ?? 0}</strong>
            </Card>
            <Card className="metric-card">
              <span>Work Items</span>
              <strong>{overview?.total_work_items ?? 0}</strong>
            </Card>
            <Card className="metric-card">
              <span>Members</span>
              <strong>{overview?.total_members ?? 0}</strong>
            </Card>
            <Card className="metric-card">
              <span>Pending Invites</span>
              <strong>{overview?.total_open_invitations ?? 0}</strong>
            </Card>
          </div>

          <div className="content-grid">
            <Card>
              <div className="section-heading">
                <h2>Recently Updated Projects</h2>
              </div>
              {projectPage?.items.length ? (
                <div className="list-stack">
                  {projectPage.items.map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`} className="list-row">
                      <div>
                        <strong>{project.name}</strong>
                        <p>{project.key}</p>
                      </div>
                      <span>{formatDateTime(project.updated_at)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title="No projects yet" description="Create the first project for this workspace." />
              )}
            </Card>

            <Card>
              <div className="section-heading">
                <h2>Recent Activity</h2>
              </div>
              <ActivityFeed
                entries={activity ?? []}
                limit={8}
                emptyTitle="No activity yet"
                emptyDescription="Workspace history will appear here once members start using it."
              />
            </Card>
          </div>
        </>
      ) : null}

      {tab === "members" ? (
        <div className="content-grid">
          <Card>
            <div className="section-heading">
              <h2>Members</h2>
            </div>
            <div className="list-stack">
              {members?.map((member) => (
                <div className="member-row" key={member.id}>
                  <div className="member-row-main">
                    <Avatar user={member.user} />
                    <div>
                      <strong>{member.user.name}</strong>
                      <p>{member.user.email}</p>
                    </div>
                  </div>
                  <div className="member-row-meta">
                    <span>{member.role}</span>
                    <span>{member.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h2>Invite Member</h2>
            </div>
            <form className="form-stack" onSubmit={handleInvite}>
              <Input label="Email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
              <Select
                label="Role"
                options={[
                  { label: "Admin", value: "ADMIN" },
                  { label: "Member", value: "MEMBER" },
                  { label: "Viewer", value: "VIEWER" }
                ]}
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
              />
              <Button type="submit" icon={<Send size={16} />}>
                Send Invite
              </Button>
            </form>
            <div className="section-heading section-heading-spaced">
              <h2>Pending Invitations</h2>
            </div>
            <div className="list-stack">
              {invitations?.map((invitation) => (
                <div className="list-row" key={invitation.id}>
                  <div>
                    <strong>{invitation.email}</strong>
                    <p>{invitation.role}</p>
                  </div>
                  <span>{invitation.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "activity" ? (
        <Card>
          <div className="section-heading">
            <h2>Workspace Activity</h2>
          </div>
          <ActivityFeed
            entries={activity ?? []}
            emptyTitle="No activity yet"
            emptyDescription="Workspace history will appear here once members start using it."
          />
        </Card>
      ) : null}

      {tab === "settings" ? (
        <div className="content-grid">
          <Card>
            <div className="section-heading">
              <h2>General Settings</h2>
            </div>
            <form className="form-stack" onSubmit={handleWorkspaceUpdate}>
              <Input label="Name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required />
              <Input label="Slug" value={workspaceSlug} onChange={(event) => setWorkspaceSlug(event.target.value)} required />
              <label className="field" htmlFor="workspace-description">
                <span>Description</span>
                <textarea
                  id="workspace-description"
                  value={workspaceDescription}
                  onChange={(event) => setWorkspaceDescription(event.target.value)}
                />
              </label>
              <Select
                label="Visibility"
                options={[
                  { label: "Private", value: "PRIVATE" },
                  { label: "Public", value: "PUBLIC" }
                ]}
                value={workspaceVisibility}
                onChange={(event) => setWorkspaceVisibility(event.target.value as "PRIVATE" | "PUBLIC")}
              />
              <Button type="submit">Save Changes</Button>
            </form>
          </Card>

          <Card>
            <div className="section-heading">
              <h2>Danger Zone</h2>
            </div>
            <p className="muted-copy">Deleting a workspace removes access to all nested projects and their work history.</p>
            <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
              Delete Workspace
            </Button>
          </Card>
        </div>
      ) : null}

      <Modal isOpen={isProjectModalOpen} title="Create Project" onClose={() => setIsProjectModalOpen(false)}>
        <form className="form-stack" onSubmit={handleCreateProject}>
          <Input label="Project Name" value={projectName} onChange={(event) => setProjectName(event.target.value)} required />
          <Input label="Project Key" value={projectKey} onChange={(event) => setProjectKey(event.target.value.toUpperCase())} required />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete workspace?"
        description="This action cannot be undone."
        confirmLabel="Delete Workspace"
        onConfirm={handleDeleteWorkspace}
        onClose={() => setIsDeleteOpen(false)}
      />
    </>
  );
}
