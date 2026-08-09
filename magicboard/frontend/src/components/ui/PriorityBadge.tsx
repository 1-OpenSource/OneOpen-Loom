import Badge from "./Badge";
import type { WorkItemPriority } from "../../types/workItem";

const toneMap: Record<WorkItemPriority, "neutral" | "green" | "amber" | "red"> = {
  CRITICAL: "red",
  HIGH: "amber",
  MEDIUM: "neutral",
  LOW: "green",
  LOWEST: "green"
};

const labelMap: Record<WorkItemPriority, string> = {
  CRITICAL: "Highest",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  LOWEST: "Lowest"
};

export default function PriorityBadge({ priority }: { priority: WorkItemPriority }) {
  return <Badge tone={toneMap[priority]}>{labelMap[priority]}</Badge>;
}
