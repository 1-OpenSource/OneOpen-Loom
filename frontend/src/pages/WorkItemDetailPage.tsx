import { Columns3, Link2, ListChecks, X } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Avatar from "../components/ui/Avatar";
import ActivityFeed from "../components/activity/ActivityFeed";
import AttachmentsPanel from "../components/work-items/AttachmentsPanel";
import CommentsPanel from "../components/work-items/CommentsPanel";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import InlineEditField from "../components/ui/InlineEditField";
import Input from "../components/ui/Input";
import MarkdownContent from "../components/ui/MarkdownContent";
import PageHeader from "../components/ui/PageHeader";
import PriorityBadge from "../components/ui/PriorityBadge";
import Select from "../components/ui/Select";
import SearchableSelect from "../components/ui/SearchableSelect";
import StatusBadge from "../components/ui/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { activityService } from "../services/activityService";
import { commentService } from "../services/commentService";
import { projectService } from "../services/projectService";
import { workItemService } from "../services/workItemService";
import { workLogService } from "../services/workLogService";
import type { Activity } from "../types/activity";
import type { Comment } from "../types/comment";
import type { WorkItem, WorkItemLinkType, WorkItemPriority, WorkItemStageStatus } from "../types/workItem";
import type { WorkLog } from "../types/workLog";
import { formatDate, formatDateTime } from "../utils/formatDate";
import { workItemPriorityOptions, workItemStatusOptions } from "../utils/workItemOptions";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

const linkTypeOptions: Array<{ label: string; value: WorkItemLinkType }> = [
  { label: "Blocks", value: "BLOCKS" },
  { label: "Is blocked by", value: "IS_BLOCKED_BY" },
  { label: "Relates to", value: "RELATES_TO" },
  { label: "Duplicates", value: "DUPLICATES" },
  { label: "Is duplicated by", value: "IS_DUPLICATED_BY" },
  { label: "Parent of", value: "PARENT_OF" },
  { label: "Child of", value: "CHILD_OF" }
];

