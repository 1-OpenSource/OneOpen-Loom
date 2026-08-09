import Badge from "./Badge";
import type { WorkItemStatus } from "../../types/workItem";

const toneMap: Record<WorkItemStatus, "neutral" | "green" | "amber" | "red" | "violet" | "teal"> = {
  TODO: "neutral",
  IN_PROGRESS: "teal",
  IN_REVIEW: "violet",
  DONE: "green",
  BLOCKED: "red"
};

const labelMap: Record<WorkItemStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked"
};

export default function StatusBadge({ status }: { status: WorkItemStatus }) {
  return <Badge tone={toneMap[status] ?? "neutral"}>{labelMap[status] ?? status}</Badge>;
}
