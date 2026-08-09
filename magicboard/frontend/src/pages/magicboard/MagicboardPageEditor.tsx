import {
  Bell,
  BellOff,
  History,
  MessageSquare,
  Paperclip,
  Pencil,
  Save,
  Share2,
  Star,
  Trash2,
  X
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import HtmlContent from "../../components/magicboard/editor/HtmlContent";
import PageEditor from "../../components/magicboard/editor/PageEditor";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useToast } from "../../components/ui/ToastProvider";
import { autosaveLabel, useAutosave } from "../../hooks/useAutosave";
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

export default function MagicboardPageEditor() {
  const { spaceId = "", pageId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { space, workspaceId, onTreeChange } = useOutletContext<OutletContext>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState<SpacePage | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");
  const [icon, setIcon] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "1");
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [versions, setVersions] = useState<SpacePageVersion[]>([]);
  const [comments, setComments] = useState<SpacePageComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [attachments, setAttachments] = useState<SpacePageAttachment[]>([]);
  const [shareLinks, setShareLinks] = useState<SpacePageShareLink[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [showSide, setShowSide] = useState(false);

  useEffect(() => {
    setIsEditing(searchParams.get("edit") === "1");
  }, [searchParams, pageId]);

  const labels = useMemo(
    () =>
      labelsInput
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    [labelsInput]
  );

  // Autosave persists edits as DRAFT only — Publish is the sole path to PUBLISHED.
  const autosaveSnapshot = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        content,
        icon: icon.trim(),
        labels
      }),
    [title, content, icon, labels]
  );

  const autosavePage = useCallback(async () => {
    const nextTitle = title.trim() || "Untitled";
    const titleChanged = Boolean(page && page.title !== nextTitle);
    const becameDraft = Boolean(page && page.status !== "DRAFT");
    const updated = await magicboardService.updatePage(pageId, {
      title: nextTitle,
      content,
      status: "DRAFT",
      icon: icon.trim() || null,
      labels
    });
    setPage(updated);
    setStatus("DRAFT");
    if (titleChanged || becameDraft) {
      await onTreeChange();
    }
  }, [pageId, title, content, icon, labels, page, onTreeChange]);

  const publishPage = useCallback(async () => {
    const nextTitle = title.trim() || "Untitled";
    const updated = await magicboardService.updatePage(pageId, {
      title: nextTitle,
      content,
      status: "PUBLISHED",
      icon: icon.trim() || null,
      labels
    });
    setPage(updated);
    setStatus("PUBLISHED");
    await onTreeChange();
  }, [pageId, title, content, icon, labels, onTreeChange]);

  const autosaveStatus = useAutosave({
    enabled: isEditing && !isLoading && Boolean(page),
    resetKey: pageId,
    snapshot: autosaveSnapshot,
    delayMs: 1500,
    save: autosavePage
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [pageResult, versionList, commentList, attachmentList, shareList] = await Promise.all([
          magicboardService.getPage(pageId),
          magicboardService.listPageVersions(pageId),
          magicboardService.listPageComments(pageId),
          magicboardService.listAttachments(pageId),
          magicboardService.listShareLinks(pageId)
        ]);
        if (cancelled) return;
        setPage(pageResult);
        setTitle(pageResult.title ?? "");
        setContent(pageResult.content ?? "");
        setStatus(pageResult.status ?? "PUBLISHED");
        setIcon(pageResult.icon ?? "");
        setLabelsInput((pageResult.labels ?? []).join(", "));
        setVersions(versionList);
        setComments(commentList);
        setAttachments(attachmentList);
        setShareLinks(shareList);
        void magicboardService.recordPageView(pageId);
      } catch (loadError) {
        if (!cancelled) {
          setPage(null);
          pushToast(getApiErrorMessage(loadError, "Could not load page"), "error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  function enterEdit() {
    setIsEditing(true);
    const next = new URLSearchParams(searchParams);
    next.set("edit", "1");
    setSearchParams(next, { replace: true });
  }

  function exitEdit() {
    setIsEditing(false);
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }

  async function handlePublish() {
    try {
      await publishPage();
      setVersions(await magicboardService.listPageVersions(pageId));
      pushToast("Page published", "success");
      exitEdit();
    } catch (saveError) {
      pushToast(getApiErrorMessage(saveError, "Could not publish page"), "error");
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
      exitEdit();
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
      pushToast("Share link copied", "success");
      setShowSide(true);
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

  if (isLoading) return <div className="state-text">Loading page…</div>;
  if (!page) return <div className="error-banner">Page not found.</div>;

  return (
    <div className={`mb-pageview${isEditing ? " is-editing" : ""}`}>
      <div className="mb-pageview-toolbar">
        <nav className="mb-pageview-crumbs" aria-label="Breadcrumb">
          <Link to="/">Spaces</Link>
          <span>/</span>
          <Link to={`/magicboard/spaces/${spaceId}`}>{space.name}</Link>
          <span>/</span>
          <span>{isEditing ? title.trim() || "Untitled" : page.title}</span>
        </nav>
        <div className="mb-pageview-actions">
          {isEditing ? (
            <>
              {autosaveLabel(autosaveStatus) ? (
                <span
                  className={`mb-autosave-status${autosaveStatus === "error" ? " is-error" : ""}`}
                  aria-live="polite"
                >
                  {autosaveLabel(autosaveStatus)}
                </span>
              ) : null}
              <Button variant="secondary" icon={<X size={14} />} onClick={exitEdit}>
                Close
              </Button>
              <Button icon={<Save size={14} />} onClick={() => void handlePublish()}>
                Publish
              </Button>
            </>
          ) : (
            <Button icon={<Pencil size={14} />} onClick={enterEdit}>
              Edit
            </Button>
          )}
          <Button variant="secondary" icon={<Star size={14} />} onClick={() => void toggleFavorite()}>
            {isFavorite ? "Starred" : "Star"}
          </Button>
          <Button
            variant="secondary"
            icon={isWatching ? <BellOff size={14} /> : <Bell size={14} />}
            onClick={() => void toggleWatch()}
          >
            {isWatching ? "Watching" : "Watch"}
          </Button>
          <Button variant="secondary" icon={<Share2 size={14} />} onClick={() => void handleCreateShareLink()}>
            Share
          </Button>
          <Button variant="secondary" icon={<History size={14} />} onClick={() => setShowVersions((value) => !value)}>
            History
          </Button>
          <Button variant="secondary" onClick={() => setShowSide((value) => !value)}>
            Details
          </Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => void handleDelete()}>
            Delete
          </Button>
        </div>
      </div>

      <div className="mb-pageview-body">
        <article className="mb-doc">
          {isEditing ? (
            <>
              <input
                className="mb-doc-title-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Page title"
                aria-label="Page title"
              />
              <div className="mb-doc-edit-meta">
                <div className="field">
                  <span>Status</span>
                  <p className="mb-quiet" style={{ margin: 0 }}>
                    {status === "PUBLISHED" ? "Published — edits autosave as draft until you Publish" : "Draft (autosaved)"}
                  </p>
                </div>
                <Input label="Icon" value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="📄" />
                <Input
                  label="Labels"
                  value={labelsInput}
                  onChange={(event) => setLabelsInput(event.target.value)}
                  placeholder="docs, spec"
                />
              </div>
              <PageEditor
                pageId={pageId}
                spaceId={spaceId}
                workspaceId={workspaceId}
                initialContent={content}
                onChange={setContent}
                onAttachmentUploaded={() => {
                  void magicboardService.listAttachments(pageId).then(setAttachments);
                }}
              />
            </>
          ) : (
            <>
              <h1 className="mb-doc-title">
                {icon ? <span className="mb-doc-icon">{icon}</span> : null}
                {page.title}
              </h1>
              <p className="mb-doc-byline">
                <span className={`mb-page-status-badge${page.status === "DRAFT" ? " is-draft" : " is-published"}`}>
                  {page.status === "DRAFT" ? "Draft" : "Published"}
                </span>
                {" · "}
                <Link to={`/magicboard/${space.key}/${page.slug}`}>
                  {space.key}/{page.slug}
                </Link>
                {" · "}
                Updated {formatDateTime(page.updated_at)}
                {page.labels?.length ? ` · ${page.labels.join(", ")}` : ""}
              </p>
              <div className="mb-doc-content">
                <HtmlContent text={page.content || ""} workspaceId={workspaceId} spaceId={spaceId} />
              </div>
            </>
          )}

          {showVersions ? (
            <section className="mb-doc-section">
              <h2>Version history</h2>
              <div className="mb-result-list">
                {versions.map((version) => (
                  <div key={version.id} className="mb-result-row mb-result-row-actions">
                    <div>
                      <strong>{formatDateTime(version.created_at)}</strong>
                      <span>Edited by {version.edited_by_user_id.slice(0, 8)}…</span>
                    </div>
                    <Button variant="secondary" onClick={() => void handleRestore(version.id)}>
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mb-doc-section">
            <h2>
              <MessageSquare size={16} /> Comments
              <span className="mb-count">{comments.length}</span>
            </h2>
            <form className="mb-comment-form" onSubmit={handleAddComment}>
              <textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={3}
                placeholder="Write a comment…"
              />
              <Button type="submit">Comment</Button>
            </form>
            <div className="mb-result-list">
              {comments.map((comment) => (
                <div key={comment.id} className="mb-result-row mb-result-row-actions">
                  <div>
                    <strong>{comment.body}</strong>
                    <span>{formatDateTime(comment.created_at)}</span>
                  </div>
                  <Button variant="danger" onClick={() => void handleDeleteComment(comment.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </article>

        {showSide ? (
          <aside className="mb-page-aside">
            <section>
              <h3>
                <Paperclip size={14} /> Attachments
              </h3>
              <input ref={fileInputRef} type="file" hidden onChange={(event) => void handleUpload(event)} />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Upload
              </Button>
              <div className="mb-result-list">
                {attachments.length ? (
                  attachments.map((attachment) => (
                    <div key={attachment.id} className="mb-result-row mb-result-row-actions">
                      <div>
                        <strong>{attachment.filename}</strong>
                        <span>{attachment.size_bytes} bytes</span>
                      </div>
                      <div className="row-actions">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void magicboardService
                              .downloadAttachment(attachment.id, attachment.filename)
                              .catch((downloadError) =>
                                pushToast(getApiErrorMessage(downloadError, "Could not download attachment"), "error")
                              )
                          }
                        >
                          Download
                        </Button>
                        <Button variant="danger" onClick={() => void handleDeleteAttachment(attachment.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="mb-quiet">No attachments</p>
                )}
              </div>
            </section>
            <section>
              <h3>
                <Share2 size={14} /> Share links
              </h3>
              <div className="mb-result-list">
                {shareLinks.length ? (
                  shareLinks.map((link) => (
                    <div key={link.id} className="mb-result-row mb-result-row-actions">
                      <div>
                        <code>{link.share_path}</code>
                        <span>{formatDateTime(link.created_at)}</span>
                      </div>
                      <Button variant="danger" onClick={() => void handleRevokeShareLink(link.id)}>
                        Revoke
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="mb-quiet">Create a share link from the toolbar.</p>
                )}
              </div>
            </section>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
