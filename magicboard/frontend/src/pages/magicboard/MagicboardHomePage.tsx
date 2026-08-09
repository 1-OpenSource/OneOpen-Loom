import { BookOpen, Clock, Plus, Search, Star } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/ToastProvider";
import { useApi } from "../../hooks/useApi";
import { magicboardService } from "../../services/magicboardService";
import type { SuiteSearchResult } from "../../types/magicboard";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { formatDateTime } from "../../utils/formatDate";
import { getActiveWorkspaceId } from "../../utils/workspaceState";

export default function MagicboardHomePage() {
  const { pushToast } = useToast();
  const workspaceId = getActiveWorkspaceId() ?? "";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SuiteSearchResult>({ pages: [], work_items: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!workspaceId || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await magicboardService.suiteSearch(workspaceId, searchQuery.trim());
      setSearchResults(results);
    } catch (searchError) {
      pushToast(getApiErrorMessage(searchError, "Search failed"), "error");
    } finally {
      setIsSearching(false);
    }
  }

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
    <>
      <PageHeader
        eyebrow="Magicboard"
        title="Knowledge spaces"
        description="Document decisions, specs, and team knowledge in structured spaces."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)} disabled={!workspaceId}>
            New Space
          </Button>
        }
      />

      <Card className="magicboard-search-card">
        <form className="inline-form magicboard-search-form" onSubmit={handleSearch}>
          <Input
            label="Suite search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search Magicboard pages and Workboard items…"
          />
          <Button type="submit" icon={<Search size={16} />} disabled={!searchQuery.trim() || isSearching}>
            Search
          </Button>
        </form>
        {searchResults.pages.length || searchResults.work_items.length ? (
          <div className="content-grid two-column-grid">
            <div className="list-stack">
              <h3 className="section-subheading">Pages</h3>
              {searchResults.pages.length ? (
                searchResults.pages.map((hit) => (
                  <Link
                    key={hit.page_id}
                    to={`/magicboard/spaces/${hit.space_id}/pages/${hit.page_id}`}
                    className="list-row"
                  >
                    <div>
                      <strong>{hit.title}</strong>
                      <p className="muted-copy">
                        {hit.space_key} · {hit.slug}
                        {hit.snippet ? ` — ${hit.snippet}` : ""}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="muted-copy">No pages matched.</p>
              )}
            </div>
            <div className="list-stack">
              <h3 className="section-subheading">Work items</h3>
              {searchResults.work_items.length ? (
                searchResults.work_items.map((item) => (
                  <Link key={item.id} to={`/work-items/${item.id}`} className="list-row">
                    <div>
                      <strong>
                        {item.work_item_key} · {item.title}
                      </strong>
                      <p className="muted-copy">{item.status}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="muted-copy">No work items matched.</p>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      <div className="content-grid two-column-grid">
        <Card>
          <div className="section-heading">
            <h2>
              <Star size={16} /> Favorites
            </h2>
            <span className="section-count">{favorites?.length ?? 0}</span>
          </div>
          <div className="list-stack">
            {favorites?.length ? (
              favorites.map((item) => (
                <Link
                  key={item.page_id}
                  to={`/magicboard/spaces/${item.space_id}/pages/${item.page_id}`}
                  className="list-row"
                >
                  <span>{item.title}</span>
                </Link>
              ))
            ) : (
              <p className="muted-copy">Star pages to find them quickly.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="section-heading">
            <h2>
              <Clock size={16} /> Recent
            </h2>
            <span className="section-count">{recent?.length ?? 0}</span>
          </div>
          <div className="list-stack">
            {recent?.length ? (
              recent.map((item) => (
                <Link
                  key={`${item.page_id}-${item.viewed_at}`}
                  to={`/magicboard/spaces/${item.space_id}/pages/${item.page_id}`}
                  className="list-row"
                >
                  <div>
                    <span>{item.title}</span>
                    <p className="muted-copy">{formatDateTime(item.viewed_at)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="muted-copy">Recently viewed pages appear here.</p>
            )}
          </div>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-line" />
        </Card>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!isLoading && !spaces?.length ? (
        <EmptyState
          title="No spaces yet"
          description="Create a space to start documenting knowledge."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)} disabled={!workspaceId}>
              New Space
            </Button>
          }
        />
      ) : null}

      <div className="content-grid three-column-grid">
        {(spaces ?? []).map((space) => (
          <Card key={space.id}>
            <div className="section-heading">
              <h2>
                <BookOpen size={16} /> {space.name}
              </h2>
              <span className="section-count">{space.key}</span>
            </div>
            <p className="muted-copy">{space.description || "Open this space to browse pages."}</p>
            <Link to={`/magicboard/spaces/${space.id}`}>
              <Button variant="secondary">Open space</Button>
            </Link>
          </Card>
        ))}
      </div>

      <Modal isOpen={isCreateOpen} title="New Space" onClose={() => setIsCreateOpen(false)}>
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
    </>
  );
}
