import { Plus, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CreateWorkItemModal from "../components/work-items/CreateWorkItemModal";
import WorkItemStatusColumn from "../components/work-items/WorkItemStatusColumn";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { projectService } from "../services/projectService";
import { sprintService } from "../services/sprintService";
import { workItemService } from "../services/workItemService";
import type { WorkItemCreate, WorkItemStageStatus, WorkItemStatus, WorkboardColumn } from "../types/workItem";
import { useToast } from "../components/ui/ToastProvider";
import {
  workItemBlockedFilterOptions,
  workItemPriorityOptions,
  workItemTypeOptions
} from "../utils/workItemOptions";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export default function WorkboardPage() {
  const { projectId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: project } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: members } = useApi(() => projectService.listMembers(projectId), [projectId]);
  const { data: sprints } = useApi(() => sprintService.listSprints(projectId), [projectId]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [blockedFilter, setBlockedFilter] = useState("");
  const [sprintFilter, setSprintFilter] = useState("");
  const [createColumnKey, setCreateColumnKey] = useState<WorkItemStageStatus | null>(null);
  const { data: workboard, isLoading, error, reload, setData } = useApi(
    () =>
      workItemService.getWorkboard(projectId, {
        search: search || undefined,
        priority: priorityFilter || undefined,
        type: typeFilter || undefined,
        assignee_user_id: assigneeFilter || undefined,
        sprint_id: sprintFilter || undefined,
        blocked: blockedFilter === "" ? undefined : blockedFilter === "true"
      }),
    [projectId, search, priorityFilter, typeFilter, assigneeFilter, sprintFilter, blockedFilter]
  );

  const sprintOptions = useMemo(
    () => [
      { label: "All sprints", value: "" },
      ...(sprints ?? []).map((sprint) => ({ label: `${sprint.name} (${sprint.state.toLowerCase()})`, value: sprint.id }))
    ],
    [sprints]
  );
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeColumnKey, setActiveColumnKey] = useState<string | null>(null);

  const columns = useMemo(() => workboard?.columns ?? [], [workboard]);
  const assigneeOptions = useMemo(
    () => [
      { label: "All assignees", value: "" },
      ...(members ?? []).map((member) => ({
        label: member.user.name,
        value: member.user_id
      }))
    ],
    [members]
  );

  async function handleDrop(columnKey: string) {
    if (!draggedItemId || !workboard) return;
    const previousState = workboard;
    const draggedItem = previousState.columns.flatMap((column) => column.items).find((item) => item.id === draggedItemId);
    if (!draggedItem) return;
    if (draggedItem.status === columnKey) {
      setDraggedItemId(null);
      setActiveColumnKey(null);
      return;
    }

    const optimisticColumns: WorkboardColumn[] = previousState.columns.map((column) => {
      const remainingItems = column.items.filter((item) => item.id !== draggedItemId);
      if (column.key === columnKey) {
        return {
          ...column,
          items: [{ ...draggedItem, status: columnKey as typeof draggedItem.status }, ...remainingItems],
          count: remainingItems.length + 1
        };
      }
      return { ...column, items: remainingItems, count: remainingItems.length };
    });
    setData({ columns: optimisticColumns });
    setDraggedItemId(null);
    setActiveColumnKey(null);
    try {
      await workItemService.updateStatus(draggedItemId, columnKey as WorkItemStatus);
      pushToast("Board updated", "success");
      await reload();
    } catch (moveError) {
      setData(previousState);
      pushToast(getApiErrorMessage(moveError, "That status move is not allowed"), "error");
    }
  }

  async function handleCreate(payload: WorkItemCreate) {
    await workItemService.createWorkItem(projectId, payload);
    pushToast("Work item created", "success");
    await reload();
    setCreateColumnKey(null);
  }

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Board"}
        title={project ? `${project.name} workboard` : "Workboard"}
        description="Move active work across delivery stages. Blocked items stay in their stage with a badge."
        actions={
          <div className="button-row">
            <Link to={`/projects/${projectId}/work-items`}>
              <Button variant="secondary">Backlog</Button>
            </Link>
            <Link to={`/projects/${projectId}/sprints`}>
              <Button variant="secondary">Sprints</Button>
            </Link>
            <Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={() => void reload()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="filter-grid board-toolbar">
        <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search board cards" />
        <Select
          label="Sprint"
          options={sprintOptions}
          value={sprintFilter}
          onChange={(event) => setSprintFilter(event.target.value)}
        />
        <Select
          label="Priority"
          options={[{ label: "All priorities", value: "" }, ...workItemPriorityOptions]}
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        />
        <Select
          label="Type"
          options={[{ label: "All types", value: "" }, ...workItemTypeOptions]}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        />
        <Select
          label="Assignee"
          options={assigneeOptions}
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
        />
        <Select
          label="Blocked"
          options={workItemBlockedFilterOptions}
          value={blockedFilter}
          onChange={(event) => setBlockedFilter(event.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="workboard-grid">
          {[1, 2, 3, 4].map((item) => (
            <div className="status-column" key={item}>
              <Skeleton className="skeleton-heading" />
              <Skeleton className="skeleton-line" />
            </div>
          ))}
        </div>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {!isLoading && columns.every((column) => column.items.length === 0) ? (
        <EmptyState title="Board is empty" description="Add work items to a stage or relax the active filters." />
      ) : null}

      <div className="workboard-grid">
        {columns.map((column) => (
          <div key={column.key} onDragEnter={() => setActiveColumnKey(column.key)}>
            <WorkItemStatusColumn
              title={column.title}
              color={column.color}
              items={column.items}
              isActiveDropZone={activeColumnKey === column.key}
              onDragStart={(itemId) => setDraggedItemId(itemId)}
              onDropItem={() => void handleDrop(column.key)}
              headerAction={
                <button
                  type="button"
                  className="status-column-add"
                  title={`Create in ${column.title}`}
                  onClick={() => setCreateColumnKey(column.key as WorkItemStageStatus)}
                >
                  <Plus size={14} />
                </button>
              }
            />
          </div>
        ))}
      </div>

      <CreateWorkItemModal
        isOpen={createColumnKey !== null}
        onClose={() => setCreateColumnKey(null)}
        onCreate={handleCreate}
        defaultStatus={createColumnKey ?? "TODO"}
        title={createColumnKey ? `Create in ${columns.find((column) => column.key === createColumnKey)?.title ?? createColumnKey}` : "Create Work Item"}
      />
    </>
  );
}
