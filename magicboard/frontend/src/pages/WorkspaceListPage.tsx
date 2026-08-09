import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { useApi } from "../hooks/useApi";
import { workspaceService } from "../services/workspaceService";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { setActiveWorkspaceId } from "../utils/workspaceState";

export default function WorkspaceListPage() {
  const { pushToast } = useToast();
  const { data: workspaces, reload } = useApi(() => workspaceService.listWorkspaces(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      const workspace = await workspaceService.createWorkspace({ name: name.trim() });
      setActiveWorkspaceId(workspace.id);
      setName("");
      setIsOpen(false);
      await reload();
      pushToast("Workspace created", "success");
    } catch (error) {
      pushToast(getApiErrorMessage(error, "Could not create workspace"), "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Magicboard"
        title="Workspaces"
        description="Choose a workspace to browse knowledge spaces."
        actions={<Button onClick={() => setIsOpen(true)}>New workspace</Button>}
      />
      <div className="content-grid three-column-grid">
        {(workspaces ?? []).map((workspace) => (
          <Card key={workspace.id}>
            <h2>{workspace.name}</h2>
            <p className="muted-copy">{workspace.description || workspace.slug}</p>
            <div className="button-row">
              <Link to={`/workspaces/${workspace.id}`}>
                <Button
                  variant="secondary"
                  onClick={() => setActiveWorkspaceId(workspace.id)}
                >
                  Settings
                </Button>
              </Link>
              <Link to="/">
                <Button onClick={() => setActiveWorkspaceId(workspace.id)}>Open Magicboard</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
      <Modal isOpen={isOpen} title="New workspace" onClose={() => setIsOpen(false)}>
        <form className="form-stack" onSubmit={handleCreate}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
