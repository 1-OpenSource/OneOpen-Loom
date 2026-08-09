import { Save, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { oqlService } from "../services/oqlService";
import type { OqlQueryResult } from "../types/oql";
import { getActiveWorkspaceId } from "../utils/workspaceState";
import { formatDateTime } from "../utils/formatDate";

const OQL_PLACEHOLDER = 'type = STORY AND status != DONE ORDER BY priority DESC\n\nTry: assignee = currentUser() AND status = "IN_PROGRESS"';

export default function NavigatorPage() {
  const { projectId } = useParams();
  const { pushToast } = useToast();
  const workspaceId = getActiveWorkspaceId() ?? "";
  const { data: savedFilters, reload: reloadFilters } = useApi(
    () => (workspaceId ? oqlService.listSavedFilters(workspaceId) : Promise.resolve([])),
    [workspaceId]
  );
  const [oql, setOql] = useState(projectId ? `project = "${projectId}"` : "");
  const [result, setResult] = useState<OqlQueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterName, setFilterName] = useState("");

  async function handleRun(event: FormEvent) {
    event.preventDefault();
    setIsRunning(true);
    setError(null);
    try {
      const response = await oqlService.runQuery(workspaceId, oql);
      setResult(response);
    } catch (runError) {
      setError(getApiErrorMessage(runError, "Query could not be run"));
      setResult(null);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSaveFilter() {
    if (!filterName.trim() || !oql.trim()) return;
    try {
      await oqlService.saveFilter(workspaceId, { name: filterName.trim(), oql });
      setFilterName("");
      pushToast("Filter saved", "success");
      await reloadFilters();
    } catch (saveError) {
      pushToast(getApiErrorMessage(saveError, "Could not save filter"), "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Navigator"
        title="Issue Navigator"
        description="Query work items across the workspace using OQL (OneOpen Query Language)."
      />

      <div className="content-grid navigator-grid">
        <Card>
          <form className="form-stack" onSubmit={handleRun}>
            <label className="field" htmlFor="oql-input">
              <span>OQL Query</span>
              <textarea
                id="oql-input"
                className="oql-textarea"
                value={oql}
                onChange={(event) => setOql(event.target.value)}
                placeholder={OQL_PLACEHOLDER}
                rows={6}
              />
            </label>
            <div className="button-row">
              <Button type="submit" icon={<Search size={16} />} disabled={isRunning || !workspaceId}>
                {isRunning ? "Running…" : "Run Query"}
              </Button>
              {!workspaceId ? <span className="muted-copy">Select a workspace first.</span> : null}
            </div>
          </form>

          <div className="inline-form section-heading-spaced">
            <label className="field" htmlFor="filter-name">
              <span>Save as filter</span>
              <input id="filter-name" value={filterName} onChange={(event) => setFilterName(event.target.value)} placeholder="Filter name" />
            </label>
            <Button type="button" variant="secondary" icon={<Save size={16} />} onClick={() => void handleSaveFilter()}>
              Save Filter
            </Button>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          {result ? (
            result.items.length ? (
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Identifier</th>
                      <th>Title</th>
                      <th>Stage</th>
                      <th>Priority</th>
                      <th>Assignee</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link to={`/work-items/${item.id}`} className="item-key">
                            {item.work_item_key}
                          </Link>
                        </td>
                        <td>
                          <Link to={`/work-items/${item.id}`} className="work-item-title-link">
                            {item.title}
                          </Link>
                        </td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          <PriorityBadge priority={item.priority} />
                        </td>
                        <td>{item.assignee?.name ?? "Unassigned"}</td>
                        <td>{formatDateTime(item.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No results" description="No work items match this query." />
            )
          ) : (
            <EmptyState title="Run a query" description="Write an OQL query and run it to see matching work items." />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <h2>Saved Filters</h2>
            <span className="section-count">{savedFilters?.length ?? 0}</span>
          </div>
          <div className="list-stack">
            {savedFilters?.length ? (
              savedFilters.map((filter) => (
                <button
                  type="button"
                  className="list-row navigator-filter-row"
                  key={filter.id}
                  onClick={() => setOql(filter.oql)}
                >
                  <div>
                    <strong>{filter.name}</strong>
                    <p>{filter.oql}</p>
                  </div>
                  {filter.is_shared ? <Badge tone="teal">Shared</Badge> : null}
                </button>
              ))
            ) : (
              <EmptyState title="No saved filters" description="Save frequently used queries for quick access." />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
