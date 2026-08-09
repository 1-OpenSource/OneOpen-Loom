import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { useApi } from "../hooks/useApi";
import { workspaceService } from "../services/workspaceService";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { setActiveWorkspaceId } from "../utils/workspaceState";

export default function WorkspaceDetailPage() {
  const { workspaceId = "" } = useParams();
  const { pushToast } = useToast();
  const { data: workspace, reload } = useApi(() => workspaceService.getWorkspace(workspaceId), [workspaceId]);
  const { data: members } = useApi(() => workspaceService.listMembers(workspaceId), [workspaceId]);
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");

  if (workspace && !name && name !== workspace.name) {
    // hydrate once
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    try {
      await workspaceService.updateWorkspace(workspaceId, {
        name: name.trim() || workspace?.name,
        brand_name: brandName.trim() || null,
        brand_tagline: tagline.trim() || null
      } as never);
      setActiveWorkspaceId(workspaceId);
      pushToast("Workspace updated", "success");
      await reload();
    } catch (error) {
      pushToast(getApiErrorMessage(error, "Could not update workspace"), "error");
    }
  }

  if (!workspace) {
    return <div className="state-text">Loading workspace…</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Magicboard"
        title={workspace.name}
        description={workspace.description || "Workspace settings for Magicboard."}
        actions={
          <Link to="/">
            <Button variant="secondary">Open spaces</Button>
          </Link>
        }
      />

      <div className="content-grid two-column-grid">
        <Card>
          <h2>Branding</h2>
          <form className="form-stack" onSubmit={handleSave}>
            <Input
              label="Name"
              value={name || workspace.name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              label="Brand name"
              value={brandName || workspace.brand_name || ""}
              onChange={(event) => setBrandName(event.target.value)}
            />
            <Input
              label="Tagline"
              value={tagline || workspace.brand_tagline || ""}
              onChange={(event) => setTagline(event.target.value)}
            />
            <Button type="submit">Save</Button>
          </form>
        </Card>

        <Card>
          <div className="section-heading">
            <h2>Members</h2>
            <span className="section-count">{members?.length ?? 0}</span>
          </div>
          <div className="list-stack">
            {(members ?? []).map((member) => (
              <div key={member.id} className="list-row">
                <div>
                  <strong>{member.user?.name || member.user_id.slice(0, 8)}</strong>
                  <p className="muted-copy">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
