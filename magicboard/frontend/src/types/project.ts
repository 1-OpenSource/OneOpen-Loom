import type { UserSummary } from "./auth";

export type ProjectVisibility = "PRIVATE" | "PUBLIC";
export type ProjectRole = "PROJECT_ADMIN" | "DEVELOPER" | "CONTRIBUTOR" | "VIEWER";
export type ProjectProductType = "SOFTWARE" | "SERVICE" | "BUSINESS";

export interface WorkflowStatus {
  id: string;
  project_id: string;
  name: string;
  key: string;
  color: string;
  category?: string;
  position: number;
  is_default: boolean;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  key: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  visibility: ProjectVisibility;
  lead_user_id: string | null;
  default_workflow: string | null;
  available_work_item_types: string[];
  product_type?: ProjectProductType;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: UserSummary | null;
}

export interface ProjectOverview {
  project: Project;
  total_work_items: number;
  member_count: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  recent_work_item_ids: string[];
  workflow_statuses: WorkflowStatus[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
  updated_at: string;
  user: UserSummary;
}

export interface ProjectCreate {
  name: string;
  key: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  visibility?: ProjectVisibility;
  lead_user_id?: string | null;
}
