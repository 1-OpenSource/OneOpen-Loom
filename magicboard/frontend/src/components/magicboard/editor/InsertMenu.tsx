import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Plus } from "lucide-react";
import Button from "../../ui/Button";
import { filterInsertItems, type InsertActionContext, type InsertItem } from "./insertItems";

type Props = {
  editor: Editor;
  actionContext: Omit<InsertActionContext, "editor">;
};

export default function InsertMenu({ editor, actionContext }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const items = useMemo(
    () => filterInsertItems(query, Boolean(actionContext.workboardConnected)),
    [query, actionContext.workboardConnected]
  );

  async function runItem(item: InsertItem) {
    await item.run({ editor, ...actionContext });
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="mb-insert-menu">
      <Button variant="secondary" icon={<Plus size={14} />} onClick={() => setOpen((value) => !value)}>
        Insert
      </Button>
      {open ? (
        <div className="mb-insert-popover">
          <input
            className="mb-insert-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search inserts…"
            autoFocus
          />
          <div className="mb-insert-list">
            {items.map((item) => (
              <button key={item.id} type="button" className="mb-slash-item" onClick={() => void runItem(item)}>
                <span>{item.label}</span>
                <small>{item.group}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
