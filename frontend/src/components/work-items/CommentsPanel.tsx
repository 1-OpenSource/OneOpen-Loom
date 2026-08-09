import { Pencil, Send, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { Comment } from "../../types/comment";
import type { User } from "../../types/auth";
import { commentService } from "../../services/commentService";
import { workItemService } from "../../services/workItemService";
import { formatRelativeTime } from "../../utils/activityFormat";
import { formatDateTime } from "../../utils/formatDate";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import MarkdownContent from "../ui/MarkdownContent";
import CommentEditor from "./CommentEditor";

interface CommentsPanelProps {
  workItemId: string;
  comments: Comment[];
  currentUser?: User | null;
  onChanged: () => Promise<void> | void;
  onNotify: (message: string, tone?: "success" | "error" | "info") => void;
}

export default function CommentsPanel({
  workItemId,
  comments,
  currentUser,
  onChanged,
  onNotify
}: CommentsPanelProps) {
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  async function insertUploadedImage(file: File, target: "draft" | "edit") {
    setIsUploadingImage(true);
    try {
      const attachment = await workItemService.uploadAttachment(workItemId, file);
      const snippet = `![${attachment.filename}](attachment:${attachment.id})`;
      if (target === "draft") {
        setDraft((current) => `${current}${current && !current.endsWith("\n") ? "\n\n" : ""}${snippet}\n`);
      } else {
        setEditDraft((current) => `${current}${current && !current.endsWith("\n") ? "\n\n" : ""}${snippet}\n`);
      }
      await onChanged();
      onNotify("Picture added to comment", "success");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Image upload failed", "error");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await commentService.createComment(workItemId, draft.trim());
      setDraft("");
      await onChanged();
      onNotify("Comment added", "success");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Comment failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdit(commentId: string) {
    if (!editDraft.trim()) {
      return;
    }
    setBusyId(commentId);
    try {
      await commentService.updateComment(commentId, editDraft.trim());
      setEditingId(null);
      setEditDraft("");
      await onChanged();
      onNotify("Comment updated", "success");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Update failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(commentId: string) {
    setBusyId(commentId);
    try {
      await commentService.deleteComment(commentId);
      if (editingId === commentId) {
        setEditingId(null);
        setEditDraft("");
      }
      await onChanged();
      onNotify("Comment deleted", "success");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Delete failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="comments-panel">
      <form className="comment-composer" onSubmit={handleSubmit}>
        <div className="comment-composer-main">
          <Avatar user={currentUser} size="sm" />
          <div className="comment-composer-field">
            <label className="sr-only" htmlFor="comment-composer">
              Write a comment
            </label>
            <CommentEditor
              id="comment-composer"
              value={draft}
              onChange={setDraft}
              disabled={isSubmitting || isUploadingImage}
              placeholder="Share an update, decision, or question…"
              onUploadImage={(file) => insertUploadedImage(file, "draft")}
            />
          </div>
        </div>
        <div className="comment-composer-actions">
          <span className="comment-hint">
            {isUploadingImage
              ? "Uploading picture…"
              : draft.trim()
                ? "Supports bold, links, lists, and pictures"
                : "Visible to project members"}
          </span>
          <Button type="submit" icon={<Send size={16} />} disabled={isSubmitting || isUploadingImage || !draft.trim()}>
            {isSubmitting ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>

      {comments.length ? (
        <ul className="comment-list">
          {comments.map((comment) => {
            const isOwner = currentUser?.id === comment.user_id;
            const isEditing = editingId === comment.id;
            const isBusy = busyId === comment.id;
            const edited = comment.updated_at !== comment.created_at;

            return (
              <li className="comment-card" key={comment.id}>
                <div className="comment-card-header">
                  <div className="comment-author">
                    <Avatar user={comment.user} size="sm" />
                    <div className="comment-author-copy">
                      <strong>{comment.user.name}</strong>
                      <time dateTime={comment.created_at} title={formatDateTime(comment.created_at)}>
                        {formatRelativeTime(comment.created_at)}
                        {edited ? " · edited" : ""}
                      </time>
                    </div>
                  </div>
                  {isOwner ? (
                    <div className="comment-actions">
                      <button
                        type="button"
                        className="comment-action"
                        aria-label="Edit comment"
                        disabled={isBusy || isUploadingImage}
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditDraft(comment.comment_text);
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="comment-action comment-action-danger"
                        aria-label="Delete comment"
                        disabled={isBusy}
                        onClick={() => void handleDelete(comment.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="comment-edit">
                    <CommentEditor
                      id={`comment-edit-${comment.id}`}
                      value={editDraft}
                      onChange={setEditDraft}
                      disabled={isBusy || isUploadingImage}
                      rows={5}
                      onUploadImage={(file) => insertUploadedImage(file, "edit")}
                    />
                    <div className="comment-edit-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="button" disabled={isBusy || !editDraft.trim()} onClick={() => void handleSaveEdit(comment.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MarkdownContent text={comment.comment_text} />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Start the discussion" description="Post the first comment to capture context and decisions on this work item." />
      )}
    </div>
  );
}
