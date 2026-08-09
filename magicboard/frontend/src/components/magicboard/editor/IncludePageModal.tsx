import { useEffect, useState } from "react";
import Button from "../../ui/Button";
import { magicboardService } from "../../../services/magicboardService";
import type { SpacePage } from "../../../types/magicboard";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

type Props = {
  spaceId: string;
  open: boolean;
  onClose: () => void;
  onPick: (slug: string) => void;
};

export default function IncludePageModal({ spaceId, open, onClose, onPick }: Props) {
  const [pages, setPages] = useState<SpacePage[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const list = await magicboardService.listPagesFlat(spaceId);
        if (!cancelled) setPages(list);
      } catch (loadError) {
        if (!cancelled) setError(getApiErrorMessage(loadError, "Could not load pages"));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, spaceId]);

  if (!open) return null;

  const filtered = pages.filter((page) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return page.title.toLowerCase().includes(q) || page.slug.toLowerCase().includes(q);
  });

  return (
    <div className="mb-modal-backdrop" role="dialog" aria-modal="true" aria-label="Include page">
      <div className="mb-modal">
        <header className="mb-modal-header">
          <h3>Include page</h3>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </header>
        <input
          className="mb-insert-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter pages…"
          autoFocus
        />
        {error ? <p className="error-banner">{error}</p> : null}
        <div className="mb-result-list">
          {filtered.map((page) => (
            <button
              key={page.id}
              type="button"
              className="mb-result-row"
              onClick={() => {
                onPick(page.slug);
                onClose();
              }}
            >
              <strong>{page.title}</strong>
              <span>{page.slug}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
