export type SpacePageStatus = "DRAFT" | "PUBLISHED";
export type SpaceMemberRole = "VIEW" | "EDIT" | "ADMIN";

export interface Space {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  description: string | null;
  created_by_user_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpaceCreate {
  name: string;
  key?: string | null;
  description?: string | null;
}

export interface SpaceUpdate {
  name?: string;
  key?: string | null;
  description?: string | null;
}

export interface SpacePage {
  id: string;
  space_id: string;
  parent_page_id: string | null;
  title: string;
  slug: string;
  content: string | null;
  status: SpacePageStatus;
  icon: string | null;
  owner_user_id: string | null;
  template_key: string | null;
  labels: string[];
  position: number;
  archived_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface SpacePageCreate {
  title: string;
  slug?: string | null;
  content?: string | null;
  parent_page_id?: string | null;
  position?: number;
  status?: SpacePageStatus;
  icon?: string | null;
  owner_user_id?: string | null;
  template_key?: string | null;
  labels?: string[];
}

export interface SpacePageUpdate {
  title?: string;
  slug?: string | null;
  content?: string | null;
  parent_page_id?: string | null;
  position?: number;
  status?: SpacePageStatus;
  icon?: string | null;
  owner_user_id?: string | null;
  template_key?: string | null;
  labels?: string[] | null;
}

export interface SpacePageTreeNode {
  id: string;
  title: string;
  slug: string;
  position: number;
  children: SpacePageTreeNode[];
}

export interface SpacePageVersion {
  id: string;
  page_id: string;
  content: string | null;
  edited_by_user_id: string;
  created_at: string;
}

export interface SpacePageComment {
  id: string;
  page_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface SpacePageCommentCreate {
  body: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: SpaceMemberRole;
}

export interface SpaceMemberEntry {
  user_id: string;
  role: SpaceMemberRole;
}

export interface SpaceMembersUpdate {
  members: SpaceMemberEntry[];
}

export interface MagicboardSearchResult {
  page_id: string;
  space_id: string;
  space_key: string;
  title: string;
  slug: string;
  snippet: string | null;
}

export interface MagicboardTemplate {
  key: string;
  title: string;
  description: string;
  default_content: string;
}

export interface SpacePageFromTemplateCreate {
  template_key: string;
  title?: string | null;
  parent_page_id?: string | null;
  position?: number;
}

export interface MarkdownPageExport {
  path: string;
  content: string;
}

export interface SpaceExport {
  space_key: string;
  space_name: string;
  pages: MarkdownPageExport[];
}

export interface MarkdownPageImport {
  title: string;
  content?: string | null;
  parent_path?: string | null;
}

export interface SpaceImportRequest {
  pages: MarkdownPageImport[];
}

export interface SpacePageRecent {
  page_id: string;
  space_id: string;
  title: string;
  slug: string;
  viewed_at: string;
}

export interface SpacePageFavorite {
  page_id: string;
  space_id: string;
  title: string;
  slug: string;
}

export interface PageWorkItemSummary {
  id: string;
  work_item_key: string;
  title: string;
  status: string;
  type: string;
  project_id: string;
}

export interface WorkItemPageLink {
  page_id: string;
}

export interface SpacePageAttachment {
  id: string;
  page_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  storage_path: string;
  uploaded_by_user_id: string;
  created_at: string;
}

export interface SpacePageShareLink {
  id: string;
  page_id: string;
  token: string;
  created_by_user_id: string;
  revoked_at: string | null;
  created_at: string;
  share_path: string;
}

export interface SpacePagePathResolve {
  space_id: string;
  space_key: string;
  page_id: string;
  page_slug: string;
  title: string;
}

export interface SuiteSearchResult {
  pages: MagicboardSearchResult[];
  work_items: PageWorkItemSummary[];
}
