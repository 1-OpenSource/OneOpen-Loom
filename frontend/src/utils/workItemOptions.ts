import type { WorkItemPriority, WorkItemStageStatus, WorkItemType } from "../types/workItem";

/** Board / detail delivery stages (blocked is a separate flag). */
export const workItemStatusOptions: Array<{ label: string; value: WorkItemStageStatus }> = [
  { label: "To Do", value: "TODO" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "In Review", value: "IN_REVIEW" },
  { label: "Done", value: "DONE" }
];

export const workItemBlockedFilterOptions = [
  { label: "All items", value: "" },
  { label: "Blocked only", value: "true" },
  { label: "Not blocked", value: "false" }
];

export const workItemPriorityOptions: Array<{ label: string; value: WorkItemPriority }> = [
  { label: "Highest", value: "CRITICAL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
  { label: "Lowest", value: "LOWEST" }
];

export const workItemTypeOptions: Array<{ label: string; value: WorkItemType }> = [
  { label: "Epic", value: "EPIC" },
  { label: "Story", value: "STORY" },
  { label: "Task", value: "TASK" },
  { label: "Bug", value: "BUG" },
  { label: "Spike", value: "SPIKE" },
  { label: "Subtask", value: "SUBTASK" },
  { label: "Improvement", value: "IMPROVEMENT" },
  { label: "Feature Request", value: "FEATURE_REQUEST" },
  { label: "Research", value: "RESEARCH" }
];
