import { FileText, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { spaceService } from "../services/spaceService";
import type { Space } from "../types/space";
import { getActiveWorkspaceId } from "../utils/workspaceState";

function SpacePagesList({ space, onOpenNewPage }: { space: Space; onOpenNewPage: (space: Space) => void }) {
  const { data: pages, isLoading } = useApi(() => spaceService.listPages(space.id), [space.id]);

  return (
    <Card key={space.id}>
      <div className="section-heading">
        <h2>{space.name}</h2>
        <span className="section-count">{pages?.length ?? 0}</span>
      </div>
      <p className="muted-copy">{space.description || `Key: ${space.key}`}</p>
      {isLoading ? <Skeleton className="skeleton-line" /> : null}
      <div className="list-stack">
        {pages?.length ? (
          pages.map((page) => (
            <Link key={page.id} to={`/spaces/${space.id}/pages/${page.id}`} className="list-row">
              <div className="member-row-main">
                <FileText size={16} />
                <span>{page.title}</span>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState title="No pages yet" description="Create the first page in this space." />
        )}
      </div>
      <Button variant="secondary" icon={<Plus size={16} />} onClick={() => onOpenNewPage(space)}>
        New Page
      </Button>
    </Card>
  );
}

export default function SpacesPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const workspaceId = getActiveWorkspaceId() ?? "";
  const { data: spaces, isLoading, error, reload } = useApi(
    () => (workspaceId ? spaceService.listSpaces(workspaceId) : Promise.resolve([])),
    [workspaceId]
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [pageModalSpace, setPageModalSpace] = useState<Space | null>(null);
  const [pageTitle, setPageTitle] = useState("");

  async function handleCreateSpace(event: FormEvent) {
    event.preventDefault();
    try {
      await spaceService.createSpace(workspaceId, { name, key: key.toUpperCase() });
      pushToast("Space created", "success");
      setName("");
      setKey("");
      setIsCreateOpen(false);
      await reload();
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create space"), "error");
    }
  }

  async function handleCreatePage(event: FormEvent) {
    event.preventDefault();
    if (!pageModalSpace || !pageTitle.trim()) return;
    try {
      const page = await spaceService.createPage(pageModalSpace.id, { title: pageTitle.trim(), content: "" });
      setPageTitle("");
      setPageModalSpace(null);
      navigate(`/spaces/${pageModalSpace.id}/pages/${page.id}`);
    } catch (pageError) {
      pushToast(getApiErrorMessage(pageError, "Could not create page"), "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Spaces"
        title="Team Spaces"
        description="Wiki-style spaces for documentation, specs, and knowledge sharing."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)} disabled={!workspaceId}>
            New Space
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

      {!isLoading && !spaces?.length ? (
        <EmptyState
          title="No spaces yet"
          description="Create a space to start documenting decisions and knowledge."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)} disabled={!workspaceId}>
              New Space
            </Button>
          }
        />
      ) : null}

      <div className="content-grid three-column-grid">
        {(spaces ?? []).map((space) => (
          <SpacePagesList key={space.id} space={space} onOpenNewPage={setPageModalSpace} />
        ))}
      </div>

      <Modal isOpen={isCreateOpen} title="New Space" onClose={() => setIsCreateOpen(false)}>
        <form className="form-stack" onSubmit={handleCreateSpace}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="Key" value={key} onChange={(event) => setKey(event.target.value.toUpperCase())} required />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(pageModalSpace)} title="New Page" onClose={() => setPageModalSpace(null)}>
        <form className="form-stack" onSubmit={handleCreatePage}>
          <Input label="Title" value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} required />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setPageModalSpace(null)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
