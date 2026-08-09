import {
  Download,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Paperclip,
  Trash2,
  Upload
} from "lucide-react";
import type { DragEvent } from "react";
import { useRef, useState } from "react";
import type { WorkItemAttachment } from "../../types/workItem";
import { formatRelativeTime } from "../../utils/activityFormat";
import { formatFileSize, getFileKind, type FileKind } from "../../utils/fileFormat";
import { formatDateTime } from "../../utils/formatDate";
import { workItemService } from "../../services/workItemService";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";

interface AttachmentsPanelProps {
  workItemId: string;
  attachments: WorkItemAttachment[];
  onChanged: () => Promise<void> | void;
  onNotify: (message: string, tone?: "success" | "error" | "info") => void;
}

function FileKindIcon({ kind }: { kind: FileKind }) {
  const props = { size: 18 };
  switch (kind) {
    case "image":
      return <FileImage {...props} />;
    case "pdf":
    case "doc":
      return <FileText {...props} />;
    case "sheet":
      return <FileSpreadsheet {...props} />;
    case "archive":
      return <FileArchive {...props} />;
    case "code":
      return <FileCode2 {...props} />;
    default:
      return <File {...props} />;
  }
}

export default function AttachmentsPanel({ workItemId, attachments, onChanged, onNotify }: AttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [busyAttachmentId, setBusyAttachmentId] = useState<string | null>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.size > 0);
    if (!list.length) {
      return;
    }

    setIsUploading(true);
    try {
      for (const file of list) {
        await workItemService.uploadAttachment(workItemId, file);
      }
      await onChanged();
      onNotify(list.length === 1 ? "Attachment uploaded" : `${list.length} attachments uploaded`, "success");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Upload failed", "error");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleDownload(attachment: WorkItemAttachment) {
    setBusyAttachmentId(attachment.id);
    try {
      await workItemService.downloadAttachment(attachment.id, attachment.filename);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Download failed", "error");
    } finally {
      setBusyAttachmentId(null);
    }
  }

  async function handleDelete(attachment: WorkItemAttachment) {
    setBusyAttachmentId(attachment.id);
    try {
      await workItemService.deleteAttachment(attachment.id);
      await onChanged();
      onNotify("Attachment deleted", "success");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Delete failed", "error");
    } finally {
      setBusyAttachmentId(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  return (
    <div className="attachments-panel">
      <div
        className={`attachment-dropzone ${isDragging ? "is-dragging" : ""} ${isUploading ? "is-busy" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <div className="attachment-dropzone-icon" aria-hidden="true">
          {isUploading ? <LoaderCircle size={22} className="spin" /> : <Upload size={22} />}
        </div>
        <div className="attachment-dropzone-copy">
          <strong>{isUploading ? "Uploading…" : "Drop files here"}</strong>
          <p>or browse from your computer</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          icon={<Paperclip size={16} />}
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          Browse
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          disabled={isUploading}
          onChange={(event) => {
            if (event.target.files?.length) {
              void uploadFiles(event.target.files);
            }
          }}
        />
      </div>

      {attachments.length ? (
        <ul className="attachment-list">
          {attachments.map((attachment) => {
            const kind = getFileKind(attachment.filename, attachment.content_type);
            const busy = busyAttachmentId === attachment.id;

            return (
              <li className="attachment-item" key={attachment.id}>
                <div className={`attachment-icon attachment-icon-${kind}`} aria-hidden="true">
                  <FileKindIcon kind={kind} />
                </div>
                <div className="attachment-meta">
                  <button
                    type="button"
                    className="attachment-name"
                    onClick={() => void handleDownload(attachment)}
                    disabled={busy}
                    title={attachment.filename}
                  >
                    {attachment.filename}
                  </button>
                  <div className="attachment-submeta">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span aria-hidden="true">·</span>
                    <span title={formatDateTime(attachment.created_at)}>{formatRelativeTime(attachment.created_at)}</span>
                    {attachment.uploaded_by ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="attachment-uploader">
                          <Avatar user={attachment.uploaded_by} size="sm" />
                          {attachment.uploaded_by.name}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="attachment-actions">
                  <button
                    type="button"
                    className="attachment-action"
                    aria-label={`Download ${attachment.filename}`}
                    disabled={busy}
                    onClick={() => void handleDownload(attachment)}
                  >
                    {busy ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}
                  </button>
                  <button
                    type="button"
                    className="attachment-action attachment-action-danger"
                    aria-label={`Delete ${attachment.filename}`}
                    disabled={busy}
                    onClick={() => void handleDelete(attachment)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No attachments yet" description="Drop files above to keep specs, designs, and evidence with this work item." />
      )}
    </div>
  );
}
