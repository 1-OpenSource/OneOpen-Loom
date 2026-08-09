import { Plus, Rocket, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { projectService } from "../services/projectService";
import { versionService } from "../services/versionService";
import { formatDate } from "../utils/formatDate";

export default function ReleasesPage() {
  const { projectId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: project } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: versions, isLoading, error, reload } = useApi(() => versionService.listVersions(projectId), [projectId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await versionService.createVersion(projectId, { name, description: description || null, release_date: releaseDate || null });
      pushToast("Version created", "success");
      setName("");
      setDescription("");
      setReleaseDate("");
      setIsCreateOpen(false);
      await reload();
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create version"), "error");
    }
  }

  async function handleRelease(versionId: string) {
    try {
      await versionService.releaseVersion(versionId);
      pushToast("Version released", "success");
      await reload();
    } catch (releaseError) {
      pushToast(getApiErrorMessage(releaseError, "Could not release version"), "error");
    }
  }

  async function handleDelete(versionId: string) {
    try {
      await versionService.deleteVersion(versionId);
      pushToast("Version deleted", "success");
      await reload();
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Could not delete version"), "error");
    }
  }

  const activeVersions = (versions ?? []).filter((version) => !version.is_archived);

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Releases"}
        title={project ? `${project.name} releases` : "Releases"}
        description="Plan and ship versions. Mark a version released once its scope has shipped."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
            New Version
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-line" />
        </Card>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!isLoading && activeVersions.length === 0 ? (
        <EmptyState
          title="No versions yet"
          description="Create a version to plan and track a release."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
              New Version
            </Button>
          }
        />
      ) : null}

      <Card>
        <div className="list-stack">
          {activeVersions.map((version) => (
            <div className="list-row" key={version.id}>
              <div>
                <strong>{version.name}</strong>
                <p>{version.description || "No description"} · Release date {formatDate(version.release_date)}</p>
              </div>
              <div className="inline-badges">
                {version.is_released ? <Badge tone="green">Released</Badge> : <Badge tone="amber">Unreleased</Badge>}
                {!version.is_released ? (
                  <Button variant="secondary" icon={<Rocket size={14} />} onClick={() => void handleRelease(version.id)}>
                    Release
                  </Button>
                ) : null}
                <Button variant="ghost" icon={<Trash2 size={14} />} onClick={() => void handleDelete(version.id)} aria-label="Delete version" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={isCreateOpen} title="New Version" onClose={() => setIsCreateOpen(false)}>
        <form className="form-stack" onSubmit={handleCreate}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Input label="Release Date" type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
