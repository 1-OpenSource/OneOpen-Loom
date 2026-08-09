import { Archive, Columns3, ListChecks, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/ui/Avatar";
import ActivityFeed from "../components/activity/ActivityFeed";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import StatusBadge from "../components/ui/StatusBadge";
import { useApi } from "../hooks/useApi";
import { activityService } from "../services/activityService";
import { fieldCatalogService } from "../services/fieldCatalogService";
import { integrationService } from "../services/integrationService";
import { projectService } from "../services/projectService";
import { workItemService } from "../services/workItemService";
import { workspaceService } from "../services/workspaceService";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { formatDateTime } from "../utils/formatDate";
import { setActiveWorkspaceId } from "../utils/workspaceState";
import type { WorkItemStatus } from "../types/workItem";
import type { CustomFieldType } from "../types/fieldCatalog";
import type { IntegrationType } from "../types/integration";
import { workItemStatusOptions } from "../utils/workItemOptions";

type ProjectTab = "overview" | "members" | "activity" | "fields" | "integrations" | "settings";

const customFieldTypeOptions: Array<{ label: string; value: CustomFieldType }> = [
  { label: "Text", value: "TEXT" },
  { label: "Number", value: "NUMBER" },
  { label: "Date", value: "DATE" },
  { label: "Select", value: "SELECT" },
  { label: "Multi-select", value: "MULTI_SELECT" },
  { label: "Checkbox", value: "CHECKBOX" },
  { label: "User", value: "USER" }
];

const integrationTypeOptions: Array<{ label: string; value: IntegrationType }> = [
  { label: "GitHub", value: "GITHUB" },
  { label: "GitLab", value: "GITLAB" },
  { label: "Slack", value: "SLACK" },
  { label: "CI", value: "CI" },
  { label: "Other", value: "OTHER" }
];

export default function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const tab = (new URLSearchParams(location.search).get("tab") as ProjectTab | null) ?? "overview";
  const { data: project, isLoading, error, reload } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: overview } = useApi(() => projectService.getOverview(projectId), [projectId]);
  const { data: members, reload: reloadMembers } = useApi(() => projectService.listMembers(projectId), [projectId]);
  const { data: activity } = useApi(() => activityService.listProjectActivity(projectId), [projectId]);
  const { data: recentItemsPage } = useApi(
    () => workItemService.listWorkItems(projectId, { page_size: 6, sort_by: "updated_at" }),
    [projectId]
  );
  const { data: workspaceMembers } = useApi(
    () => (project ? workspaceService.listMembers(project.workspace_id) : Promise.resolve([])),
    [project?.workspace_id]
  );
  const { data: labels, reload: reloadLabels } = useApi(() => fieldCatalogService.listLabels(projectId), [projectId]);
  const { data: components, reload: reloadComponents } = useApi(
    () => fieldCatalogService.listComponents(projectId),
    [projectId]
  );
  const { data: customFields, reload: reloadCustomFields } = useApi(
    () => fieldCatalogService.listCustomFields(projectId),
    [projectId]
  );
  const { data: integrations, reload: reloadIntegrations } = useApi(
    () => integrationService.listIntegrations(projectId),
    [projectId]
  );
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PUBLIC");
  const [leadUserId, setLeadUserId] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("CONTRIBUTOR");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newComponentName, setNewComponentName] = useState("");
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("TEXT");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newIntegrationName, setNewIntegrationName] = useState("");
  const [newIntegrationType, setNewIntegrationType] = useState<IntegrationType>("GITHUB");
  const [newIntegrationUrl, setNewIntegrationUrl] = useState("");

  useEffect(() => {
    if (project?.workspace_id) {
      setActiveWorkspaceId(project.workspace_id);
    }
  }, [project?.workspace_id]);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setKey(project.key);
      setDescription(project.description ?? "");
      setVisibility(project.visibility);
      setLeadUserId(project.lead_user_id ?? "");
    }
  }, [project]);

  async function handleUpdate(event: FormEvent) {
    event.preventDefault();
    try {
      await projectService.updateProject(projectId, {
        name,
        key,
        description: description || null,
        visibility,
        lead_user_id: leadUserId || null
      });
      pushToast("Project updated", "success");
      await reload();
    } catch (updateError) {
      pushToast(updateError instanceof Error ? updateError.message : "Project update failed", "error");
    }
  }

  async function handleAddMember(event: FormEvent) {
    event.preventDefault();
    try {
      await projectService.addMember(projectId, memberUserId, memberRole);
      pushToast("Project member added", "success");
      setMemberUserId("");
      await reloadMembers();
    } catch (addError) {
      pushToast(addError instanceof Error ? addError.message : "Adding member failed", "error");
    }
  }

  async function handleArchive() {
    try {
      await projectService.setArchived(projectId, !project?.archived_at);
      pushToast(project?.archived_at ? "Project restored" : "Project archived", "success");
      await reload();
    } catch (archiveError) {
      pushToast(archiveError instanceof Error ? archiveError.message : "Archive action failed", "error");
    }
  }

  async function handleDelete() {
    try {
      await projectService.deleteProject(projectId);
      pushToast("Project deleted", "success");
      navigate(project ? `/workspaces/${project.workspace_id}/projects` : "/workspaces");
    } catch (deleteError) {
      pushToast(deleteError instanceof Error ? deleteError.message : "Delete failed", "error");
    } finally {
      setIsDeleteOpen(false);
    }
  }

  async function handleAddLabel(event: FormEvent) {
    event.preventDefault();
    if (!newLabelName.trim()) return;
    try {
      await fieldCatalogService.createLabel(projectId, newLabelName.trim());
      setNewLabelName("");
      pushToast("Label created", "success");
      await reloadLabels();
    } catch (labelError) {
      pushToast(getApiErrorMessage(labelError, "Could not create label"), "error");
    }
  }

  async function handleDeleteLabel(labelId: string) {
    try {
      await fieldCatalogService.deleteLabel(labelId);
      await reloadLabels();
    } catch (labelError) {
      pushToast(getApiErrorMessage(labelError, "Could not remove label"), "error");
    }
  }

  async function handleAddComponent(event: FormEvent) {
    event.preventDefault();
    if (!newComponentName.trim()) return;
    try {
      await fieldCatalogService.createComponent(projectId, newComponentName.trim());
      setNewComponentName("");
      pushToast("Component created", "success");
      await reloadComponents();
    } catch (componentError) {
      pushToast(getApiErrorMessage(componentError, "Could not create component"), "error");
    }
  }

  async function handleDeleteComponent(componentId: string) {
    try {
      await fieldCatalogService.deleteComponent(componentId);
      await reloadComponents();
    } catch (componentError) {
      pushToast(getApiErrorMessage(componentError, "Could not remove component"), "error");
    }
  }

  async function handleAddCustomField(event: FormEvent) {
    event.preventDefault();
    if (!newFieldName.trim()) return;
    try {
      await fieldCatalogService.createCustomField(projectId, {
        name: newFieldName.trim(),
        field_type: newFieldType,
        options: newFieldOptions
          ? newFieldOptions.split(",").map((option) => option.trim()).filter(Boolean)
          : []
      });
      setNewFieldName("");
      setNewFieldOptions("");
      pushToast("Custom field created", "success");
      await reloadCustomFields();
    } catch (fieldError) {
      pushToast(getApiErrorMessage(fieldError, "Could not create custom field"), "error");
    }
  }

  async function handleDeleteCustomField(fieldId: string) {
    try {
      await fieldCatalogService.deleteCustomField(fieldId);
      await reloadCustomFields();
    } catch (fieldError) {
      pushToast(getApiErrorMessage(fieldError, "Could not remove custom field"), "error");
    }
  }

  async function handleAddIntegration(event: FormEvent) {
    event.preventDefault();
    if (!newIntegrationName.trim() || !newIntegrationUrl.trim()) return;
    try {
      await integrationService.createIntegration(projectId, {
        integration_type: newIntegrationType,
        name: newIntegrationName.trim(),
        url: newIntegrationUrl.trim()
      });
      setNewIntegrationName("");
      setNewIntegrationUrl("");
      pushToast("Integration added", "success");
      await reloadIntegrations();
    } catch (integrationError) {
      pushToast(getApiErrorMessage(integrationError, "Could not add integration"), "error");
    }
  }

  async function handleDeleteIntegration(integrationId: string) {
    try {
      await integrationService.deleteIntegration(integrationId);
      await reloadIntegrations();
    } catch (integrationError) {
      pushToast(getApiErrorMessage(integrationError, "Could not remove integration"), "error");
    }
  }

  const tabs: ProjectTab[] = ["overview", "members", "activity", "fields", "integrations", "settings"];
  const stageTotal = useMemo(() => {
    if (!overview) return 0;
    return Object.values(overview.status_breakdown).reduce((sum, count) => sum + count, 0);
  }, [overview]);

  if (isLoading) {
    return (
      <>
        <Skeleton className="skeleton-heading wide" />
        <Skeleton className="skeleton-line" />
      </>
    );
  }

  if (error || !project || !overview) {
    return <div className="error-banner">Project could not be loaded.</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow={project.key}
        title={project.name}
        description={project.description || "Project overview and operational settings."}
        actions={
          <div className="button-row">
            <Link to={`/projects/${project.id}/work-items`}>
              <Button variant="secondary" icon={<ListChecks size={16} />}>
                Work Items
              </Button>
            </Link>
            <Link to={`/projects/${project.id}/workboard`}>
              <Button icon={<Columns3 size={16} />}>Workboard</Button>
            </Link>
          </div>
        }
      />

      <div className="tabs-row">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            className={`tab-button ${tab === item ? "tab-button-active" : ""}`}
            onClick={() => navigate(`/projects/${projectId}${item === "overview" ? "" : `?tab=${item}`}`)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="dashboard-grid">
            <Card className="metric-card">
              <span>Work Items</span>
              <strong>{overview.total_work_items}</strong>
            </Card>
            <Card className="metric-card">
              <span>Members</span>
              <strong>{overview.member_count}</strong>
            </Card>
            <Card className="metric-card">
              <span>Lead</span>
              <strong>{project.lead?.name ?? "Unassigned"}</strong>
            </Card>
            <Card className="metric-card">
              <span>Status</span>
              <strong>{project.archived_at ? "Archived" : "Active"}</strong>
            </Card>
          </div>

          <div className="content-grid">
            <Card>
              <div className="section-heading">
                <h2>Board stages</h2>
              </div>
              <p className="muted-copy">Delivery stages used by the workboard.</p>
              <div className="inline-badges">
                {overview.workflow_statuses.map((statusItem) => (
                  <span key={statusItem.id} className="workflow-pill" style={{ borderColor: statusItem.color }}>
                    <span className="status-dot" style={{ backgroundColor: statusItem.color }} />
                    {statusItem.name}
                  </span>
                ))}
              </div>
              <div className="section-heading section-heading-spaced">
                <h2>Stage breakdown</h2>
              </div>
              <div className="stage-breakdown">
                {workItemStatusOptions.map((stage) => {
                  const count = overview.status_breakdown[stage.value] ?? 0;
                  const width = stageTotal > 0 ? Math.round((count / stageTotal) * 100) : 0;
                  const color =
                    overview.workflow_statuses.find((item) => item.key === stage.value)?.color ?? "var(--accent)";
                  return (
                    <div className="stage-breakdown-row" key={stage.value}>
                      <span>{stage.label}</span>
                      <div className="stage-breakdown-track">
                        <div className="stage-breakdown-fill" style={{ width: `${width}%`, background: color }} />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className="section-heading">
                <h2>Recent work items</h2>
              </div>
              <div className="list-stack">
                {(recentItemsPage?.items ?? []).length ? (
                  (recentItemsPage?.items ?? []).map((item) => (
                    <div className="list-row" key={item.id}>
                      <div>
                        <Link to={`/work-items/${item.id}`} className="item-key">
                          {item.work_item_key}
                        </Link>
                        <p>
                          <Link to={`/work-items/${item.id}`} className="work-item-title-link">
                            {item.title}
                          </Link>
                        </p>
                      </div>
                      <StatusBadge status={(item.status === "BLOCKED" ? "IN_PROGRESS" : item.status) as WorkItemStatus} />
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">No work items yet.</p>
                )}
              </div>
              <div className="section-heading section-heading-spaced">
                <h2>Recent Activity</h2>
              </div>
              <ActivityFeed
                entries={activity ?? []}
                limit={6}
                emptyTitle="No activity yet"
                emptyDescription="Project history will appear here as the team makes updates."
              />
            </Card>
          </div>
        </>
      ) : null}

      {tab === "members" ? (
        <div className="content-grid">
          <Card>
            <div className="section-heading">
              <h2>Project Members</h2>
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
                    <span>{formatDateTime(member.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h2>Add Member</h2>
            </div>
            <form className="form-stack" onSubmit={handleAddMember}>
              <Select
                label="Workspace Member"
                options={[
                  { label: "Select member", value: "" },
                  ...(workspaceMembers ?? []).map((member) => ({
                    label: `${member.user.name} (${member.user.email})`,
                    value: member.user_id
                  }))
                ]}
                value={memberUserId}
                onChange={(event) => setMemberUserId(event.target.value)}
                required
              />
              <Select
                label="Role"
                options={[
                  { label: "Project Admin", value: "PROJECT_ADMIN" },
                  { label: "Developer", value: "DEVELOPER" },
                  { label: "Contributor", value: "CONTRIBUTOR" },
                  { label: "Viewer", value: "VIEWER" }
                ]}
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value)}
              />
              <Button type="submit">Add Member</Button>
            </form>
          </Card>
        </div>
      ) : null}

      {tab === "activity" ? (
        <Card>
          <div className="section-heading">
            <h2>Project Activity</h2>
          </div>
          <ActivityFeed
            entries={activity ?? []}
            emptyTitle="No activity yet"
            emptyDescription="Project history will appear here as the team makes updates."
          />
        </Card>
      ) : null}

      {tab === "fields" ? (
        <div className="content-grid three-column-grid">
          <Card>
            <div className="section-heading">
              <h2>Labels</h2>
              <span className="section-count">{labels?.length ?? 0}</span>
            </div>
            <form className="inline-form" onSubmit={handleAddLabel}>
              <Input label="Label" value={newLabelName} onChange={(event) => setNewLabelName(event.target.value)} placeholder="e.g. urgent" />
              <Button type="submit" icon={<Plus size={16} />}>
                Add
              </Button>
            </form>
            <div className="inline-badges">
              {labels?.length ? (
                labels.map((label) => (
                  <span className="removable-badge" key={label.id}>
                    <Badge tone="neutral">{label.name}</Badge>
                    <button type="button" onClick={() => void handleDeleteLabel(label.id)} aria-label={`Remove ${label.name}`}>
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))
              ) : (
                <span className="muted-copy">No labels yet.</span>
              )}
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h2>Components</h2>
              <span className="section-count">{components?.length ?? 0}</span>
            </div>
            <form className="inline-form" onSubmit={handleAddComponent}>
              <Input
                label="Component"
                value={newComponentName}
                onChange={(event) => setNewComponentName(event.target.value)}
                placeholder="e.g. billing-api"
              />
              <Button type="submit" icon={<Plus size={16} />}>
                Add
              </Button>
            </form>
            <div className="list-stack">
              {components?.length ? (
                components.map((component) => (
                  <div className="list-row" key={component.id}>
                    <strong>{component.name}</strong>
                    <Button variant="ghost" icon={<Trash2 size={14} />} onClick={() => void handleDeleteComponent(component.id)} aria-label="Remove component" />
                  </div>
                ))
              ) : (
                <EmptyState title="No components yet" description="Group work items by codebase area or subsystem." />
              )}
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h2>Custom Fields</h2>
              <span className="section-count">{customFields?.length ?? 0}</span>
            </div>
            <form className="form-stack" onSubmit={handleAddCustomField}>
              <Input label="Field name" value={newFieldName} onChange={(event) => setNewFieldName(event.target.value)} placeholder="e.g. Customer Impact" />
              <Select
                label="Type"
                options={customFieldTypeOptions}
                value={newFieldType}
                onChange={(event) => setNewFieldType(event.target.value as CustomFieldType)}
              />
              {newFieldType === "SELECT" || newFieldType === "MULTI_SELECT" ? (
                <Input
                  label="Options"
                  value={newFieldOptions}
                  onChange={(event) => setNewFieldOptions(event.target.value)}
                  placeholder="Comma-separated options"
                />
              ) : null}
              <Button type="submit" icon={<Plus size={16} />}>
                Add Field
              </Button>
            </form>
            <div className="list-stack">
              {customFields?.length ? (
                customFields.map((field) => (
                  <div className="list-row" key={field.id}>
                    <div>
                      <strong>{field.name}</strong>
                      <p>{field.field_type.replaceAll("_", " ")}</p>
                    </div>
                    <Button variant="ghost" icon={<Trash2 size={14} />} onClick={() => void handleDeleteCustomField(field.id)} aria-label="Remove field" />
                  </div>
                ))
              ) : (
                <EmptyState title="No custom fields" description="Add project-specific fields to capture extra data." />
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "integrations" ? (
        <div className="content-grid">
          <Card>
            <div className="section-heading">
              <h2>Connected Integrations</h2>
              <span className="section-count">{integrations?.length ?? 0}</span>
            </div>
            <div className="list-stack">
              {integrations?.length ? (
                integrations.map((integration) => (
                  <div className="list-row" key={integration.id}>
                    <div>
                      <strong>{integration.name}</strong>
                      <p>
                        {integration.integration_type} ·{" "}
                        <a href={integration.url} target="_blank" rel="noreferrer">
                          {integration.url}
                        </a>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => void handleDeleteIntegration(integration.id)}
                      aria-label="Remove integration"
                    />
                  </div>
                ))
              ) : (
                <EmptyState title="No integrations" description="Link external tools such as source control or CI dashboards." />
              )}
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h2>Add Integration</h2>
            </div>
            <form className="form-stack" onSubmit={handleAddIntegration}>
              <Select
                label="Type"
                options={integrationTypeOptions}
                value={newIntegrationType}
                onChange={(event) => setNewIntegrationType(event.target.value as IntegrationType)}
              />
              <Input label="Name" value={newIntegrationName} onChange={(event) => setNewIntegrationName(event.target.value)} placeholder="e.g. Main repo" required />
              <Input label="URL" value={newIntegrationUrl} onChange={(event) => setNewIntegrationUrl(event.target.value)} placeholder="https://github.com/org/repo" required />
              <Button type="submit" icon={<Plus size={16} />}>
                Add Integration
              </Button>
            </form>
          </Card>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="content-grid">
          <Card>
            <div className="section-heading">
              <h2>Project Settings</h2>
            </div>
            <form className="form-stack" onSubmit={handleUpdate}>
              <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
              <Input label="Project Key" value={key} onChange={(event) => setKey(event.target.value.toUpperCase())} required />
              <label className="field" htmlFor="project-detail-description">
                <span>Description</span>
                <textarea
                  id="project-detail-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <Select
                label="Visibility"
                options={[
                  { label: "Public to workspace", value: "PUBLIC" },
                  { label: "Private to project members", value: "PRIVATE" }
                ]}
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as "PRIVATE" | "PUBLIC")}
              />
              <Select
                label="Project Lead"
                options={[
                  { label: "Unassigned", value: "" },
                  ...(workspaceMembers ?? []).map((member) => ({
                    label: member.user.name,
                    value: member.user_id
                  }))
                ]}
                value={leadUserId}
                onChange={(event) => setLeadUserId(event.target.value)}
              />
              <Button type="submit">Save Changes</Button>
            </form>
          </Card>

          <Card>
            <div className="section-heading">
              <h2>Archive and Delete</h2>
            </div>
            <div className="button-column">
              <Button variant="secondary" icon={<Archive size={16} />} onClick={() => void handleArchive()}>
                {project.archived_at ? "Restore Project" : "Archive Project"}
              </Button>
              <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                Delete Project
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete project?"
        description="The project and its work items will no longer be accessible."
        confirmLabel="Delete Project"
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />
    </>
  );
}
