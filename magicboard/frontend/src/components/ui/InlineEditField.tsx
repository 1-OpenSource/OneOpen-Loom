import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

interface InlineEditFieldProps {
  label?: string;
  display: ReactNode;
  emptyLabel?: string;
  isEmpty?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onCommit?: () => void | Promise<void>;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: "detail" | "content" | "title";
  className?: string;
  children?: ReactNode;
}

export default function InlineEditField({
  label,
  display,
  emptyLabel = "None",
  isEmpty = false,
  isEditing,
  onStartEdit,
  onCancel,
  onCommit,
  disabled = false,
  readOnly = false,
  variant = "detail",
  className = "",
  children
}: InlineEditFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        void onCommit?.();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isEditing, onCommit]);

  useEffect(() => {
    if (!isEditing || !rootRef.current) return;
    const focusable = rootRef.current.querySelector<HTMLElement>(
      "input, textarea, select, [contenteditable='true'], button.searchable-select-control input"
    );
    const input = rootRef.current.querySelector<HTMLElement>("input:not([type='hidden']), textarea, select");
    (input ?? focusable)?.focus();
  }, [isEditing]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Enter" && variant !== "content" && !(event.target instanceof HTMLTextAreaElement)) {
      if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
        return;
      }
      event.preventDefault();
      void onCommit?.();
    }
  }

  const rootClass = `inline-edit-field inline-edit-${variant} ${className}`.trim();

  if (readOnly) {
    return (
      <div className={`${rootClass} is-readonly`} ref={rootRef}>
        {label ? <div className="inline-edit-label">{label}</div> : null}
        <div className={`inline-edit-value ${isEmpty ? "is-empty" : ""}`}>{isEmpty ? emptyLabel : display}</div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={`${rootClass} is-editing`} ref={rootRef} onKeyDown={handleKeyDown}>
        {label ? <div className="inline-edit-label">{label}</div> : null}
        <div className="inline-edit-editor">{children}</div>
      </div>
    );
  }

  return (
    <div className={rootClass} ref={rootRef}>
      {label ? <div className="inline-edit-label">{label}</div> : null}
      <button
        type="button"
        className={`inline-edit-trigger ${isEmpty ? "is-empty" : ""}`}
        disabled={disabled}
        onClick={onStartEdit}
      >
        {isEmpty ? emptyLabel : display}
      </button>
    </div>
  );
}
