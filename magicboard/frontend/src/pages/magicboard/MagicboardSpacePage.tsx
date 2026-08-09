import { Archive, Download, FilePlus, Plus, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import PageTree from "../../components/magicboard/PageTree";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
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
  const workspaceId = getActiveWorkspaceId() ?? "";
  const { data: space, reload: reloadSpace } = useApi(() => magicboardService.getSpace(spaceId), [spaceId]);
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
  const [pageTitle, setPageTitle] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [memberDraft, setMemberDraft] = useState<Array<{ user_id: string; role: SpaceMemberRole }>>([]);

  async function handleCreatePage(event: FormEvent) {
    event.preventDefault();
    if (!pageTitle.trim()) return;
    try {
      const page = await magicboardService.createPage(spaceId, { title: pageTitle.trim(), content: "" });
      setPageTitle("");
      setIsPageModalOpen(false);
      await reloadTree();
      navigate(`/magicboard/spaces/${spaceId}/pages/${page.id}`);
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
      navigate(`/magicboard/spaces/${spaceId}/pages/${page.id}`);
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

  if (!space) {
    return <div className="state-text">Loading space…</div>;
  }

  return (
    <div className="magicboard-layout">
      <aside className="magicboard-sidebar">
        <PageHeader
          compact
          eyebrow={space.key}
          title={space.name}
          description={space.description ?? undefined}
        />
        <div className="button-row magicboard-sidebar-actions">
          <Button icon={<Plus size={14} />} onClick={() => setIsPageModalOpen(true)}>
            Page
          </Button>
          <Button variant="secondary" icon={<FilePlus size={14} />} onClick={() => setIsTemplateModalOpen(true)}>
            Template
          </Button>
        </div>
        <PageTree tree={tree ?? []} spaceId={spaceId} activePageId={pageId} />
        <div className="magicboard-sidebar-footer">
          <Button variant="secondary" icon={<Users size={14} />} onClick={openMembersModal}>
            Members
          </Button>
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => void handleExport()}>
            Export
          </Button>
          <Button variant="danger" icon={<Archive size={14} />} onClick={() => void handleArchiveSpace()}>
            Archive
          </Button>
        </div>
      </aside>

      <main className="magicboard-main">
        {pageId ? (
          <Outlet context={{ space, workspaceId, onTreeChange: reloadTree }} />
        ) : (
          <Card>
            <EmptyState
              title="Select or create a page"
              description="Choose a page from the tree or create a new one to get started."
              action={
                <Button icon={<Plus size={16} />} onClick={() => setIsPageModalOpen(true)}>
                  New Page
                </Button>
              }
            />
          </Card>
        )}
      </main>

      <Modal isOpen={isPageModalOpen} title="New Page" onClose={() => setIsPageModalOpen(false)}>
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

      <Modal isOpen={isTemplateModalOpen} title="New Page from Template" onClose={() => setIsTemplateModalOpen(false)}>
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

      <Modal isOpen={isMembersOpen} title="Space Members" onClose={() => setIsMembersOpen(false)}>
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

      <div className="magicboard-breadcrumb">
        <Link to="/magicboard">Magicboard</Link>
        <span>/</span>
        <span>{space.name}</span>
      </div>
    </div>
  );
}
