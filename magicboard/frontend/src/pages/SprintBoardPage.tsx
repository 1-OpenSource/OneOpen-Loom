import { CheckCircle2, LayoutGrid, ListChecks, Play, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import PriorityBadge from "../components/ui/PriorityBadge";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import StatusBadge from "../components/ui/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { projectService } from "../services/projectService";
import { sprintService } from "../services/sprintService";
import { workItemService } from "../services/workItemService";
import type { Sprint, SprintCreate } from "../types/sprint";
import { formatDate } from "../utils/formatDate";

export default function SprintBoardPage() {
  const { projectId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: project } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: sprints, isLoading, error, reload: reloadSprints } = useApi(
    () => sprintService.listSprints(projectId),
    [projectId]
  );
  const { data: backlogPage, reload: reloadBacklog } = useApi(
    () => workItemService.listWorkItems(projectId, { page_size: 100, sort_by: "rank" }),
    [projectId]
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Sprint | null>(null);

  const activeSprint = useMemo(() => sprints?.find((sprint) => sprint.state === "ACTIVE") ?? null, [sprints]);
  const plannedSprints = useMemo(() => sprints?.filter((sprint) => sprint.state === "PLANNED") ?? [], [sprints]);
  const completedSprints = useMemo(() => sprints?.filter((sprint) => sprint.state === "COMPLETED") ?? [], [sprints]);

  const allItems = backlogPage?.items ?? [];
  const activeSprintItems = useMemo(
    () => (activeSprint ? allItems.filter((item) => item.sprint_id === activeSprint.id) : []),
    [allItems, activeSprint]
  );
  const backlogItems = useMemo(() => allItems.filter((item) => !item.sprint_id), [allItems]);

  async function reload() {
    await Promise.all([reloadSprints(), reloadBacklog()]);
  }

  async function handleCreateSprint(event: FormEvent) {
    event.preventDefault();
    try {
      const payload: SprintCreate = {
        name,
        goal: goal || null,
        start_date: startDate || null,
        end_date: endDate || null
      };
      await sprintService.createSprint(projectId, payload);
      pushToast("Sprint created", "success");
      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
      setIsCreateOpen(false);
      await reloadSprints();
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create sprint"), "error");
    }
  }

  async function handleStart(sprint: Sprint) {
    try {
      await sprintService.startSprint(sprint.id);
      pushToast(`${sprint.name} started`, "success");
      await reload();
    } catch (startError) {
      pushToast(getApiErrorMessage(startError, "Could not start sprint"), "error");
    }
  }

  async function handleComplete(sprint: Sprint) {
    try {
      await sprintService.completeSprint(sprint.id);
      pushToast(`${sprint.name} completed`, "success");
      await reload();
    } catch (completeError) {
      pushToast(getApiErrorMessage(completeError, "Could not complete sprint"), "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await sprintService.deleteSprint(deleteTarget.id);
      pushToast("Sprint deleted", "success");
      setDeleteTarget(null);
      await reload();
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Could not delete sprint"), "error");
    }
  }

  async function handleAssign(workItemId: string, sprintId: string | null) {
    try {
      await sprintService.assignToSprint(workItemId, sprintId);
      await reloadBacklog();
    } catch (assignError) {
      pushToast(getApiErrorMessage(assignError, "Could not move item"), "error");
    }
  }

  const sprintAssignOptions = useMemo(
    () => [
      { label: "Move to…", value: "" },
      { label: "Backlog", value: "__backlog__" },
      ...(sprints ?? [])
        .filter((sprint) => sprint.state !== "COMPLETED")
        .map((sprint) => ({ label: sprint.name, value: sprint.id }))
    ],
    [sprints]
  );

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Sprints"}
        title={project ? `${project.name} sprints` : "Sprints"}
        description="Plan sprints, move backlog items in and out, then track delivery on the board."
        actions={
          <div className="button-row">
            <Link to={`/projects/${projectId}/work-items`}>
              <Button variant="secondary" icon={<ListChecks size={16} />}>
                Backlog
              </Button>
            </Link>
            <Link to={`/projects/${projectId}/workboard`}>
              <Button variant="secondary" icon={<LayoutGrid size={16} />}>
                Board
              </Button>
            </Link>
            <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
              New Sprint
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Card>
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-line" />
        </Card>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!isLoading && !sprints?.length ? (
        <EmptyState
          title="No sprints yet"
          description="Create a sprint to start planning work in time-boxed iterations."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
              New Sprint
            </Button>
          }
        />
      ) : null}

      <div className="content-grid">
        <Card>
          <div className="section-heading">
            <h2>{activeSprint ? activeSprint.name : "Active Sprint"}</h2>
            {activeSprint ? <Badge tone="green">Active</Badge> : <span className="muted-copy">None running</span>}
          </div>
          {activeSprint ? (
            <>
              <p className="muted-copy">
                {activeSprint.goal || "No sprint goal set."} · {formatDate(activeSprint.start_date)} –{" "}
                {formatDate(activeSprint.end_date)}
              </p>
              <div className="button-row">
                <Button variant="secondary" icon={<CheckCircle2 size={16} />} onClick={() => void handleComplete(activeSprint)}>
                  Complete Sprint
                </Button>
              </div>
              <div className="list-stack">
                {activeSprintItems.length ? (
                  activeSprintItems.map((item) => (
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
                      <div className="inline-badges">
                        <StatusBadge status={item.status} />
                        <PriorityBadge priority={item.priority} />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Sprint is empty" description="Pull items from the backlog to plan this sprint." />
                )}
              </div>
            </>
          ) : (
            <EmptyState
              title="No active sprint"
              description="Start a planned sprint to see its items and burn progress here."
            />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <h2>Backlog</h2>
            <span className="section-count">{backlogItems.length}</span>
          </div>
          <div className="list-stack">
            {backlogItems.length ? (
              backlogItems.slice(0, 50).map((item) => (
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
                  <Select
                    options={sprintAssignOptions}
                    value=""
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) return;
                      void handleAssign(item.id, value === "__backlog__" ? null : value);
                    }}
                  />
                </div>
              ))
            ) : (
              <EmptyState title="Backlog is clear" description="Every item has been assigned to a sprint." />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="section-heading">
          <h2>All Sprints</h2>
        </div>
        <div className="list-stack">
          {[...plannedSprints, ...(activeSprint ? [activeSprint] : []), ...completedSprints].map((sprint) => (
            <div className="list-row" key={sprint.id}>
              <div>
                <strong>{sprint.name}</strong>
                <p>
                  {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}
                </p>
              </div>
              <div className="inline-badges">
                <Badge tone={sprint.state === "ACTIVE" ? "green" : sprint.state === "COMPLETED" ? "neutral" : "amber"}>
                  {sprint.state}
                </Badge>
                {sprint.state === "PLANNED" ? (
                  <Button variant="secondary" icon={<Play size={14} />} onClick={() => void handleStart(sprint)}>
                    Start
                  </Button>
                ) : null}
                {sprint.state === "ACTIVE" ? (
                  <Button variant="secondary" icon={<CheckCircle2 size={14} />} onClick={() => void handleComplete(sprint)}>
                    Complete
                  </Button>
                ) : null}
                <Button variant="ghost" icon={<Trash2 size={14} />} onClick={() => setDeleteTarget(sprint)} aria-label="Delete sprint" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={isCreateOpen} title="New Sprint" onClose={() => setIsCreateOpen(false)}>
        <form className="form-stack" onSubmit={handleCreateSprint}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="Goal" value={goal} onChange={(event) => setGoal(event.target.value)} />
          <div className="form-grid">
            <Input label="Start Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete sprint?"
        description="Items in this sprint will return to the backlog."
        confirmLabel="Delete Sprint"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
