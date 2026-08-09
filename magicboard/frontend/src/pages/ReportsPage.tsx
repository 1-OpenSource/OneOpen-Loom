import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BarChart from "../components/ui/BarChart";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import LineChart from "../components/ui/LineChart";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { projectService } from "../services/projectService";
import { reportService } from "../services/reportService";
import { formatDate } from "../utils/formatDate";

type ReportTab = "velocity" | "burndown" | "cumulative-flow" | "created-vs-resolved";

const tabs: Array<{ key: ReportTab; label: string }> = [
  { key: "velocity", label: "Velocity" },
  { key: "burndown", label: "Burndown" },
  { key: "cumulative-flow", label: "Cumulative Flow" },
  { key: "created-vs-resolved", label: "Created vs Resolved" }
];

export default function ReportsPage() {
  const { projectId = "" } = useParams();
  const [tab, setTab] = useState<ReportTab>("velocity");
  const { data: project } = useApi(() => projectService.getProject(projectId), [projectId]);
  const { data: velocity, isLoading: velocityLoading } = useApi(() => reportService.getVelocity(projectId), [projectId]);
  const { data: burndown, isLoading: burndownLoading } = useApi(() => reportService.getBurndown(projectId), [projectId]);
  const { data: cumulativeFlow, isLoading: flowLoading } = useApi(
    () => reportService.getCumulativeFlow(projectId),
    [projectId]
  );
  const { data: createdVsResolved, isLoading: cvrLoading } = useApi(
    () => reportService.getCreatedVsResolved(projectId),
    [projectId]
  );

  const velocityPoints = Array.isArray(velocity) ? velocity : [];
  const burndownPoints = Array.isArray(burndown) ? burndown : [];
  const flowPoints = Array.isArray(cumulativeFlow) ? cumulativeFlow : [];
  const cvrPoints = Array.isArray(createdVsResolved) ? createdVsResolved : [];

  const velocityGroups = useMemo(
    () =>
      velocityPoints.map((point) => ({
        label: point.sprint_name,
        bars: [
          { label: "Committed", value: point.committed_points, color: "var(--border-strong)" },
          { label: "Completed", value: point.completed_points, color: "var(--accent)" }
        ]
      })),
    [velocityPoints]
  );

  const flowStatuses = useMemo(() => {
    const keys = new Set<string>();
    flowPoints.forEach((point) => Object.keys(point.counts_by_status ?? {}).forEach((key) => keys.add(key)));
    return Array.from(keys);
  }, [flowPoints]);

  const flowColors = ["var(--accent)", "#1f8a4c", "#a56200", "#c5383b", "#617086"];

  return (
    <>
      <PageHeader
        eyebrow={project?.key ?? "Reports"}
        title={project ? `${project.name} reports` : "Reports"}
        description="Delivery insights: velocity trends, burndown, workflow health, and throughput."
      />

      <div className="tabs-row">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab-button ${tab === item.key ? "tab-button-active" : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "velocity" ? (
        <Card>
          <div className="section-heading">
            <h2>Sprint Velocity</h2>
          </div>
          {velocityLoading ? <Skeleton className="skeleton-heading" /> : null}
          {!velocityLoading && velocityGroups.length ? (
            <>
              <BarChart groups={velocityGroups} />
              <div className="chart-legend">
                <span>
                  <i style={{ background: "var(--border-strong)" }} /> Committed
                </span>
                <span>
                  <i style={{ background: "var(--accent)" }} /> Completed
                </span>
              </div>
            </>
          ) : null}
          {!velocityLoading && !velocityGroups.length ? (
            <EmptyState title="No sprint history" description="Complete sprints to see velocity trends here." />
          ) : null}
        </Card>
      ) : null}

      {tab === "burndown" ? (
        <Card>
          <div className="section-heading">
            <h2>Sprint Burndown</h2>
          </div>
          {burndownLoading ? <Skeleton className="skeleton-heading" /> : null}
          {!burndownLoading && burndownPoints.length ? (
            <>
              <LineChart
                series={[
                  { label: "Remaining", color: "var(--accent)", values: burndownPoints.map((point) => point.remaining_points) },
                  { label: "Ideal", color: "var(--border-strong)", values: burndownPoints.map((point) => point.ideal_points) }
                ]}
                xLabels={burndownPoints.map((point) => point.date)}
              />
              <div className="chart-legend">
                <span>
                  <i style={{ background: "var(--accent)" }} /> Remaining
                </span>
                <span>
                  <i style={{ background: "var(--border-strong)" }} /> Ideal
                </span>
              </div>
            </>
          ) : null}
          {!burndownLoading && !burndownPoints.length ? (
            <EmptyState title="No burndown data" description="Start a sprint to track remaining work over time." />
          ) : null}
        </Card>
      ) : null}

      {tab === "cumulative-flow" ? (
        <Card>
          <div className="section-heading">
            <h2>Cumulative Flow</h2>
          </div>
          {flowLoading ? <Skeleton className="skeleton-heading" /> : null}
          {!flowLoading && flowPoints.length ? (
            <>
              <LineChart
                series={flowStatuses.map((status, index) => ({
                  label: status,
                  color: flowColors[index % flowColors.length],
                  values: flowPoints.map((point) => point.counts_by_status?.[status] ?? 0)
                }))}
                xLabels={flowPoints.map((point) => point.date)}
              />
              <div className="chart-legend">
                {flowStatuses.map((status, index) => (
                  <span key={status}>
                    <i style={{ background: flowColors[index % flowColors.length] }} /> {status.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {!flowLoading && !flowPoints.length ? (
            <EmptyState title="No workflow data" description="Cumulative flow shows how items move through stages over time." />
          ) : null}
        </Card>
      ) : null}

      {tab === "created-vs-resolved" ? (
        <Card>
          <div className="section-heading">
            <h2>Created vs Resolved</h2>
          </div>
          {cvrLoading ? <Skeleton className="skeleton-heading" /> : null}
          {!cvrLoading && cvrPoints.length ? (
            <>
              <LineChart
                series={[
                  { label: "Created", color: "var(--danger)", values: cvrPoints.map((point) => point.created) },
                  { label: "Resolved", color: "var(--success)", values: cvrPoints.map((point) => point.resolved) }
                ]}
                xLabels={cvrPoints.map((point) => point.date)}
              />
              <div className="chart-legend">
                <span>
                  <i style={{ background: "var(--danger)" }} /> Created
                </span>
                <span>
                  <i style={{ background: "var(--success)" }} /> Resolved
                </span>
                <span className="muted-copy">
                  {formatDate(cvrPoints[0]?.date)} – {formatDate(cvrPoints[cvrPoints.length - 1]?.date)}
                </span>
              </div>
            </>
          ) : null}
          {!cvrLoading && !cvrPoints.length ? (
            <EmptyState title="No throughput data" description="Track how quickly the team creates and resolves work." />
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
