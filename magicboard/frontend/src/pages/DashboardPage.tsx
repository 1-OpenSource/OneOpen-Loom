import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { dashboardService } from "../services/dashboardService";
import { oqlService } from "../services/oqlService";
import type { Dashboard, DashboardGadget, GadgetType } from "../types/dashboard";

const gadgetTypeOptions: Array<{ label: string; value: GadgetType }> = [
  { label: "Filter Count", value: "FILTER_COUNT" },
  { label: "Assigned to Me", value: "ASSIGNED_TO_ME" },
  { label: "Activity Stream", value: "ACTIVITY_STREAM" },
  { label: "Status Breakdown", value: "STATUS_BREAKDOWN" }
];

function GadgetCard({ workspaceId, gadget, onRemove }: { workspaceId: string; gadget: DashboardGadget; onRemove: () => void }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      const oql =
        gadget.gadget_type === "ASSIGNED_TO_ME"
          ? "assignee = currentUser() AND status != DONE"
          : (gadget.config.oql as string | undefined);
      if (!oql) return;
      try {
        const result = await oqlService.runQuery(workspaceId, oql);
        if (!cancelled) setCount(result.total);
      } catch {
        if (!cancelled) setCount(null);
      }
    }
    if (gadget.gadget_type === "FILTER_COUNT" || gadget.gadget_type === "ASSIGNED_TO_ME") {
      void loadCount();
    }
    return () => {
      cancelled = true;
    };
  }, [gadget, workspaceId]);

  return (
    <Card className="metric-card gadget-card">
      <div className="section-heading">
        <span>{gadget.title}</span>
        <button type="button" className="icon-button gadget-remove" onClick={onRemove} aria-label="Remove gadget">
          <Trash2 size={14} />
        </button>
      </div>
      {gadget.gadget_type === "FILTER_COUNT" || gadget.gadget_type === "ASSIGNED_TO_ME" ? (
        <strong>{count ?? "—"}</strong>
      ) : (
        <p className="muted-copy">{gadget.gadget_type.replaceAll("_", " ")} gadget — coming soon.</p>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { workspaceId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: dashboards, isLoading, error, reload } = useApi(() => dashboardService.listDashboards(workspaceId), [
    workspaceId
  ]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGadgetOpen, setIsGadgetOpen] = useState(false);
  const [dashboardName, setDashboardName] = useState("");
  const [gadgetTitle, setGadgetTitle] = useState("");
  const [gadgetType, setGadgetType] = useState<GadgetType>("FILTER_COUNT");
  const [gadgetOql, setGadgetOql] = useState("");

  useEffect(() => {
    if (dashboards?.length && !selectedDashboardId) {
      setSelectedDashboardId(dashboards[0].id);
    }
  }, [dashboards, selectedDashboardId]);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      if (!selectedDashboardId) {
        setDashboard(null);
        return;
      }
      const detail = await dashboardService.getDashboard(selectedDashboardId);
      if (!cancelled) setDashboard(detail);
    }
    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [selectedDashboardId]);

  async function refreshDashboard() {
    if (selectedDashboardId) {
      setDashboard(await dashboardService.getDashboard(selectedDashboardId));
    }
  }

  async function handleCreateDashboard(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await dashboardService.createDashboard(workspaceId, { name: dashboardName });
      pushToast("Dashboard created", "success");
      setDashboardName("");
      setIsCreateOpen(false);
      await reload();
      setSelectedDashboardId(created.id);
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create dashboard"), "error");
    }
  }

  async function handleAddGadget(event: FormEvent) {
    event.preventDefault();
    if (!selectedDashboardId || !gadgetTitle.trim()) return;
    try {
      await dashboardService.addGadget(selectedDashboardId, {
        gadget_type: gadgetType,
        title: gadgetTitle.trim(),
        config: gadgetType === "FILTER_COUNT" ? { oql: gadgetOql } : {}
      });
      setGadgetTitle("");
      setGadgetOql("");
      setIsGadgetOpen(false);
      pushToast("Gadget added", "success");
      await refreshDashboard();
    } catch (gadgetError) {
      pushToast(getApiErrorMessage(gadgetError, "Could not add gadget"), "error");
    }
  }

  async function handleRemoveGadget(gadgetId: string) {
    try {
      await dashboardService.removeGadget(gadgetId);
      await refreshDashboard();
    } catch (removeError) {
      pushToast(getApiErrorMessage(removeError, "Could not remove gadget"), "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Dashboards"
        title="Workspace Dashboards"
        description="Build a personal or shared dashboard with gadgets summarizing live work."
        actions={
          <div className="button-row">
            {dashboards?.length ? (
              <Select
                options={dashboards.map((item) => ({ label: item.name, value: item.id }))}
                value={selectedDashboardId}
                onChange={(event) => setSelectedDashboardId(event.target.value)}
              />
            ) : null}
            <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
              New Dashboard
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

      {!isLoading && !dashboards?.length ? (
        <EmptyState
          title="No dashboards yet"
          description="Create a dashboard and add gadgets to track work at a glance."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
              New Dashboard
            </Button>
          }
        />
      ) : null}

      {dashboard ? (
        <>
          <div className="button-row">
            <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setIsGadgetOpen(true)}>
              Add Gadget
            </Button>
          </div>
          {dashboard.gadgets.length ? (
            <div className="dashboard-grid">
              {dashboard.gadgets.map((gadget) => (
                <GadgetCard key={gadget.id} workspaceId={workspaceId} gadget={gadget} onRemove={() => void handleRemoveGadget(gadget.id)} />
              ))}
            </div>
          ) : (
            <EmptyState title="Dashboard is empty" description="Add a gadget to start tracking metrics." />
          )}
        </>
      ) : null}

      <Modal isOpen={isCreateOpen} title="New Dashboard" onClose={() => setIsCreateOpen(false)}>
        <form className="form-stack" onSubmit={handleCreateDashboard}>
          <Input label="Name" value={dashboardName} onChange={(event) => setDashboardName(event.target.value)} required />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isGadgetOpen} title="Add Gadget" onClose={() => setIsGadgetOpen(false)}>
        <form className="form-stack" onSubmit={handleAddGadget}>
          <Input label="Title" value={gadgetTitle} onChange={(event) => setGadgetTitle(event.target.value)} required />
          <Select
            label="Type"
            options={gadgetTypeOptions}
            value={gadgetType}
            onChange={(event) => setGadgetType(event.target.value as GadgetType)}
          />
          {gadgetType === "FILTER_COUNT" ? (
            <Input label="OQL Filter" value={gadgetOql} onChange={(event) => setGadgetOql(event.target.value)} placeholder="status = IN_PROGRESS" />
          ) : null}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsGadgetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Gadget</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
