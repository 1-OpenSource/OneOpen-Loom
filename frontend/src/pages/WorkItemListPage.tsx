import { GripVertical, LayoutGrid, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CreateWorkItemModal from "../components/work-items/CreateWorkItemModal";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import PriorityBadge from "../components/ui/PriorityBadge";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import StatusBadge from "../components/ui/StatusBadge";
import Badge from "../components/ui/Badge";
import { useApi } from "../hooks/useApi";
import { projectService } from "../services/projectService";
import { workItemService } from "../services/workItemService";
import type { WorkItemCreate, WorkItemSummary } from "../types/workItem";
import {
  workItemBlockedFilterOptions,
  workItemPriorityOptions,
  workItemStatusOptions,
  workItemTypeOptions
} from "../utils/workItemOptions";
import { formatDate, formatDateTime } from "../utils/formatDate";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

function sortByRank(items: WorkItemSummary[]): WorkItemSummary[] {
  return [...items].sort((a, b) => {
    if (a.rank == null && b.rank == null) return 0;
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    if (a.rank === b.rank) return 0;
    return a.rank < b.rank ? -1 : 1;
  });
}

export default function WorkItemListPage() {
  const { projectId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: project } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: members } = useApi(() => projectService.listMembers(projectId), [projectId]);
  const { data: epicsPage } = useApi(
    () => workItemService.listWorkItems(projectId, { page_size: 100, type: "EPIC" }),
    [projectId]
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [blockedFilter, setBlockedFilter] = useState("");
  const [epicFilter, setEpicFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const { data: workItemsPage, isLoading, error, reload, setData } = useApi(
    () =>
      workItemService.listWorkItems(projectId, {
        page_size: 100,
        sort_by: "rank",
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        type: typeFilter || undefined,
        assignee_user_id: assigneeFilter || undefined,
        epic_id: epicFilter || undefined,
        blocked: blockedFilter === "" ? undefined : blockedFilter === "true"
      }),
    [projectId, search, statusFilter, priorityFilter, typeFilter, assigneeFilter, epicFilter, blockedFilter]
  );

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

  const epics = epicsPage?.items ?? [];
  const epicsById = useMemo(() => new Map(epics.map((epic) => [epic.id, epic])), [epics]);
  const epicOptions = useMemo(
    () => [
      { label: "All epics", value: "" },
      ...epics.map((epic) => ({ label: `${epic.work_item_key} · ${epic.title}`, value: epic.id }))
    ],
    [epics]
  );

  async function handleCreate(payload: WorkItemCreate) {
    try {
      await workItemService.createWorkItem(projectId, { ...payload, status: payload.status ?? "TODO" });
      pushToast("Work item created", "success");
      await reload();
      setIsModalOpen(false);
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create work item"), "error");
    }
  }

  const workItems = useMemo(() => sortByRank(workItemsPage?.items ?? []), [workItemsPage]);

  async function handleDropOnRow(targetId: string) {
    const currentDraggedId = draggedItemId;
    setDraggedItemId(null);
    setDragOverItemId(null);
    if (!currentDraggedId || currentDraggedId === targetId || !workItemsPage) return;

    const draggedIndex = workItems.findIndex((item) => item.id === currentDraggedId);
    if (draggedIndex === -1) return;

    const reordered = [...workItems];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    const insertIndex = reordered.findIndex((item) => item.id === targetId);
    if (insertIndex === -1) return;
    reordered.splice(insertIndex, 0, draggedItem);

    const newIndex = reordered.indexOf(draggedItem);
    const after_id = reordered[newIndex - 1]?.id ?? null;
    const before_id = reordered[newIndex + 1]?.id ?? null;

    const previousPage = workItemsPage;
    setData({ ...workItemsPage, items: reordered });
    try {
      await workItemService.updateRank(currentDraggedId, { before_id, after_id });
      pushToast("Backlog order updated", "success");
      await reload();
    } catch (rankError) {
      setData(previousPage);
      pushToast(getApiErrorMessage(rankError, "Could not reorder backlog"), "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Work Items"}
        title={project ? `${project.name} backlog` : "Work items"}
        description="Ranked backlog: drag rows to reorder priority, create, search, filter, and open items. Use the workboard to move delivery stages."
        actions={
          <div className="button-row">
            <Link to={`/projects/${projectId}/workboard`}>
              <Button variant="secondary" icon={<LayoutGrid size={16} />}>
                Open board
              </Button>
            </Link>
            <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
              New Work Item
            </Button>
          </div>
        }
      />

      <div className="filter-grid">
        <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or identifier" />
        <Select
          label="Stage"
          options={[{ label: "All stages", value: "" }, ...workItemStatusOptions]}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        />
        <Select
          label="Priority"
          options={[{ label: "All", value: "" }, ...workItemPriorityOptions]}
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        />
        <Select
          label="Type"
          options={[{ label: "All", value: "" }, ...workItemTypeOptions]}
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
          label="Epic"
          options={epicOptions}
          value={epicFilter}
          onChange={(event) => setEpicFilter(event.target.value)}
        />
        <Select
          label="Blocked"
          options={workItemBlockedFilterOptions}
          value={blockedFilter}
          onChange={(event) => setBlockedFilter(event.target.value)}
        />
      </div>

      {isLoading ? (
        <Card>
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line" />
        </Card>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}

      {!isLoading && workItems.length === 0 ? (
        <EmptyState
          title="No work items match"
          description="Create a work item or loosen the current filters."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
              Create Work Item
            </Button>
          }
        />
      ) : null}

      <Card className="list-table-card">
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th aria-hidden="true"></th>
                <th>Identifier</th>
                <th>Type</th>
                <th>Title</th>
                <th>Epic</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {workItems.map((item) => {
                const epic = item.epic_id ? epicsById.get(item.epic_id) : null;
                return (
                  <tr
                    key={item.id}
                    draggable
                    className={`backlog-row ${dragOverItemId === item.id ? "backlog-row-drop-target" : ""} ${
                      draggedItemId === item.id ? "backlog-row-dragging" : ""
                    }`}
                    onDragStart={() => setDraggedItemId(item.id)}
                    onDragEnter={() => setDragOverItemId(item.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDragEnd={() => {
                      setDraggedItemId(null);
                      setDragOverItemId(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDropOnRow(item.id);
                    }}
                  >
                    <td className="backlog-drag-handle" title="Drag to reorder">
                      <GripVertical size={14} />
                    </td>
                    <td>
                      <Link to={`/work-items/${item.id}`} className="item-key">
                        {item.work_item_key}
                      </Link>
                    </td>
                    <td>
                      <Badge tone="teal">{item.type.replaceAll("_", " ")}</Badge>
                    </td>
                    <td>
                      <div className="table-title-cell">
                        <Link to={`/work-items/${item.id}`} className="work-item-title-link">
                          <strong>{item.title}</strong>
                        </Link>
                        <div className="inline-badges">
                          {item.is_blocked ? <Badge tone="red">Blocked</Badge> : null}
                          {item.due_date ? <span>Due {formatDate(item.due_date)}</span> : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      {epic ? (
                        <Link to={`/work-items/${epic.id}`} className="item-key">
                          {epic.work_item_key}
                        </Link>
                      ) : (
                        <span className="muted-copy">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td>{item.assignee?.name ?? "Unassigned"}</td>
                    <td>{formatDateTime(item.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateWorkItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreate} />
    </>
  );
}
