import { Building2, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { workspaceService } from "../services/workspaceService";
import { useToast } from "../components/ui/ToastProvider";

export default function WorkspaceListPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { data: workspaces, isLoading, error, reload } = useApi(() => workspaceService.listWorkspaces(), []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      const workspace = await workspaceService.createWorkspace({ name, slug: slug || undefined, visibility });
      pushToast("Workspace created", "success");
      setIsModalOpen(false);
      setName("");
      setSlug("");
      await reload();
      navigate(`/workspaces/${workspace.id}`);
    } catch (createError) {
      pushToast(createError instanceof Error ? createError.message : "Workspace could not be created", "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspaces"
        title="Open-source delivery spaces"
        description="Create or switch between community workspaces, each with its own projects, members, board activity, and settings."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            New Workspace
          </Button>
        }
      />

      {isLoading ? (
        <div className="card-grid">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <Skeleton className="skeleton-heading" />
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line short" />
            </Card>
          ))}
        </div>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}

      {!isLoading && workspaces?.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          description="Start with a workspace for your community, foundation, or maintainer team."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
              Create Workspace
            </Button>
          }
        />
      ) : null}

      <div className="card-grid workspace-grid">
        {workspaces?.map((workspace) => (
          <Card key={workspace.id} className="workspace-card">
            <Link className="card-link" to={`/workspaces/${workspace.id}`}>
              <div className="workspace-card-head">
                <span className="workspace-card-icon">
                  <Building2 size={18} />
                </span>
                <div>
                  <h2>{workspace.name}</h2>
                  <p>{workspace.slug}</p>
                </div>
              </div>
              <div className="workspace-card-foot">
                <span>{workspace.visibility === "PRIVATE" ? "Private workspace" : "Public workspace"}</span>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} title="Create Workspace" onClose={() => setIsModalOpen(false)}>
        <form className="form-stack" onSubmit={handleCreate}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="Slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
          <Select
            label="Visibility"
            options={[
              { label: "Private", value: "PRIVATE" },
              { label: "Public", value: "PUBLIC" }
            ]}
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "PRIVATE" | "PUBLIC")}
          />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
