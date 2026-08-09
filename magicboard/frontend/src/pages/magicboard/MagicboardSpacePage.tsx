import { Archive, Download, FilePlus, MoreHorizontal, Plus, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import PageTree from "../../components/magicboard/PageTree";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import { useToast } from "../../components/ui/ToastProvider";
import { useApi } from "../../hooks/useApi";
import { magicboardService } from "../../services/magicboardService";
import { workspaceService } from "../../services/workspaceService";
import type { SpaceMemberRole } from "../../types/magicboard";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getActiveWorkspaceId } from "../../utils/workspaceState";

const memberRoleOptions: Array<{ label: string; value: SpaceMemberRole }> = [
  { label: "View", value: "VIEW" },
  { label: "Edit", value: "EDIT" },
  { label: "Admin", value: "ADMIN" }
];

export default function MagicboardSpacePage() {
  const { spaceId = "", pageId } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const {
    data: space,
    isLoading: isSpaceLoading,
    error: spaceError,
    reload: reloadSpace
  } = useApi(() => magicboardService.getSpace(spaceId), [spaceId]);
  const workspaceId = space?.workspace_id || getActiveWorkspaceId() || "";
  const { data: tree, reload: reloadTree } = useApi(() => magicboardService.getPageTree(spaceId), [spaceId]);
  const { data: templates } = useApi(() => magicboardService.listTemplates(), []);
  const { data: members, reload: reloadMembers } = useApi(
    () => magicboardService.listSpaceMembers(spaceId),
    [spaceId]
  );
  const { data: workspaceMembers } = useApi(
    () => (workspaceId ? workspaceService.listMembers(workspaceId) : Promise.resolve([])),
    [workspaceId]
  );
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [memberDraft, setMemberDraft] = useState<Array<{ user_id: string; role: SpaceMemberRole }>>([]);

  useEffect(() => {
    function onCreatePage() {
      setIsPageModalOpen(true);
    }
    window.addEventListener("magicboard:create-page", onCreatePage);
    return () => window.removeEventListener("magicboard:create-page", onCreatePage);
  }, []);

  async function handleCreatePage(event: FormEvent) {
    event.preventDefault();
    if (!pageTitle.trim()) return;
    try {
      const page = await magicboardService.createPage(spaceId, { title: pageTitle.trim(), content: "" });
      setPageTitle("");
      setIsPageModalOpen(false);
      await reloadTree();
      navigate(`/magicboard/spaces/${spaceId}/pages/${page.id}?edit=1`);
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create page"), "error");
    }
  }

  async function handleCreateFromTemplate(event: FormEvent) {
    event.preventDefault();
    if (!templateKey) return;
    try {
      const page = await magicboardService.createPageFromTemplate(spaceId, {
        template_key: templateKey,
        title: templateTitle.trim() || undefined
      });
      setTemplateKey("");
      setTemplateTitle("");
      setIsTemplateModalOpen(false);
      await reloadTree();
      navigate(`/magicboard/spaces/${spaceId}/pages/${page.id}?edit=1`);
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create page from template"), "error");
    }
  }

  async function handleArchiveSpace() {
    try {
      await magicboardService.archiveSpace(spaceId);
      pushToast("Space archived", "success");
      await reloadSpace();
    } catch (archiveError) {
      pushToast(getApiErrorMessage(archiveError, "Could not archive space"), "error");
    }
  }

  async function handleExport() {
    try {
      const payload = await magicboardService.exportSpace(spaceId);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${payload.space_key || "space"}-export.json`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      pushToast("Export downloaded", "success");
    } catch (exportError) {
      pushToast(getApiErrorMessage(exportError, "Export failed"), "error");
    }
  }

  function openMembersModal() {
    setMemberDraft((members ?? []).map((member) => ({ user_id: member.user_id, role: member.role })));
    setIsMembersOpen(true);
    setMoreOpen(false);
  }

  async function handleSaveMembers(event: FormEvent) {
    event.preventDefault();
    try {
      await magicboardService.setSpaceMembers(spaceId, { members: memberDraft });
      pushToast("Members updated", "success");
      setIsMembersOpen(false);
      await reloadMembers();
    } catch (membersError) {
      pushToast(getApiErrorMessage(membersError, "Could not update members"), "error");
    }
  }

  function toggleMember(userId: string, role: SpaceMemberRole) {
    setMemberDraft((current) => {
      const existing = current.find((entry) => entry.user_id === userId);
      if (existing) {
        return current.filter((entry) => entry.user_id !== userId);
      }
      return [...current, { user_id: userId, role }];
    });
  }

  function updateMemberRole(userId: string, role: SpaceMemberRole) {
    setMemberDraft((current) =>
      current.map((entry) => (entry.user_id === userId ? { ...entry, role } : entry))
    );
  }

  if (isSpaceLoading) {
    return <div className="state-text">Loading space…</div>;
  }
  if (!space) {
    return <div className="error-banner">{spaceError || "Space not found."}</div>;
  }

  return (
    <div className="mb-space">
      <aside className="mb-space-nav">
        <div className="mb-space-nav-head">
          <Link to="/" className="mb-space-nav-crumb">
            Spaces
          </Link>
          <h1>{space.name}</h1>
          <p className="mb-quiet">{space.description || space.key}</p>
        </div>
        <div className="mb-space-nav-actions">
          <Button icon={<Plus size={14} />} onClick={() => setIsPageModalOpen(true)}>
            Create
          </Button>
          <Button variant="secondary" icon={<FilePlus size={14} />} onClick={() => setIsTemplateModalOpen(true)}>
            Templates
          </Button>
          <div className="mb-space-more">
            <Button
              variant="secondary"
              icon={<MoreHorizontal size={14} />}
              onClick={() => setMoreOpen((value) => !value)}
              aria-label="More space actions"
            />
            {moreOpen ? (
              <div className="mb-topnav-menu mb-space-more-menu" role="menu">
                <button type="button" role="menuitem" onClick={openMembersModal}>
                  <Users size={14} /> Members
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    void handleExport();
                  }}
                >
                  <Download size={14} /> Export
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="is-danger"
                  onClick={() => {
                    setMoreOpen(false);
                    void handleArchiveSpace();
                  }}
                >
                  <Archive size={14} /> Archive
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mb-space-tree-wrap">
          <p className="mb-space-tree-label">Content</p>
          <PageTree tree={tree ?? []} spaceId={spaceId} activePageId={pageId} />
        </div>
      </aside>

      <section className="mb-space-canvas">
        {pageId ? (
          <Outlet context={{ space, workspaceId, onTreeChange: reloadTree }} />
        ) : (
          <div className="mb-page-blank">
            <EmptyState
              title="Select a page"
              description="Choose a page from the sidebar, or create one to start writing."
              action={
                <Button icon={<Plus size={16} />} onClick={() => setIsPageModalOpen(true)}>
                  Create page
                </Button>
              }
            />
          </div>
        )}
      </section>

      <Modal isOpen={isPageModalOpen} title="Create page" onClose={() => setIsPageModalOpen(false)}>
        <form className="form-stack" onSubmit={handleCreatePage}>
          <Input label="Title" value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} required />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsPageModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isTemplateModalOpen} title="Create from template" onClose={() => setIsTemplateModalOpen(false)}>
        <form className="form-stack" onSubmit={handleCreateFromTemplate}>
          <Select
            label="Template"
            options={[
              { label: "Select template", value: "" },
              ...(templates ?? []).map((template) => ({ label: template.title, value: template.key }))
            ]}
            value={templateKey}
            onChange={(event) => setTemplateKey(event.target.value)}
            required
          />
          <Input
            label="Title (optional)"
            value={templateTitle}
            onChange={(event) => setTemplateTitle(event.target.value)}
          />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isMembersOpen} title="Space members" onClose={() => setIsMembersOpen(false)}>
        <form className="form-stack" onSubmit={handleSaveMembers}>
          <div className="list-stack">
            {(workspaceMembers ?? []).map((member) => {
              const entry = memberDraft.find((draft) => draft.user_id === member.user_id);
              return (
                <div key={member.user_id} className="list-row">
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={Boolean(entry)}
                      onChange={() => toggleMember(member.user_id, entry?.role ?? "VIEW")}
                    />
                    <span>{member.user?.name ?? member.user_id}</span>
                  </label>
                  {entry ? (
                    <Select
                      options={memberRoleOptions}
                      value={entry.role}
                      onChange={(event) => updateMemberRole(member.user_id, event.target.value as SpaceMemberRole)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsMembersOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
