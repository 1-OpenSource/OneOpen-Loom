import {
  Bold,
  Code2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough
} from "lucide-react";
import { useRef, type ChangeEvent, type ReactNode } from "react";
import { applyMarkdownFormat, type MarkdownFormat } from "../../utils/markdown";

interface CommentEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  onUploadImage?: (file: File) => Promise<void> | void;
}

function promptUrl(message: string): string | null {
  const value = window.prompt(message, "https://");
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export default function CommentEditor({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 4,
  onUploadImage
}: CommentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyFormat(format: MarkdownFormat, extras?: { url?: string; alt?: string }) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const result = applyMarkdownFormat(value, start, end, format, extras);
    onChange(result.value);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) {
        return;
      }
      node.focus();
      node.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function handleToolbar(format: MarkdownFormat) {
    if (disabled) {
      return;
    }

    if (format === "link") {
      const url = promptUrl("Paste the link URL");
      if (!url) {
        return;
      }
      applyFormat("link", { url });
      return;
    }

    if (format === "image") {
      const url = promptUrl("Paste the image URL");
      if (!url) {
        return;
      }
      applyFormat("image", { url, alt: "image" });
      return;
    }

    applyFormat(format);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadImage) {
      return;
    }
    await onUploadImage(file);
  }

  const tools: Array<{ format: MarkdownFormat; label: string; icon: ReactNode }> = [
    { format: "bold", label: "Bold", icon: <Bold size={15} /> },
    { format: "italic", label: "Italic", icon: <Italic size={15} /> },
    { format: "strike", label: "Strikethrough", icon: <Strikethrough size={15} /> },
    { format: "code", label: "Code", icon: <Code2 size={15} /> },
    { format: "link", label: "Link", icon: <Link2 size={15} /> },
    { format: "image", label: "Image URL", icon: <ImagePlus size={15} /> },
    { format: "bullet", label: "Bullet list", icon: <List size={15} /> },
    { format: "numbered", label: "Numbered list", icon: <ListOrdered size={15} /> },
    { format: "quote", label: "Quote", icon: <Quote size={15} /> }
  ];

  return (
    <div className={`comment-editor ${disabled ? "is-disabled" : ""}`}>
      <div className="comment-toolbar" role="toolbar" aria-label="Comment formatting">
        {tools.map((tool) => (
          <button
            key={tool.format}
            type="button"
            className="comment-toolbar-button"
            title={tool.label}
            aria-label={tool.label}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleToolbar(tool.format)}
          >
            {tool.icon}
          </button>
        ))}
        {onUploadImage ? (
          <>
            <span className="comment-toolbar-divider" aria-hidden="true" />
            <button
              type="button"
              className="comment-toolbar-button comment-toolbar-upload"
              title="Upload picture"
              aria-label="Upload picture"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={15} />
              <span>Picture</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={disabled}
              onChange={(event) => void handleFileChange(event)}
            />
          </>
        ) : null}
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