type EditField =
  | "title"
  | "description"
  | "acceptance"
  | "assignee"
  | "reporter"
  | "stage"
  | "blocked"
  | "priority"
  | "epic"
  | "labels"
  | "components"
  | "storyPoints"
  | "startDate"
  | "dueDate"
  | "originalEstimate"
  | "remainingEstimate"
  | null;

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function WorkItemDetailPage() {
  const { workItemId = "" } = useParams();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [workItem, setWorkItem] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [projectMembers, setProjectMembers] = useState<
    Array<{ user_id: string; user: { id: string; name: string; email: string; avatar_url: string | null } }>
  >([]);
  const [projectItems, setProjectItems] = useState<Array<{ id: string; work_item_key: string; title: string; type: string }>>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [status, setStatus] = useState<WorkItemStageStatus>("TODO");
  const [isBlocked, setIsBlocked] = useState(false);
  const [priority, setPriority] = useState<WorkItemPriority>("MEDIUM");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [reporterUserId, setReporterUserId] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [epicId, setEpicId] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [componentsInput, setComponentsInput] = useState("");
  const [watcherIds, setWatcherIds] = useState<string[]>([]);
  const [addWatcherId, setAddWatcherId] = useState("");
  const [originalEstimateHours, setOriginalEstimateHours] = useState("");
  const [remainingEstimateHours, setRemainingEstimateHours] = useState("");
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [workLogHours, setWorkLogHours] = useState("");
  const [workLogComment, setWorkLogComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkType, setLinkType] = useState<WorkItemLinkType>("RELATES_TO");
  const [editingField, setEditingField] = useState<EditField>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function applyWorkItem(item: WorkItem) {
    setWorkItem(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setAcceptanceCriteria(item.acceptance_criteria ?? "");
    const stage = (item.status === "BLOCKED" ? "IN_PROGRESS" : item.status) as WorkItemStageStatus;
    setStatus(stage);
    setIsBlocked(item.is_blocked || item.status === "BLOCKED");
    setPriority(item.priority);
    setAssigneeUserId(item.assignee_user_id ?? "");
    setReporterUserId(item.reporter_id ?? "");
    setStoryPoints(item.story_points?.toString() ?? "");
    setStartDate(item.start_date ?? "");
    setDueDate(item.due_date ?? "");
    setEpicId(item.epic_id ?? "");
    setLabelsInput(item.labels.map((label) => label.name).join(", "));
    setComponentsInput(item.components.join(", "));
    setWatcherIds(item.watchers.map((watcher) => watcher.user_id));
    setOriginalEstimateHours(
      item.original_estimate_seconds != null ? String(Math.round((item.original_estimate_seconds / 3600) * 100) / 100) : ""
    );
    setRemainingEstimateHours(
      item.remaining_estimate_seconds != null ? String(Math.round((item.remaining_estimate_seconds / 3600) * 100) / 100) : ""
    );
  }

  async function loadDetail() {
    setIsLoading(true);
    setError(null);
    try {
      const item = await workItemService.getWorkItem(workItemId);
      const [itemComments, itemActivity, members, projectList, itemWorkLogs] = await Promise.all([
        commentService.listComments(workItemId),
        activityService.listWorkItemActivity(workItemId),
        projectService.listMembers(item.project_id),
        workItemService.listWorkItems(item.project_id, { page_size: 100 }),
        workLogService.listWorkLogs(workItemId)
      ]);
      applyWorkItem(item);
      setComments(itemComments);
      setActivity(itemActivity);
      setProjectMembers(members);
      setProjectItems(projectList.items.filter((candidate) => candidate.id !== item.id));
      setWorkLogs(itemWorkLogs);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Work item could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [workItemId]);

  const availableMembers = useMemo(
    () =>
      projectMembers.map((member) => ({
        label: `${member.user.name} (${member.user.email})`,
        value: member.user_id
      })),
    [projectMembers]
  );

  const epicOptions = useMemo(
    () => [
      { label: "No epic", value: "" },
      ...projectItems
        .filter((candidate) => candidate.type === "EPIC")
        .map((epic) => ({ label: `${epic.work_item_key} · ${epic.title}`, value: epic.id }))
    ],
    [projectItems]
  );

  const watcherOptions = useMemo(
    () => [
      { label: "Add watcher…", value: "" },
      ...projectMembers
        .filter((member) => !watcherIds.includes(member.user_id))
        .map((member) => ({ label: `${member.user.name} (${member.user.email})`, value: member.user_id }))
    ],
    [projectMembers, watcherIds]
  );

  const watcherUsers = useMemo(
    () =>
      watcherIds
        .map((id) => projectMembers.find((member) => member.user_id === id)?.user)
        .filter((candidate): candidate is { id: string; name: string; email: string; avatar_url: string | null } => Boolean(candidate)),
    [watcherIds, projectMembers]
  );

  const patchWorkItem = useCallback(
    async (payload: Record<string, unknown>, closeIfField?: EditField) => {
      if (!workItem || isSaving) return false;
      setIsSaving(true);
      try {
        const updated = await workItemService.updateWorkItem(workItem.id, payload);
        applyWorkItem(updated);
        setActivity(await activityService.listWorkItemActivity(workItem.id));
        if (closeIfField) {
          setEditingField((current) => (current === closeIfField ? null : current));
        }
        return true;
      } catch (saveError) {
        pushToast(getApiErrorMessage(saveError, "Save failed"), "error");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [workItem, isSaving, pushToast]
  );

  function cancelEdit() {
    if (!workItem) return;
    applyWorkItem(workItem);
    setEditingField(null);
  }

  async function commitTitle() {
    const next = title.trim();
    if (!next) {
      pushToast("Title is required", "error");
      return;
    }
    if (workItem && next === workItem.title) {
      setEditingField((current) => (current === "title" ? null : current));
      return;
    }
    await patchWorkItem({ title: next }, "title");
  }

  async function commitDescription() {
    const next = description || null;
    if (workItem && (workItem.description ?? "") === (next ?? "")) {
      setEditingField((current) => (current === "description" ? null : current));
      return;
    }
    await patchWorkItem({ description: next }, "description");
  }

  async function commitAcceptance() {
    const next = acceptanceCriteria || null;
    if (workItem && (workItem.acceptance_criteria ?? "") === (next ?? "")) {
      setEditingField((current) => (current === "acceptance" ? null : current));
      return;
    }
    await patchWorkItem({ acceptance_criteria: next }, "acceptance");
  }

  async function handleAddWatcher(userId: string) {
    if (!workItem || !userId || watcherIds.includes(userId)) return;
    const next = [...watcherIds, userId];
    try {
      const updated = await workItemService.updateWatchers(workItem.id, next);
      applyWorkItem(updated);
      setAddWatcherId("");
      pushToast("Watcher added", "success");
    } catch (watcherError) {
      pushToast(getApiErrorMessage(watcherError, "Could not add watcher"), "error");
    }
  }

  async function handleRemoveWatcher(userId: string) {
    if (!workItem) return;
    const next = watcherIds.filter((id) => id !== userId);
    try {
      const updated = await workItemService.updateWatchers(workItem.id, next);
      applyWorkItem(updated);
      pushToast("Watcher removed", "success");
    } catch (watcherError) {
      pushToast(getApiErrorMessage(watcherError, "Could not remove watcher"), "error");
    }
  }

  async function handleAddWorkLog(event: FormEvent) {
    event.preventDefault();
    if (!workItem || !workLogHours) return;
    try {
      await workLogService.createWorkLog(workItem.id, {
        time_spent_seconds: Math.round(Number(workLogHours) * 3600),
        comment: workLogComment || null
      });
      setWorkLogHours("");
      setWorkLogComment("");
      setWorkLogs(await workLogService.listWorkLogs(workItem.id));
      pushToast("Work logged", "success");
    } catch (workLogError) {
      pushToast(getApiErrorMessage(workLogError, "Could not log work"), "error");
    }
  }

  async function handleCreateSubtask(event: FormEvent) {
    event.preventDefault();
    if (!workItem || !subtaskTitle.trim()) return;
    try {
      await workItemService.createWorkItem(workItem.project_id, {
        title: subtaskTitle.trim(),
        type: "SUBTASK",
        parent_work_item_id: workItem.id
      });
      setSubtaskTitle("");
      await loadDetail();
      pushToast("Subtask created", "success");
    } catch (subtaskError) {
      pushToast(getApiErrorMessage(subtaskError, "Subtask could not be created"), "error");
    }
  }

  async function handleCreateLink(event: FormEvent) {
    event.preventDefault();
    if (!linkTargetId || !workItem) return;
    try {
      await workItemService.createLink(workItem.id, linkTargetId, linkType);
      setLinkTargetId("");
      setLinkType("RELATES_TO");
      await loadDetail();
      pushToast("Link created", "success");
    } catch (linkError) {
      pushToast(getApiErrorMessage(linkError, "Link could not be created"), "error");
    }
  }

  if (isLoading) return <div className="state-text">Loading work item...</div>;
  if (error || !workItem) return <div className="error-banner">{error ?? "Work item not found."}</div>;

  const totalLoggedHours = workLogs.reduce((sum, log) => sum + log.time_spent_seconds, 0) / 3600;
  const assigneeMember = projectMembers.find((member) => member.user_id === assigneeUserId)?.user ?? workItem.assignee;
  const reporterMember = projectMembers.find((member) => member.user_id === reporterUserId)?.user ?? workItem.reporter;
  const statusLabel = workItemStatusOptions.find((option) => option.value === status)?.label ?? status;
  const priorityLabel = workItemPriorityOptions.find((option) => option.value === priority)?.label ?? priority;
  const epicLabel = epicOptions.find((option) => option.value === epicId)?.label ?? "None";

  return (
    <div className="work-item-detail">
      <PageHeader
        compact
        eyebrow={workItem.work_item_key}
        meta={
          <div className="inline-badges">
            <StatusBadge status={workItem.status === "BLOCKED" ? "IN_PROGRESS" : workItem.status} />
            {workItem.is_blocked ? <Badge tone="red">Blocked</Badge> : null}
            <PriorityBadge priority={workItem.priority} />
            <Badge tone="teal">{workItem.type.replaceAll("_", " ")}</Badge>
          </div>
        }
        actions={
          <div className="button-row">
            <Link to={`/projects/${workItem.project_id}/work-items`}>
              <Button variant="secondary" icon={<ListChecks size={16} />}>
                Backlog
              </Button>
            </Link>
            <Link to={`/projects/${workItem.project_id}/workboard`}>
              <Button variant="secondary" icon={<Columns3 size={16} />}>
                Board
              </Button>
            </Link>
          </div>
        }
      />

      <div className="detail-grid wide-detail-grid work-item-detail-main">
        <div className="work-item-main-column">
          <Card className="work-item-primary-card">
            <div className="work-item-content-stack">
              <InlineEditField
                variant="title"
                display={title || workItem.title}
                isEmpty={!title.trim()}
                emptyLabel="Add a title…"
                isEditing={editingField === "title"}
                onStartEdit={() => setEditingField("title")}
                onCancel={cancelEdit}
                onCommit={() => void commitTitle()}
                disabled={isSaving}
              >
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => void commitTitle()}
                  placeholder="Work item title"
                />
              </InlineEditField>

              <InlineEditField
                label="Description"
                variant="content"
                display={description.trim() ? <MarkdownContent text={description} /> : null}
                isEmpty={!description.trim()}
                emptyLabel="Add a description…"
                isEditing={editingField === "description"}
                onStartEdit={() => setEditingField("description")}
                onCancel={cancelEdit}
                onCommit={() => void commitDescription()}
                disabled={isSaving}
              >
                <textarea
                  className="detail-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={() => void commitDescription()}
                  placeholder="Describe the work, context, and outcomes…"
                />
              </InlineEditField>

              <InlineEditField
                label="Acceptance criteria"
                variant="content"
                className="inline-edit-content-sm"
                display={acceptanceCriteria.trim() ? <MarkdownContent text={acceptanceCriteria} /> : null}
                isEmpty={!acceptanceCriteria.trim()}
                emptyLabel="Add acceptance criteria…"
                isEditing={editingField === "acceptance"}
                onStartEdit={() => setEditingField("acceptance")}
                onCancel={cancelEdit}
                onCommit={() => void commitAcceptance()}
                disabled={isSaving}
              >
                <textarea
                  className="detail-textarea detail-textarea-sm"
                  value={acceptanceCriteria}
                  onChange={(event) => setAcceptanceCriteria(event.target.value)}
                  onBlur={() => void commitAcceptance()}
                  placeholder="What must be true for this to be done…"
                />
              </InlineEditField>
            </div>
          </Card>

          <div className="content-grid work-item-related-grid">
            <Card>
              <div className="section-heading">
                <h2>Subtasks</h2>
                <span className="section-count">{workItem.subtasks.length}</span>
              </div>
              <form className="inline-form" onSubmit={handleCreateSubtask}>
                <Input
                  label="Title"
                  value={subtaskTitle}
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  placeholder="Create a subtask"
                />
                <Button type="submit">Add</Button>
              </form>
              <div className="list-stack list-stack-compact">
                {workItem.subtasks.length ? (
                  workItem.subtasks.map((subtask) => (
                    <div className="list-row list-row-compact" key={subtask.id}>
                      <div>
                        <Link to={`/work-items/${subtask.id}`} className="item-key">
                          {subtask.work_item_key}
                        </Link>
                        <p>
                          <Link to={`/work-items/${subtask.id}`} className="work-item-title-link">
                            {subtask.title}
                          </Link>
                        </p>
                      </div>
                      <div className="inline-badges">
                        <StatusBadge status={subtask.status === "BLOCKED" ? "IN_PROGRESS" : subtask.status} />
                        {subtask.is_blocked ? <Badge tone="red">Blocked</Badge> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No subtasks" description="Break this into smaller pieces." />
                )}
              </div>
            </Card>

            <Card>
              <div className="section-heading">
                <h2>Links</h2>
                <span className="section-count">{workItem.outgoing_links.length + workItem.incoming_links.length}</span>
              </div>
              <form className="form-stack" onSubmit={handleCreateLink}>
                <Select
                  label="Relation"
                  options={linkTypeOptions}
                  value={linkType}
                  onChange={(event) => setLinkType(event.target.value as WorkItemLinkType)}
                />
                <SearchableSelect
                  label="Target"
                  options={[
                    { label: "Select work item", value: "" },
                    ...projectItems.map((item) => ({
                      label: `${item.work_item_key} · ${item.title}`,
                      value: item.id
                    }))
                  ]}
                  value={linkTargetId}
                  onChange={setLinkTargetId}
                  placeholder="Search work item…"
                />
                <Button type="submit" icon={<Link2 size={16} />}>
                  Add Link
                </Button>
              </form>
              <div className="list-stack list-stack-compact">
                {[...workItem.outgoing_links, ...workItem.incoming_links].length ? (
                  [...workItem.outgoing_links, ...workItem.incoming_links].map((link) => {
                    const isOutgoing = workItem.outgoing_links.some((item) => item.id === link.id);
                    const related = isOutgoing ? link.target_work_item : link.source_work_item;
                    const relatedId = isOutgoing ? link.target_work_item_id : link.source_work_item_id;
                    return (
                      <div className="list-row list-row-compact" key={link.id}>
                        <div>
                          <strong className="link-type-label">{link.link_type.replaceAll("_", " ")}</strong>
                          {related ? (
                            <p>
                              <Link to={`/work-items/${related.id}`} className="item-key">
                                {related.work_item_key}
                              </Link>{" "}
                              <Link to={`/work-items/${related.id}`} className="work-item-title-link">
                                {related.title}
                              </Link>
                            </p>
                          ) : (
                            <p>
                              <Link to={`/work-items/${relatedId}`} className="item-key">
                                Open linked item
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="muted-copy">No linked items.</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="section-heading">
                <h2>Attachments</h2>
                <span className="section-count">{workItem.attachments.length}</span>
              </div>
              <AttachmentsPanel
                workItemId={workItem.id}
                attachments={workItem.attachments}
                onChanged={loadDetail}
                onNotify={pushToast}
              />
            </Card>
          </div>
        </div>

        <aside className="work-item-aside">
          <Card className="work-item-details-card">
            <div className="section-heading">
              <h2>Details</h2>
            </div>
            <div className="work-item-details-fields">
              <InlineEditField
                label="Assignee"
                display={
                  <span className="detail-person">
                    {assigneeMember ? <Avatar user={assigneeMember} size="sm" /> : null}
                    {assigneeMember?.name ?? "Unassigned"}
                  </span>
                }
                isEmpty={!assigneeUserId}
                emptyLabel="Unassigned"
                isEditing={editingField === "assignee"}
                onStartEdit={() => setEditingField("assignee")}
                onCancel={cancelEdit}
                onCommit={() =>
                  void patchWorkItem(
                    {
                      assignee_user_id: assigneeUserId || null
                    },
                    "assignee"
                  )
                }
                disabled={isSaving}
              >
                <SearchableSelect
                  options={[{ label: "Unassigned", value: "" }, ...availableMembers]}
                  value={assigneeUserId}
                  onChange={(value) => {
                    setAssigneeUserId(value);
                    void patchWorkItem({ assignee_user_id: value || null }, "assignee");
                  }}
                  placeholder="Search assignee…"
                />
              </InlineEditField>

              <InlineEditField
                label="Reporter"
                display={
                  <span className="detail-person">
                    {reporterMember ? <Avatar user={reporterMember} size="sm" /> : null}
                    {reporterMember?.name ?? "Unknown"}
                  </span>
                }
                isEmpty={!reporterUserId}
                emptyLabel="Unknown"
                isEditing={editingField === "reporter"}
                onStartEdit={() => setEditingField("reporter")}
                onCancel={cancelEdit}
                onCommit={() =>
                  void patchWorkItem(
                    {
                      reporter_id: reporterUserId || null
                    },
                    "reporter"
                  )
                }
                disabled={isSaving}
              >
                <SearchableSelect
                  options={[{ label: "Unknown", value: "" }, ...availableMembers]}
                  value={reporterUserId}
                  onChange={(value) => {
                    setReporterUserId(value);
                    void patchWorkItem({ reporter_id: value || null }, "reporter");
                  }}
                  placeholder="Search reporter…"
                />
              </InlineEditField>

              <InlineEditField
                label="Stage"
                display={statusLabel}
                isEditing={editingField === "stage"}
                onStartEdit={() => setEditingField("stage")}
                onCancel={cancelEdit}
                onCommit={() =>
                  void patchWorkItem({ status, is_blocked: status === "DONE" ? false : isBlocked }, "stage")
                }
                disabled={isSaving}
              >
                <Select
                  options={workItemStatusOptions}
                  value={status}
                  onChange={(event) => {
                    const next = event.target.value as WorkItemStageStatus;
                    setStatus(next);
                    void patchWorkItem(
                      {
                        status: next,
                        is_blocked: next === "DONE" ? false : isBlocked
                      },
                      "stage"
                    );
                  }}
                />
              </InlineEditField>

              <InlineEditField
                label="Blocked"
                display={isBlocked ? "Yes" : "No"}
                isEditing={editingField === "blocked"}
                onStartEdit={() => setEditingField("blocked")}
                onCancel={cancelEdit}
                onCommit={() => void patchWorkItem({ is_blocked: isBlocked }, "blocked")}
                disabled={isSaving || status === "DONE"}
              >
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={isBlocked}
                    disabled={status === "DONE"}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setIsBlocked(next);
                      void patchWorkItem({ is_blocked: next }, "blocked");
                    }}
                  />
                  <span>Blocked — stays in current stage</span>
                </label>
              </InlineEditField>

              <InlineEditField
                label="Priority"
                display={<PriorityBadge priority={priority} />}
                isEditing={editingField === "priority"}
                onStartEdit={() => setEditingField("priority")}
                onCancel={cancelEdit}
                onCommit={() => void patchWorkItem({ priority }, "priority")}
                disabled={isSaving}
              >
                <Select
                  options={workItemPriorityOptions}
                  value={priority}
                  onChange={(event) => {
                    const next = event.target.value as WorkItemPriority;
                    setPriority(next);
                    void patchWorkItem({ priority: next }, "priority");
                  }}
                />
              </InlineEditField>

              <InlineEditField
                label="Parent"
                display={
                  workItem.parent_work_item ? (
                    <Link to={`/work-items/${workItem.parent_work_item.id}`} className="item-key">
                      {workItem.parent_work_item.work_item_key}
                    </Link>
                  ) : null
                }
                isEmpty={!workItem.parent_work_item}
                emptyLabel="None"
                isEditing={false}
                onStartEdit={() => undefined}
                onCancel={() => undefined}
                readOnly
              />

              <InlineEditField
                label="Epic"
                display={epicLabel}
                isEmpty={!epicId}
                emptyLabel="None"
                isEditing={editingField === "epic"}
                onStartEdit={() => setEditingField("epic")}
                onCancel={cancelEdit}
                onCommit={() => void patchWorkItem({ epic_id: epicId || null }, "epic")}
                disabled={isSaving}
              >
                <Select
                  options={epicOptions}
                  value={epicId}
                  onChange={(event) => {
                    const next = event.target.value;
                    setEpicId(next);
                    void patchWorkItem({ epic_id: next || null }, "epic");
                  }}
                />
              </InlineEditField>

              <InlineEditField
                label="Labels"
                display={
                  workItem.labels.length ? (
                    <div className="inline-badges">
                      {workItem.labels.map((label) => (
                        <Badge key={label.id} tone="teal">
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null
                }
                isEmpty={!workItem.labels.length}
                emptyLabel="None"
                isEditing={editingField === "labels"}
                onStartEdit={() => setEditingField("labels")}
                onCancel={cancelEdit}
                onCommit={() =>
                  void patchWorkItem(
                    {
                      labels: parseCsv(labelsInput).map((name) => ({ name }))
                    },
                    "labels"
                  )
                }
                disabled={isSaving}
              >
                <input
                  value={labelsInput}
                  onChange={(event) => setLabelsInput(event.target.value)}
                  onBlur={() =>
                    void patchWorkItem(
                      {
                        labels: parseCsv(labelsInput).map((name) => ({ name }))
                      },
                      "labels"
                    )
                  }
                  placeholder="frontend, urgent"
                />
              </InlineEditField>

              <InlineEditField
                label="Components"
                display={workItem.components.length ? workItem.components.join(", ") : null}
                isEmpty={!workItem.components.length}
                emptyLabel="None"
                isEditing={editingField === "components"}
                onStartEdit={() => setEditingField("components")}
                onCancel={cancelEdit}
                onCommit={() => void patchWorkItem({ components: parseCsv(componentsInput) }, "components")}
                disabled={isSaving}
              >
                <input
                  value={componentsInput}
                  onChange={(event) => setComponentsInput(event.target.value)}
                  onBlur={() => void patchWorkItem({ components: parseCsv(componentsInput) }, "components")}
                  placeholder="api, billing"
                />
              </InlineEditField>

              <InlineEditField
                label="Story points"
                display={storyPoints || null}
                isEmpty={!storyPoints}
                emptyLabel="None"
                isEditing={editingField === "storyPoints"}
                onStartEdit={() => setEditingField("storyPoints")}
                onCancel={cancelEdit}
                onCommit={() =>
                  void patchWorkItem(
                    {
                      story_points: storyPoints ? Number(storyPoints) : null
                    },
                    "storyPoints"
                  )
                }
                disabled={isSaving}
              >
                <input
                  type="number"
                  min="0"
                  value={storyPoints}
                  onChange={(event) => setStoryPoints(event.target.value)}
                  onBlur={() =>
                    void patchWorkItem(
                      {
                        story_points: storyPoints ? Number(storyPoints) : null
                      },
                      "storyPoints"
                    )
                  }
                />
              </InlineEditField>

              <InlineEditField
                label="Start date"
                display={startDate ? formatDate(startDate) : null}
                isEmpty={!startDate}
                emptyLabel="Not set"
                isEditing={editingField === "startDate"}
                onStartEdit={() => setEditingField("startDate")}
                onCancel={cancelEdit}
                onCommit={() => void patchWorkItem({ start_date: startDate || null }, "startDate")}
                disabled={isSaving}
              >
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  onBlur={() => void patchWorkItem({ start_date: startDate || null }, "startDate")}
                />
              </InlineEditField>

              <InlineEditField
                label="Due date"
                display={dueDate ? formatDate(dueDate) : null}
                isEmpty={!dueDate}
                emptyLabel="Not set"
                isEditing={editingField === "dueDate"}
                onStartEdit={() => setEditingField("dueDate")}
                onCancel={cancelEdit}
                onCommit={() => void patchWorkItem({ due_date: dueDate || null }, "dueDate")}
                disabled={isSaving}
              >
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  onBlur={() => void patchWorkItem({ due_date: dueDate || null }, "dueDate")}
                />
              </InlineEditField>

              <InlineEditField
                label="Original est."
                display={originalEstimateHours ? `${originalEstimateHours}h` : null}
                isEmpty={!originalEstimateHours}
                emptyLabel="Not set"
                isEditing={editingField === "originalEstimate"}
                onStartEdit={() => setEditingField("originalEstimate")}
                onCancel={cancelEdit}
                onCommit={() =>
                  void patchWorkItem(
                    {
                      original_estimate_seconds: originalEstimateHours
                        ? Math.round(Number(originalEstimateHours) * 3600)
                        : null
                    },
                    "originalEstimate"
                  )
                }
                disabled={isSaving}
              >
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={originalEstimateHours}
                  onChange={(event) => setOriginalEstimateHours(event.target.value)}
                  onBlur={() =>
                    void patchWorkItem(
                      {
                        original_estimate_seconds: originalEstimateHours
                          ? Math.round(Number(originalEstimateHours) * 3600)
                          : null
                      },
                      "originalEstimate"
                    )
                  }
                  placeholder="Hours"
                />
              </InlineEditField>

              <InlineEditField
                label="Remaining est."
                display={remainingEstimateHours ? `${remainingEstimateHours}h` : null}
                isEmpty={!remainingEstimateHours}
                emptyLabel="Not set"
                isEditing={editingField === "remainingEstimate"}
                onStartEdit={() => setEditingField("remainingEstimate")}
                onCancel={cancelEdit}
                onCommit={() =>
                  void patchWorkItem(
                    {
                      remaining_estimate_seconds: remainingEstimateHours
                        ? Math.round(Number(remainingEstimateHours) * 3600)
                        : null
                    },
                    "remainingEstimate"
                  )
                }
                disabled={isSaving}
              >
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={remainingEstimateHours}
                  onChange={(event) => setRemainingEstimateHours(event.target.value)}
                  onBlur={() =>
                    void patchWorkItem(
                      {
                        remaining_estimate_seconds: remainingEstimateHours
                          ? Math.round(Number(remainingEstimateHours) * 3600)
                          : null
                      },
                      "remainingEstimate"
                    )
                  }
                  placeholder="Hours"
                />
              </InlineEditField>

              <InlineEditField
                label="Logged"
                display={`${totalLoggedHours.toFixed(1)}h`}
                isEditing={false}
                onStartEdit={() => undefined}
                onCancel={() => undefined}
                readOnly
              />

              <InlineEditField
                label="Created"
                display={formatDateTime(workItem.created_at)}
                isEditing={false}
                onStartEdit={() => undefined}
                onCancel={() => undefined}
                readOnly
              />

              <InlineEditField
                label="Updated"
                display={formatDateTime(workItem.updated_at)}
                isEditing={false}
                onStartEdit={() => undefined}
                onCancel={() => undefined}
                readOnly
              />
            </div>

            <div className="section-heading section-heading-spaced">
              <h2>Watchers</h2>
              <span className="section-count">{watcherUsers.length}</span>
            </div>
            <div className="watchers-panel">
              <SearchableSelect
                options={watcherOptions}
                value={addWatcherId}
                onChange={(value) => {
                  setAddWatcherId(value);
                  if (value) void handleAddWatcher(value);
                }}
                placeholder="Add watcher…"
              />
              <div className="watchers-list">
                {watcherUsers.length ? (
                  watcherUsers.map((watcherUser) => (
                    <button
                      key={watcherUser.id}
                      type="button"
                      className="watcher-chip"
                      title={`Remove ${watcherUser.name}`}
                      onClick={() => void handleRemoveWatcher(watcherUser.id)}
                    >
                      <Avatar user={watcherUser} size="sm" />
                      <span>{watcherUser.name}</span>
                      <X size={12} />
                    </button>
                  ))
                ) : (
                  <span className="muted-copy">No watchers yet</span>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h2>Work log</h2>
              <span className="section-count">{workLogs.length}</span>
            </div>
            <form className="form-stack" onSubmit={handleAddWorkLog}>
              <div className="form-grid">
                <Input
                  label="Hours"
                  type="number"
                  min="0"
                  step="0.25"
                  value={workLogHours}
                  onChange={(event) => setWorkLogHours(event.target.value)}
                  placeholder="1.5"
                  required
                />
                <div className="field field-align-end">
                  <span>&nbsp;</span>
                  <Button type="submit">Log</Button>
                </div>
              </div>
              <Input
                label="Note"
                value={workLogComment}
                onChange={(event) => setWorkLogComment(event.target.value)}
                placeholder="What did you work on?"
              />
            </form>
            <div className="list-stack list-stack-compact">
              {workLogs.length ? (
                workLogs.slice(0, 5).map((log) => (
                  <div className="list-row list-row-compact" key={log.id}>
                    <div>
                      <strong>{(log.time_spent_seconds / 3600).toFixed(2)}h</strong>
                      <p>
                        {log.user.name}
                        {log.comment ? ` · ${log.comment}` : ""}
                      </p>
                    </div>
                    <span className="muted-copy">{formatDate(log.started_at)}</span>
                  </div>
                ))
              ) : (
                <p className="muted-copy">No time logged yet.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <div className="content-grid work-item-discussion-grid">
        <Card className="work-item-comments-card">
          <div className="section-heading">
            <h2>Comments</h2>
            <span className="section-count">{comments.length}</span>
          </div>
          <CommentsPanel
            workItemId={workItem.id}
            comments={comments}
            currentUser={user}
            onChanged={loadDetail}
            onNotify={pushToast}
          />
        </Card>

        <Card className="work-item-activity-card">
          <div className="section-heading">
            <h2>Activity</h2>
            <span className="section-count">{activity.length}</span>
          </div>
          <ActivityFeed
            entries={activity}
            emptyTitle="No activity yet"
            emptyDescription="Field changes and updates will show up here."
          />
        </Card>
      </div>
    </div>
  );
}
