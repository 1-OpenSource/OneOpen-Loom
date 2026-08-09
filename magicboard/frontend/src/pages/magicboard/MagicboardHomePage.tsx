import { BookOpen, Clock, Plus, Star } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/ToastProvider";
import { useApi } from "../../hooks/useApi";
import { magicboardService } from "../../services/magicboardService";
import { workspaceService } from "../../services/workspaceService";
import type { SuiteSearchResult } from "../../types/magicboard";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { formatDateTime } from "../../utils/formatDate";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "../../utils/workspaceState";

const workboardAppUrl = (import.meta.env.VITE_WORKBOARD_APP_URL as string | undefined)?.trim();

export default function MagicboardHomePage() {
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspaceId, setWorkspaceId] = useState(() => getActiveWorkspaceId() ?? "");
  const { data: workspaces } = useApi(() => workspaceService.listWorkspaces(), []);

  useEffect(() => {
    if (workspaceId) return;
    const first = workspaces?.[0]?.id;
    if (!first) return;
    setActiveWorkspaceId(first);
    setWorkspaceId(first);
  }, [workspaceId, workspaces]);

  const { data: spaces, isLoading, error, reload } = useApi(
    () => (workspaceId ? magicboardService.listSpaces(workspaceId) : Promise.resolve([])),
    [workspaceId]
  );
  const { data: favorites } = useApi(
    () => (workspaceId ? magicboardService.listFavorites(workspaceId) : Promise.resolve([])),
    [workspaceId]
  );
  const { data: recent } = useApi(
    () => (workspaceId ? magicboardService.listRecent(workspaceId) : Promise.resolve([])),
    [workspaceId]
  );
  const [searchResults, setSearchResults] = useState<SuiteSearchResult>({ pages: [], work_items: [] });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");

  useEffect(() => {
    if (searchParams.get("createSpace") === "1") {
      setIsCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("createSpace");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || !workspaceId) return;
    void magicboardService.suiteSearch(workspaceId, q).then(setSearchResults).catch(() => undefined);
  }, [searchParams, workspaceId]);

  async function handleCreateSpace(event: FormEvent) {
    event.preventDefault();
    if (!workspaceId) return;
    try {
      const space = await magicboardService.createSpace(workspaceId, {
        name: name.trim(),
        key: key.trim().toUpperCase() || undefined
      });
      pushToast("Space created", "success");
      setName("");
      setKey("");
      setIsCreateOpen(false);
      await reload();
      window.location.assign(`/magicboard/spaces/${space.id}`);
    } catch (createError) {
      pushToast(getApiErrorMessage(createError, "Could not create space"), "error");
    }
  }

  return (
    <div className="mb-home">
      <header className="mb-home-hero">
        <div>
          <p className="mb-kicker">Home</p>
          <h1>Your knowledge base</h1>
          <p className="mb-home-lead">Browse spaces, pick up recent pages, and keep starred docs close.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)} disabled={!workspaceId}>
          Create space
        </Button>
      </header>

      {searchResults.pages.length || searchResults.work_items.length ? (
        <section className="mb-panel">
          <div className="mb-panel-head">
            <h2>Search results</h2>
          </div>
          <div className="mb-result-list">
            {searchResults.pages.map((hit) => (
              <Link
                key={hit.page_id}
                to={`/magicboard/spaces/${hit.space_id}/pages/${hit.page_id}`}
                className="mb-result-row"
              >
                <strong>{hit.title}</strong>
                <span>
                  {hit.space_key} · {hit.slug}
                  {hit.snippet ? ` — ${hit.snippet}` : ""}
                </span>
              </Link>
            ))}
            {searchResults.work_items.map((item) => {
              const href = workboardAppUrl
                ? `${workboardAppUrl.replace(/\/$/, "")}/work-items/${item.id}`
                : undefined;
              const body = (
                <>
                  <strong>
                    {item.work_item_key} · {item.title}
                  </strong>
                  <span>{item.status}</span>
                </>
              );
              return href ? (
                <a key={item.id} href={href} className="mb-result-row">
                  {body}
                </a>
              ) : (
                <div key={item.id} className="mb-result-row">
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mb-home-grid">
        <section className="mb-panel">
          <div className="mb-panel-head">
            <h2>
              <Star size={16} /> Starred
            </h2>
          </div>
          {favorites?.length ? (
            <div className="mb-result-list">
              {favorites.map((item) => (
                <Link
                  key={item.page_id}
                  to={`/magicboard/spaces/${item.space_id}/pages/${item.page_id}`}
                  className="mb-result-row"
                >
                  <strong>{item.title}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mb-quiet">Star pages while reading to find them here.</p>
          )}
        </section>

        <section className="mb-panel">
          <div className="mb-panel-head">
            <h2>
              <Clock size={16} /> Recent
            </h2>
          </div>
          {recent?.length ? (
            <div className="mb-result-list">
              {recent.map((item) => (
                <Link
                  key={`${item.page_id}-${item.viewed_at}`}
                  to={`/magicboard/spaces/${item.space_id}/pages/${item.page_id}`}
                  className="mb-result-row"
                >
                  <strong>{item.title}</strong>
                  <span>{formatDateTime(item.viewed_at)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mb-quiet">Pages you open will show up here.</p>
          )}
        </section>
      </div>

      <section className="mb-spaces-section">
        <div className="mb-panel-head">
          <h2>Spaces</h2>
        </div>
        {isLoading ? (
          <div className="mb-space-grid">
            <Skeleton className="skeleton-heading" />
            <Skeleton className="skeleton-line" />
          </div>
        ) : null}
        {error ? <div className="error-banner">{error}</div> : null}
        {!isLoading && !spaces?.length ? (
          <EmptyState
            title="No spaces yet"
            description="Create a space for a team, project, or knowledge area."
            action={
              <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)} disabled={!workspaceId}>
                Create space
              </Button>
            }
          />
        ) : null}
        <div className="mb-space-grid">
          {(spaces ?? []).map((space) => (
            <Link key={space.id} to={`/magicboard/spaces/${space.id}`} className="mb-space-tile">
              <span className="mb-space-tile-icon">
                <BookOpen size={22} />
              </span>
              <span className="mb-space-tile-key">{space.key}</span>
              <strong>{space.name}</strong>
              <span className="mb-quiet">{space.description || "Open space"}</span>
            </Link>
          ))}
        </div>
      </section>

      <Modal isOpen={isCreateOpen} title="Create space" onClose={() => setIsCreateOpen(false)}>
        <form className="form-stack" onSubmit={handleCreateSpace}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input
            label="Key"
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            placeholder="DOCS"
            required
          />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
