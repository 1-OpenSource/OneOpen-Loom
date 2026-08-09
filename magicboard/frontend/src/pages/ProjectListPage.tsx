import { LayoutGrid, List, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { projectService } from "../services/projectService";
import { workspaceService } from "../services/workspaceService";
import { useToast } from "../components/ui/ToastProvider";
import { formatDateTime } from "../utils/formatDate";

export default function ProjectListPage() {
  const { workspaceId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: workspace } = useApi(() => workspaceService.getWorkspace(workspaceId), [workspaceId]);
  const [search, setSearch] = useState("");
  const { data: projectsPage, isLoading, error, reload } = useApi(
    () => projectService.listProjects(workspaceId, { search, page_size: 50 }),
    [workspaceId, search]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const projects = useMemo(() => projectsPage?.items ?? [], [projectsPage]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await projectService.createProject(workspaceId, { name, key, description: description || null });
      pushToast("Project created", "success");
      setIsModalOpen(false);
      setName("");
      setKey("");
      setDescription("");
      await reload();
    } catch (createError) {
      pushToast(createError instanceof Error ? createError.message : "Project could not be created", "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title={workspace ? `${workspace.name} projects` : "Projects"}
        description="Track delivery across open-source workstreams, releases, and maintenance efforts."
        actions={
          <div className="button-row">
            <div className="segmented-control compact">
              <button type="button" className={view === "grid" ? "segmented-active" : ""} onClick={() => setView("grid")}>
                <LayoutGrid size={16} />
              </button>
              <button type="button" className={view === "list" ? "segmented-active" : ""} onClick={() => setView("list")}>
                <List size={16} />
              </button>
            </div>
            <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
              New Project
            </Button>
          </div>
        }
      />

      <div className="toolbar-row">
        <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or key" />
      </div>

      {isLoading ? (
        <div className="card-grid">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <Skeleton className="skeleton-line short" />
              <Skeleton className="skeleton-heading" />
              <Skeleton className="skeleton-line" />
            </Card>
          ))}
        </div>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!isLoading && projects.length === 0 ? (
        <EmptyState
          title="No projects in this workspace"
          description="Create the first project to start organizing work items and boards."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
              Create Project
            </Button>
          }
        />
      ) : null}

      {view === "grid" ? (
        <div className="card-grid project-card-grid">
          {projects.map((project) => (
            <Card key={project.id} className="project-card">
              <Link className="card-link" to={`/projects/${project.id}`}>
                <div className="project-card-header">
                  <div className="project-key">{project.key}</div>
                  <span>{project.archived_at ? "Archived" : "Active"}</span>
                </div>
                <h2>{project.name}</h2>
                <p>{project.description || "No description yet."}</p>
                <div className="project-card-footer">
                  <span>{project.lead?.name ?? "No lead"}</span>
                  <span>{formatDateTime(project.updated_at)}</span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="list-table-card">
          <div className="table-shell compact-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Lead</th>
                  <th>Visibility</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link to={`/projects/${project.id}`} className="item-key">
                        {project.name}
                      </Link>
                    </td>
                    <td>{project.key}</td>
                    <td>{project.lead?.name ?? "None"}</td>
                    <td>{project.visibility}</td>
                    <td>{formatDateTime(project.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} title="Create Project" onClose={() => setIsModalOpen(false)}>
        <form className="form-stack" onSubmit={handleCreate}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="Key" value={key} onChange={(event) => setKey(event.target.value.toUpperCase())} required />
          <label className="field" htmlFor="project-description">
            <span>Description</span>
            <textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
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
