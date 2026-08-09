import type { WorkItemSummary } from "./workItem";

export interface OqlQueryResult {
  query: string;
  items: WorkItemSummary[];
  total: number;
}

export interface SavedFilter {
  id: string;
  workspace_id: string;
  name: string;
  oql: string;
  created_by_user_id: string;
  is_shared: boolean;
  created_at: string;
}

export interface SavedFilterCreate {
  name: string;
  oql: string;
  is_shared?: boolean;
}
