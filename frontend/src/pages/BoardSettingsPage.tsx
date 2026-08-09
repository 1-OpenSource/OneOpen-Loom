import { Plus, Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { boardSettingsService } from "../services/boardSettingsService";
import { projectService } from "../services/projectService";
import type { BoardColumnConfig } from "../types/boardSettings";

function makeColumnKey(title: string) {
  return title.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `COLUMN_${Date.now()}`;
}

export default function BoardSettingsPage() {
  const { projectId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: overview } = useApi(() => projectService.getOverview(projectId), [projectId]);
  const project = overview?.project ?? null;
  const { data: boardSettings, isLoading, reload: reloadSettings } = useApi(
    () => boardSettingsService.getBoardSettings(projectId),
    [projectId]
  );
  const { data: transitions, reload: reloadTransitions } = useApi(
    () => boardSettingsService.listTransitions(projectId),
    [projectId]
  );
  const [columns, setColumns] = useState<BoardColumnConfig[]>([]);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [fromStatusId, setFromStatusId] = useState("");
  const [toStatusId, setToStatusId] = useState("");
  const [transitionName, setTransitionName] = useState("");

  const statusOptions = useMemo(
    () =>
      (overview?.workflow_statuses ?? []).map((status) => ({
        label: `${status.name} (${status.key})`,
        value: status.id
      })),
    [overview]
  );

  const statusLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const status of overview?.workflow_statuses ?? []) {
      map.set(status.id, status.name);
    }
    return map;
  }, [overview]);

  useEffect(() => {
    if (boardSettings) {
      setColumns(boardSettings.columns);
    } else if (!isLoading) {
      setColumns([]);
    }
  }, [boardSettings, isLoading]);

  useEffect(() => {
    const statuses = overview?.workflow_statuses ?? [];
    if (!statuses.length) return;
    setFromStatusId((current) => current || statuses[0].id);
    setToStatusId((current) => current || statuses[Math.min(1, statuses.length - 1)].id);
  }, [overview]);

  function updateColumn(index: number, patch: Partial<BoardColumnConfig>) {
    setColumns((current) => current.map((column, columnIndex) => (columnIndex === index ? { ...column, ...patch } : column)));
  }

  function addColumn(event: FormEvent) {
    event.preventDefault();
    if (!newColumnTitle.trim()) return;
    setColumns((current) => [
      ...current,
      {
        key: makeColumnKey(newColumnTitle),
        title: newColumnTitle.trim(),
        status_mapping: [],
        wip_limit: null,
        position: current.length
      }
    ]);
    setNewColumnTitle("");
  }

  function removeColumn(index: number) {
    setColumns((current) => current.filter((_, columnIndex) => columnIndex !== index));
  }

  async function handleSaveColumns() {
    try {
      await boardSettingsService.updateBoardSettings(projectId, { columns });
      pushToast("Board settings saved", "success");
      await reloadSettings();
    } catch (saveError) {
      pushToast(getApiErrorMessage(saveError, "Could not save board settings"), "error");
    }
  }

  async function handleAddTransition(event: FormEvent) {
    event.preventDefault();
    if (!fromStatusId || !toStatusId) return;
    try {
      await boardSettingsService.createTransition(projectId, {
        from_status_id: fromStatusId,
        to_status_id: toStatusId,
        name: transitionName.trim() || undefined
      });
      setTransitionName("");
      pushToast("Transition added", "success");
      await reloadTransitions();
    } catch (transitionError) {
      pushToast(getApiErrorMessage(transitionError, "Could not add transition"), "error");
    }
  }

  async function handleDeleteTransition(transitionId: string) {
    try {
      await boardSettingsService.deleteTransition(transitionId);
      pushToast("Transition removed", "success");
      await reloadTransitions();
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Could not remove transition"), "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Board Settings"}
        title={project ? `${project.name} board settings` : "Board settings"}
        description="Configure board columns, WIP limits, and allowed workflow transitions."
        actions={
          <Link to={`/projects/${projectId}/workboard`}>
            <Button variant="secondary">Open board</Button>
          </Link>
        }
      />

      {isLoading ? (
        <Card>
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-line" />
        </Card>
      ) : null}

      <div className="content-grid">
        <Card>
          <div className="section-heading">
            <h2>Columns</h2>
          </div>
          <div className="list-stack">
            {columns.length ? (
              columns.map((column, index) => (
                <div className="list-row board-settings-row" key={`${column.key}-${index}`}>
                  <Input
                    label="Title"
                    value={column.title}
                    onChange={(event) => updateColumn(index, { title: event.target.value })}
                  />
                  <Input
                    label="WIP Limit"
                    type="number"
                    min="0"
                    value={column.wip_limit ?? ""}
                    onChange={(event) =>
                      updateColumn(index, { wip_limit: event.target.value ? Number(event.target.value) : null })
                    }
                  />
                  <Input
                    label="Status mapping"
                    value={column.status_mapping.join(", ")}
                    onChange={(event) =>
                      updateColumn(index, {
                        status_mapping: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean)
                      })
                    }
                    placeholder="e.g. TODO"
                  />
                  <Button variant="ghost" icon={<Trash2 size={14} />} onClick={() => removeColumn(index)} aria-label="Remove column" />
                </div>
              ))
            ) : (
              <EmptyState title="No custom columns configured" description="Add columns to override the default workflow board layout." />
            )}
          </div>
          <form className="inline-form" onSubmit={addColumn}>
            <Input label="New column title" value={newColumnTitle} onChange={(event) => setNewColumnTitle(event.target.value)} placeholder="e.g. Code Review" />
            <Button type="submit" icon={<Plus size={16} />}>
              Add Column
            </Button>
          </form>
          <Button icon={<Save size={16} />} onClick={() => void handleSaveColumns()}>
            Save Board Settings
          </Button>
        </Card>

        <Card>
          <div className="section-heading">
            <h2>Workflow Transitions</h2>
          </div>
          <form className="form-stack" onSubmit={handleAddTransition}>
            <div className="form-grid">
              <Select
                label="From status"
                options={[{ label: "Select status", value: "" }, ...statusOptions]}
                value={fromStatusId}
                onChange={(event) => setFromStatusId(event.target.value)}
              />
              <Select
                label="To status"
                options={[{ label: "Select status", value: "" }, ...statusOptions]}
                value={toStatusId}
                onChange={(event) => setToStatusId(event.target.value)}
              />
            </div>
            <Input label="Transition name" value={transitionName} onChange={(event) => setTransitionName(event.target.value)} placeholder="Start progress" />
            <Button type="submit" icon={<Plus size={16} />} disabled={!fromStatusId || !toStatusId}>
              Add Transition
            </Button>
          </form>
          <div className="list-stack">
            {transitions?.length ? (
              transitions.map((transition) => (
                <div className="list-row" key={transition.id}>
                  <div>
                    <strong>{transition.name || "Transition"}</strong>
                    <p>
                      {statusLabelById.get(transition.from_status_id) ?? transition.from_status_id} →{" "}
                      {statusLabelById.get(transition.to_status_id) ?? transition.to_status_id}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    icon={<Trash2 size={14} />}
                    onClick={() => void handleDeleteTransition(transition.id)}
                    aria-label="Remove transition"
                  />
                </div>
              ))
            ) : (
              <EmptyState title="No custom transitions" description="By default every status can move to any other status." />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
