import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import StatusBadge from "../components/ui/StatusBadge";
import { useApi } from "../hooks/useApi";
import { projectService } from "../services/projectService";
import { roadmapService } from "../services/roadmapService";
import type { RoadmapItem } from "../types/roadmap";
import type { WorkItemStatus } from "../types/workItem";
import { formatDate } from "../utils/formatDate";

interface FlatRow {
  item: RoadmapItem;
  depth: number;
}

function flatten(items: RoadmapItem[], depth = 0): FlatRow[] {
  return items.flatMap((item) => [{ item, depth }, ...flatten(item.children ?? [], depth + 1)]);
}

function toTime(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export default function RoadmapPage() {
  const { projectId = "" } = useParams();
  const { data: project } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: roadmapItems, isLoading, error } = useApi(() => roadmapService.getRoadmap(projectId), [projectId]);

  const rows = useMemo(() => flatten(roadmapItems ?? []), [roadmapItems]);

  const { minTime, maxTime } = useMemo(() => {
    const times = rows.flatMap((row) => [toTime(row.item.start_date), toTime(row.item.due_date)]).filter(
      (value): value is number => value !== null
    );
    if (!times.length) {
      const now = Date.now();
      return { minTime: now, maxTime: now + 1000 * 60 * 60 * 24 * 30 };
    }
    return { minTime: Math.min(...times), maxTime: Math.max(...times) };
  }, [rows]);

  const totalRange = Math.max(1, maxTime - minTime);

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Roadmap"}
        title={project ? `${project.name} roadmap` : "Roadmap"}
        description="Epics and their children plotted by start and due date."
      />

      {isLoading ? (
        <Card>
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-line" />
        </Card>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!isLoading && rows.length === 0 ? (
        <EmptyState title="Nothing scheduled" description="Set start and due dates on epics and stories to see them here." />
      ) : null}

      {rows.length ? (
        <Card className="roadmap-card">
          <div className="roadmap-timeline">
            {rows.map(({ item, depth }) => {
              const start = toTime(item.start_date) ?? minTime;
              const due = toTime(item.due_date) ?? start;
              const left = ((start - minTime) / totalRange) * 100;
              const width = Math.max(1.5, ((Math.max(due, start) - start) / totalRange) * 100);
              return (
                <div className="roadmap-row" key={item.id}>
                  <div className="roadmap-row-label" style={{ paddingLeft: depth * 18 }}>
                    <Link to={`/work-items/${item.id}`} className="item-key">
                      {item.work_item_key}
                    </Link>
                    <span>{item.title}</span>
                  </div>
                  <div className="roadmap-row-track">
                    <div
                      className="roadmap-row-bar"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${formatDate(item.start_date)} – ${formatDate(item.due_date)}`}
                    >
                      <StatusBadge status={item.status as WorkItemStatus} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </>
  );
}
