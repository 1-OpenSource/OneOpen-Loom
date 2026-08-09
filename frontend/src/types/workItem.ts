import type { UserSummary } from "./auth";

export type WorkItemType =
  | "EPIC"
  | "STORY"
  | "TASK"
  | "BUG"
  | "SPIKE"
  | "SUBTASK"
  | "IMPROVEMENT"
  | "FEATURE_REQUEST"
  | "RESEARCH";

/** Delivery stages shown on the workboard. Legacy BLOCKED may still appear in old data. */
export type WorkItemStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";
export type WorkItemStageStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type WorkItemPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "LOWEST";
export type WorkItemLinkType =
  | "BLOCKS"
  | "IS_BLOCKED_BY"
  | "RELATES_TO"
  | "DUPLICATES"
  | "IS_DUPLICATED_BY"
  | "PARENT_OF"
  | "CHILD_OF";

export interface WorkItemLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface WorkItemWatcher {
  id: string;
  user_id: string;
  user: UserSummary;
}

export interface WorkItemAttachment {
  id: string;
  filename: string;
  content_type: string | null;
  file_size: number;
  uploaded_by_user_id: string;
  created_at: string;
  uploaded_by: UserSummary;
}

export interface WorkItemLink {
  id: string;
  source_work_item_id: string;
  target_work_item_id: string;
  link_type: WorkItemLinkType;
  created_by_user_id: string;
  created_at: string;
  source_work_item?: WorkItemSummary | null;
  target_work_item?: WorkItemSummary | null;
}

export interface WorkItemSummary {
  id: string;
  project_id: string;
  work_item_key: string;
  title: string;
  description: string | null;
  type: WorkItemType;
  status: WorkItemStatus;
  is_blocked: boolean;
  priority: WorkItemPriority;
  assignee_user_id: string | null;
  reporter_id: string | null;
  creator_id: string;
  parent_work_item_id: string | null;
  epic_id: string | null;
  rank: string | null;
  story_points: number | null;
  original_estimate_seconds: number | null;
  remaining_estimate_seconds: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  components: string[];
  created_at: string;
  updated_at: string;
  assignee: UserSummary | null;
  reporter: UserSummary | null;
  creator: UserSummary | null;
  labels: WorkItemLabel[];
  sprint_id?: string | null;
}

export interface WorkItem extends WorkItemSummary {
  acceptance_criteria: string | null;
  sprint_name: string | null;
  watchers: WorkItemWatcher[];
  attachments: WorkItemAttachment[];
  outgoing_links: WorkItemLink[];
  incoming_links: WorkItemLink[];
  subtasks: WorkItemSummary[];
  parent_work_item: WorkItemSummary | null;
}

export interface WorkItemCreate {
  title: string;
  description?: string | null;
  acceptance_criteria?: string | null;
  type?: WorkItemType;
  status?: WorkItemStatus;
  is_blocked?: boolean;
  priority?: WorkItemPriority;
  assignee_user_id?: string | null;
  reporter_id?: string | null;
  parent_work_item_id?: string | null;
  epic_id?: string | null;
  sprint_name?: string | null;
  sprint_id?: string | null;
  story_points?: number | null;
  original_estimate_seconds?: number | null;
  remaining_estimate_seconds?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  labels?: Array<{ name: string; color?: string | null }>;
  components?: string[];
  watcher_ids?: string[];
}

export interface WorkboardColumn {
  key: string;
  title: string;
  color: string;
  count: number;
  items: WorkItemSummary[];
}

export interface Workboard {
  columns: WorkboardColumn[];
}
