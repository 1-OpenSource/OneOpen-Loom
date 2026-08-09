import {
  Bell,
  BellOff,
  Eye,
  History,
  Link2,
  MessageSquare,
  Paperclip,
  Pencil,
  Save,
  Share2,
  Star,
  Trash2
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import MarkdownWithMacros from "../../components/magicboard/MarkdownWithMacros";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { useToast } from "../../components/ui/ToastProvider";
import { magicboardService } from "../../services/magicboardService";
import type {
  Space,
  SpacePage,
  SpacePageAttachment,
  SpacePageComment,
  SpacePageShareLink,
  SpacePageVersion
} from "../../types/magicboard";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { formatDateTime } from "../../utils/formatDate";

interface OutletContext {
  space: Space;
  workspaceId: string;
  onTreeChange: () => Promise<void>;
}

const statusOptions = [
  { label: "Draft", value: "DRAFT" },
  { label: "Published", value: "PUBLISHED" }
];

export default function MagicboardPageEditor() {
  const { spaceId = "", pageId = "" } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { space, workspaceId, onTreeChange } = useOutletContext<OutletContext>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState<SpacePage | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");
  const [icon, setIcon] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [versions, setVersions] = useState<SpacePageVersion[]>([]);
  const [comments, setComments] = useState<SpacePageComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [attachments, setAttachments] = useState<SpacePageAttachment[]>([]);
  const [shareLinks, setShareLinks] = useState<SpacePageShareLink[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      const [pageResult, versionList, commentList, attachmentList, shareList] = await Promise.all([
        magicboardService.getPage(pageId),
        magicboardService.listPageVersions(pageId),
        magicboardService.listPageComments(pageId),
        magicboardService.listAttachments(pageId),
        magicboardService.listShareLinks(pageId)
      ]);
      if (cancelled) return;
      setPage(pageResult);
      setTitle(pageResult?.title ?? "");
      setContent(pageResult?.content ?? "");
      setStatus(pageResult?.status ?? "PUBLISHED");
      setIcon(pageResult?.icon ?? "");
      setLabelsInput((pageResult?.labels ?? []).join(", "));
      setVersions(versionList);
      setComments(commentList);
      setAttachments(attachmentList);
      setShareLinks(shareList);
      setIsLoading(false);
      void magicboardService.recordPageView(pageId);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  async function handleSave() {
    try {
      const labels = labelsInput
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const updated = await magicboardService.updatePage(pageId, {
        title: title.trim(),
        content,
        status,
        icon: icon.trim() || null,
        labels
      });
      setPage(updated);
      setVersions(await magicboardService.listPageVersions(pageId));
      await onTreeChange();
      pushToast("Page saved", "success");
    } catch (saveError) {
      pushToast(getApiErrorMessage(saveError, "Could not save page"), "error");
    }
  }

  async function handleDelete() {
    try {
      await magicboardService.deletePage(pageId);
      pushToast("Page deleted", "success");
      await onTreeChange();
      navigate(`/magicboard/spaces/${spaceId}`);
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Could not delete page"), "error");
    }
  }

  async function handleRestore(versionId: string) {
    try {
      const restored = await magicboardService.restorePageVersion(pageId, versionId);
      setPage(restored);
      setTitle(restored.title);
      setContent(restored.content ?? "");
      setStatus(restored.status);
      setVersions(await magicboardService.listPageVersions(pageId));
      pushToast("Version restored", "success");
    } catch (restoreError) {
      pushToast(getApiErrorMessage(restoreError, "Could not restore version"), "error");
    }
  }

  async function handleAddComment(event: FormEvent) {
    event.preventDefault();
    if (!commentBody.trim()) return;
    try {
      const created = await magicboardService.addPageComment(pageId, { body: commentBody.trim() });
      setComments((current) => [...current, created]);
      setCommentBody("");
      pushToast("Comment added", "success");
    } catch (commentError) {
      pushToast(getApiErrorMessage(commentError, "Could not add comment"), "error");
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await magicboardService.deletePageComment(commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Could not delete comment"), "error");
    }
  }

  async function toggleFavorite() {
    try {
      if (isFavorite) {
        await magicboardService.unfavoritePage(pageId);
        setIsFavorite(false);
      } else {
        await magicboardService.favoritePage(pageId);
        setIsFavorite(true);
      }
    } catch (favoriteError) {
      pushToast(getApiErrorMessage(favoriteError, "Could not update favorite"), "error");
    }
  }

  async function toggleWatch() {
    try {
      if (isWatching) {
        await magicboardService.unwatchPage(pageId);
        setIsWatching(false);
      } else {
        await magicboardService.watchPage(pageId);
        setIsWatching(true);
      }
    } catch (watchError) {
      pushToast(getApiErrorMessage(watchError, "Could not update watch"), "error");
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const created = await magicboardService.uploadAttachment(pageId, file);
      setAttachments((current) => [created, ...current]);
      pushToast("Attachment uploaded", "success");
    } catch (uploadError) {
      pushToast(getApiErrorMessage(uploadError, "Could not upload attachment"), "error");
    } finally {
      event.target.value = "";
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    try {
      await magicboardService.deleteAttachment(attachmentId);
      setAttachments((current) => current.filter((item) => item.id !== attachmentId));
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Could not delete attachment"), "error");
    }
  }

  async function handleCreateShareLink() {
    try {
      const link = await magicboardService.createShareLink(pageId);
      setShareLinks((current) => [link, ...current]);
      const absolute = `${window.location.origin}${link.share_path}`;
      await navigator.clipboard.writeText(absolute);
      pushToast("Share link created and copied", "success");
    } catch (shareError) {
      pushToast(getApiErrorMessage(shareError, "Could not create share link"), "error");
    }
  }

  async function handleRevokeShareLink(linkId: string) {
    try {
      await magicboardService.revokeShareLink(linkId);
      setShareLinks((current) => current.filter((link) => link.id !== linkId));
      pushToast("Share link revoked", "success");
    } catch (revokeError) {
      pushToast(getApiErrorMessage(revokeError, "Could not revoke share link"), "error");
    }
  }


  function insertMacro(snippet: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}${snippet}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  if (isLoading) return <div className="state-text">Loading page…</div>;
  if (!page) return <div className="error-banner">Page not found.</div>;

  const projectOptions = (projectsPage?.items ?? []).map((project) => ({
    label: `${project.key} · ${project.name}`,
    value: project.id
  }));

  return (
    <div className="magicboard-editor">
      <div className="magicboard-editor-toolbar">
        <div className="button-row">
          <Button
            variant="secondary"
            icon={isPreview ? <Pencil size={14} /> : <Eye size={14} />}
            onClick={() => setIsPreview((value) => !value)}
          >
            {isPreview ? "Edit" : "Preview"}
          </Button>
          <Button icon={<Save size={14} />} onClick={() => void handleSave()}>
            Save
          </Button>
          <Button variant="secondary" icon={<Star size={14} />} onClick={() => void toggleFavorite()}>
            {isFavorite ? "Unfavorite" : "Favorite"}
          </Button>
          <Button
            variant="secondary"
            icon={isWatching ? <BellOff size={14} /> : <Bell size={14} />}
            onClick={() => void toggleWatch()}
          >
            {isWatching ? "Unwatch" : "Watch"}
          </Button>
          <Button variant="secondary" icon={<Share2 size={14} />} onClick={() => void handleCreateShareLink()}>
            Share
          </Button>
          <Button variant="secondary" icon={<History size={14} />} onClick={() => setShowVersions((value) => !value)}>
            Versions
          </Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => void handleDelete()}>
            Delete
          </Button>
        </div>
        <div className="button-row magicboard-macro-toolbar">
          <Button variant="secondary" onClick={() => insertMacro("{{toc}}")}>
            TOC
          </Button>
          <Button variant="secondary" onClick={() => insertMacro("{{workitem:PROJ-1}}")}>
            Work item
          </Button>
          <Button variant="secondary" onClick={() => insertMacro("{{info:Note text}}")}>
            Info
          </Button>
          <Button variant="secondary" onClick={() => insertMacro("{{include:page-slug}}")}>
            Include
          </Button>
        </div>
      </div>

      <Card>
        <div className="form-grid magicboard-editor-meta">
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(event) => setStatus(event.target.value as "DRAFT" | "PUBLISHED")}
          />
          <Input label="Icon" value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="📄" />
          <Input
            label="Labels"
            value={labelsInput}
            onChange={(event) => setLabelsInput(event.target.value)}
            placeholder="docs, spec"
          />
        </div>

        {isPreview ? (
          <div className="space-page-preview">
            <MarkdownWithMacros text={content} workspaceId={workspaceId} spaceId={spaceId} />
          </div>
        ) : (
          <label className="field" htmlFor="magicboard-page-content">
            <span>Content (Markdown)</span>
            <textarea
              id="magicboard-page-content"
              ref={textareaRef}
              className="space-page-textarea"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={20}
            />
          </label>
        )}
      </Card>

      {showVersions ? (
        <Card>
          <div className="section-heading">
            <h2>Version history</h2>
            <span className="section-count">{versions.length}</span>
          </div>
          <div className="list-stack">
            {versions.map((version) => (
              <div key={version.id} className="list-row">
                <div>
                  <strong>{formatDateTime(version.created_at)}</strong>
                  <p className="muted-copy">Edited by {version.edited_by_user_id.slice(0, 8)}…</p>
                </div>
                <Button variant="secondary" onClick={() => void handleRestore(version.id)}>
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="content-grid two-column-grid">
        <Card>
          <div className="section-heading">
            <h2>
              <MessageSquare size={16} /> Comments
            </h2>
            <span className="section-count">{comments.length}</span>
          </div>
          <form className="form-stack" onSubmit={handleAddComment}>
            <label className="field">
              <span>Add comment</span>
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={3}
                placeholder="Leave a comment…"
              />
            </label>
            <Button type="submit">Post</Button>
          </form>
          <div className="list-stack">
            {comments.map((comment) => (
              <div key={comment.id} className="list-row">
                <div>
                  <p>{comment.body}</p>
                  <span className="muted-copy">{formatDateTime(comment.created_at)}</span>
                </div>
                <Button variant="danger" onClick={() => void handleDeleteComment(comment.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="section-heading">
            <h2>
              <Link2 size={16} /> Workboard
            </h2>
          </div>
          <p className="muted-copy">
            Work item links come from the optional Workboard connector. Embed with {"{{workitem:KEY}}"} when Workboard is configured.
          </p>
        </Card>
      </div>

      <div className="content-grid two-column-grid">
        <Card>
          <div className="section-heading">
            <h2>
              <Paperclip size={16} /> Attachments
            </h2>
            <span className="section-count">{attachments.length}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(event) => void handleUpload(event)}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Upload file
          </Button>
          <div className="list-stack">
            {attachments.length ? (
              attachments.map((attachment) => (
                <div key={attachment.id} className="list-row">
                  <div>
                    <strong>{attachment.filename}</strong>
                    <p className="muted-copy">{attachment.size_bytes} bytes</p>
                  </div>
                  <Button variant="danger" onClick={() => void handleDeleteAttachment(attachment.id)}>
                    Delete
                  </Button>
                </div>
              ))
            ) : (
              <p className="muted-copy">No attachments yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="section-heading">
            <h2>
              <Share2 size={16} /> Share links
            </h2>
            <span className="section-count">{shareLinks.length}</span>
          </div>
          <p className="muted-copy">Workspace members can open these links. Public anonymous access is not enabled.</p>
          <div className="list-stack">
            {shareLinks.length ? (
              shareLinks.map((link) => (
                <div key={link.id} className="list-row">
                  <div>
                    <code>{link.share_path}</code>
                    <p className="muted-copy">{formatDateTime(link.created_at)}</p>
                  </div>
                  <Button variant="danger" onClick={() => void handleRevokeShareLink(link.id)}>
                    Revoke
                  </Button>
                </div>
              ))
            ) : (
              <p className="muted-copy">Create a share link from the toolbar.</p>
            )}
          </div>
        </Card>
      </div>

      <p className="muted-copy magicboard-page-meta">
        <Link to={`/magicboard/${space.key}/${page.slug}`}>
          {space.key}/{page.slug}
        </Link>{" "}
        · Updated {formatDateTime(page.updated_at)}
      </p>

    </div>
  );
}
