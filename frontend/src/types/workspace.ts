import type { UserSummary } from "./auth";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type WorkspaceVisibility = "PRIVATE" | "PUBLIC";
export type WorkspaceMemberStatus = "ACTIVE";
export type WorkspaceInvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  accent_color: string;
  brand_name: string | null;
  brand_tagline: string | null;
  visibility: WorkspaceVisibility;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceOverview {
  total_projects: number;
  total_work_items: number;
  total_members: number;
  total_open_invitations: number;
  recent_project_ids: string[];
  recent_activity_count: number;
  status_breakdown: Record<string, number>;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  created_at: string;
  updated_at: string;
  user: UserSummary;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: WorkspaceInvitationStatus;
  invited_by_user_id: string;
  invited_by: UserSummary;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

export interface WorkspaceCreate {
  name: string;
  slug?: string;
  description?: string | null;
  logo_url?: string | null;
  accent_color?: string;
  brand_name?: string | null;
  brand_tagline?: string | null;
  visibility?: WorkspaceVisibility;
}
