import { ExternalLink, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { projectService } from "../services/projectService";
import { serviceDeskService } from "../services/serviceDeskService";

export default function QueuesPage() {
  const { projectId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: project } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: queues, isLoading, error, reload } = useApi(() => serviceDeskService.listQueues(projectId), [projectId]);
  const [name, setName] = useState("");
  const [oql, setOql] = useState("");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await serviceDeskService.createQueue(projectId, { name: name.trim(), oql: oql || null });
      setName("");
      setOql("");
      pushToast("Queue created", "success");
      await reload();
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create queue"), "error");
    }
  }

  async function handleDelete(queueId: string) {
    try {
      await serviceDeskService.deleteQueue(queueId);
      pushToast("Queue removed", "success");
      await reload();
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Could not remove queue"), "error");
    }
  }

  const portalUrl = project ? `${window.location.origin}/portal/${project.key}` : "";

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Service Desk"}
        title={project ? `${project.name} queues` : "Queues"}
        description="Organize incoming requests into queues. Share the customer portal link to collect requests."
        actions={
          portalUrl ? (
            <a href={`/portal/${project?.key}`} target="_blank" rel="noreferrer">
              <Button variant="secondary" icon={<ExternalLink size={16} />}>
                Open Portal
              </Button>
            </a>
          ) : undefined
        }
      />

      {isLoading ? (
        <Card>
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-line" />
        </Card>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="content-grid">
        <Card>
          <div className="section-heading">
            <h2>Queues</h2>
            <span className="section-count">{queues?.length ?? 0}</span>
          </div>
          <div className="list-stack">
            {queues?.length ? (
              queues.map((queue) => (
                <div className="list-row" key={queue.id}>
                  <div>
                    <strong>{queue.name}</strong>
                    <p>{queue.oql || "No filter"}</p>
                  </div>
                  <Button variant="ghost" icon={<Trash2 size={14} />} onClick={() => void handleDelete(queue.id)} aria-label="Remove queue" />
                </div>
              ))
            ) : (
              <EmptyState title="No queues yet" description="Create a queue to organize incoming customer requests." />
            )}
          </div>
        </Card>

        <Card>
          <div className="section-heading">
            <h2>New Queue</h2>
          </div>
          <form className="form-stack" onSubmit={handleCreate}>
            <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Support Requests" required />
            <Input label="Filter (OQL)" value={oql} onChange={(event) => setOql(event.target.value)} placeholder="type = SUPPORT_REQUEST" />
            <Button type="submit" icon={<Plus size={16} />}>
              Create Queue
            </Button>
          </form>
          <div className="section-heading section-heading-spaced">
            <h2>Customer Portal</h2>
          </div>
          <p className="muted-copy">Share this link with customers to let them submit requests directly.</p>
          <code className="portal-link-code">{portalUrl}</code>
        </Card>
      </div>
    </>
  );
}
