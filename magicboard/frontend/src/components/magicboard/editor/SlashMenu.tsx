import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/core";
import { filterInsertItems, type InsertActionContext, type InsertItem } from "./insertItems";

type Props = {
  editor: Editor;
  open: boolean;
  query: string;
  anchor: { top: number; left: number } | null;
  actionContext: Omit<InsertActionContext, "editor">;
  onClose: () => void;
};

export default function SlashMenu({ editor, open, query, anchor, actionContext, onClose }: Props) {
  const items = useMemo(
    () => filterInsertItems(query, Boolean(actionContext.workboardConnected)),
    [query, actionContext.workboardConnected]
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => (current + 1) % Math.max(items.length, 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => (current - 1 + items.length) % Math.max(items.length, 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = items[active];
        if (item) void runItem(item);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, items, active, onClose]);

  async function runItem(item: InsertItem) {
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, "\n", "\0");
    const slashMatch = /(?:^|\s)\/([^\s/]*)$/.exec(textBefore);
    if (slashMatch) {
      const deleteFrom = from - slashMatch[0].trimStart().length;
      editor.chain().focus().deleteRange({ from: deleteFrom, to: from }).run();
    }
    await item.run({ editor, ...actionContext });
    onClose();
  }

  if (!open || !anchor) return null;

  return (
    <div
      className="mb-slash-menu"
      style={{ top: anchor.top, left: anchor.left }}
      role="listbox"
      aria-label="Insert"
    >
      {items.length === 0 ? (
        <div className="mb-slash-empty">No matches</div>
      ) : (
        items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`mb-slash-item${index === active ? " is-active" : ""}`}
            onMouseEnter={() => setActive(index)}
            onClick={() => void runItem(item)}
          >
            <span>{item.label}</span>
            <small>{item.group}</small>
          </button>
        ))
      )}
    </div>
  );
}
