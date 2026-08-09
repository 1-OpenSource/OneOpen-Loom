import { BookOpen, Link2, Plus, Unlink } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import { useToast } from "../ui/ToastProvider";
import { useApi } from "../../hooks/useApi";
import { magicboardService } from "../../services/magicboardService";
import type { Space, SpacePage } from "../../types/magicboard";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getActiveWorkspaceId } from "../../utils/workspaceState";

export default function WorkItemDocsPanel({
  workItemId,
  onChanged
}: {
  workItemId: string;
  onChanged?: () => void;
}) {
  const { pushToast } = useToast();
  const workspaceId = getActiveWorkspaceId() ?? "";
  const { data: linkedPages, reload } = useApi(() => magicboardService.listPagesForWorkItem(workItemId), [workItemId]);
  const { data: spaces } = useApi(
    () => (workspaceId ? magicboardService.listSpaces(workspaceId) : Promise.resolve([])),
    [workspaceId]
  );
  const { data: templates } = useApi(() => magicboardService.listTemplates(), []);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [pagesInSpace, setPagesInSpace] = useState<SpacePage[]>([]);
  const [createTemplateKey, setCreateTemplateKey] = useState("");
  const [createTitle, setCreateTitle] = useState("");

  async function loadPagesForSpace(spaceId: string) {
    setSelectedSpaceId(spaceId);
    setSelectedPageId("");
    const pages = await magicboardService.listPagesFlat(spaceId);
    setPagesInSpace(pages);
  }

  async function handleLink(event: FormEvent) {
    event.preventDefault();
    if (!selectedPageId) return;
    try {
      await magicboardService.linkPageToWorkItem(workItemId, { page_id: selectedPageId });
      pushToast("Page linked", "success");
      setIsLinkOpen(false);
      await reload();
      onChanged?.();
    } catch (linkError) {
      pushToast(getApiErrorMessage(linkError, "Could not link page"), "error");
    }
  }

  async function handleUnlink(pageId: string) {
    try {
      await magicboardService.unlinkPageFromWorkItem(workItemId, pageId);
      pushToast("Page unlinked", "success");
      await reload();
      onChanged?.();
    } catch (unlinkError) {
      pushToast(getApiErrorMessage(unlinkError, "Could not unlink page"), "error");
    }
  }

  async function handleCreatePage(event: FormEvent) {
    event.preventDefault();
    if (!selectedSpaceId || !createTemplateKey) return;
    try {
      const page = await magicboardService.createPageFromTemplate(selectedSpaceId, {
        template_key: createTemplateKey,
        title: createTitle.trim() || undefined
      });
      await magicboardService.linkPageToWorkItem(workItemId, { page_id: page.id });
      pushToast("Page created and linked", "success");
      setIsCreateOpen(false);
      setCreateTitle("");
      setCreateTemplateKey("");
      await reload();
      onChanged?.();
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create page"), "error");
    }
  }

  return (
    <>
      <div className="button-row">
        <Button variant="secondary" icon={<Link2 size={14} />} onClick={() => setIsLinkOpen(true)}>
          Link page
        </Button>
        <Button icon={<Plus size={14} />} onClick={() => setIsCreateOpen(true)}>
          Create page
        </Button>
      </div>

      <div className="list-stack list-stack-compact">
        {linkedPages?.length ? (
          linkedPages.map((page) => (
            <div key={page.id} className="list-row list-row-compact">
              <div>
                <Link to={`/magicboard/spaces/${page.space_id}/pages/${page.id}`} className="work-item-title-link">
                  <BookOpen size={14} /> {page.title}
                </Link>
                <p className="muted-copy">{page.slug}</p>
              </div>
              <Button variant="danger" icon={<Unlink size={14} />} onClick={() => void handleUnlink(page.id)}>
                Unlink
              </Button>
            </div>
          ))
        ) : (
          <p className="muted-copy">No linked documentation pages.</p>
        )}
      </div>

      <Modal isOpen={isLinkOpen} title="Link existing page" onClose={() => setIsLinkOpen(false)}>
        <form className="form-stack" onSubmit={handleLink}>
          <Select
            label="Space"
            options={[
              { label: "Select space", value: "" },
              ...(spaces ?? []).map((space: Space) => ({ label: `${space.key} · ${space.name}`, value: space.id }))
            ]}
            value={selectedSpaceId}
            onChange={(event) => void loadPagesForSpace(event.target.value)}
          />
          <Select
            label="Page"
            options={[
              { label: "Select page", value: "" },
              ...pagesInSpace.map((page) => ({ label: page.title, value: page.id }))
            ]}
            value={selectedPageId}
            onChange={(event) => setSelectedPageId(event.target.value)}
          />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Link</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCreateOpen} title="Create page from template" onClose={() => setIsCreateOpen(false)}>
        <form className="form-stack" onSubmit={handleCreatePage}>
          <Select
            label="Space"
            options={[
              { label: "Select space", value: "" },
              ...(spaces ?? []).map((space) => ({ label: `${space.key} · ${space.name}`, value: space.id }))
            ]}
            value={selectedSpaceId}
            onChange={(event) => setSelectedSpaceId(event.target.value)}
          />
          <Select
            label="Template"
            options={[
              { label: "Select template", value: "" },
              ...(templates ?? []).map((template) => ({ label: template.title, value: template.key }))
            ]}
            value={createTemplateKey}
            onChange={(event) => setCreateTemplateKey(event.target.value)}
          />
          <label className="field">
            <span>Title (optional)</span>
            <input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} />
          </label>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create & link</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
