import { useEffect, useState } from "react";
import Button from "../../ui/Button";
import { magicboardService } from "../../../services/magicboardService";
import type { PageWorkItemSummary } from "../../../types/magicboard";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

type Props = {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onPick: (item: PageWorkItemSummary & { priority?: string }) => void;
};

export default function WorkItemPickerModal({ workspaceId, open, onClose, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PageWorkItemSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function search() {
      if (!query.trim()) {
        setItems([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await magicboardService.searchWorkItems(workspaceId, query.trim());
        if (!cancelled) setItems(result);
      } catch (searchError) {
        if (!cancelled) setError(getApiErrorMessage(searchError, "Search failed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = window.setTimeout(() => void search(), 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, workspaceId]);

  if (!open) return null;

  return (
    <div className="mb-modal-backdrop" role="dialog" aria-modal="true" aria-label="Insert work item">
      <div className="mb-modal">
        <header className="mb-modal-header">
          <h3>Insert work item</h3>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </header>
        <input
          className="mb-insert-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by key or title…"
          autoFocus
        />
        {error ? <p className="error-banner">{error}</p> : null}
        {loading ? <p className="mb-quiet">Searching…</p> : null}
        <div className="mb-result-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="mb-result-row"
              onClick={() => {
                onPick(item);
                onClose();
              }}
            >
              <strong>
                {item.work_item_key} — {item.title}
              </strong>
              <span>
                {item.status.replaceAll("_", " ")} · {item.type.replaceAll("_", " ")}
              </span>
            </button>
          ))}
          {!loading && query.trim() && items.length === 0 ? (
            <p className="mb-quiet">No work items found.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
