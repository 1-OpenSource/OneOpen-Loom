export interface BoardColumnConfig {
  key: string;
  title: string;
  status_mapping: string[];
  wip_limit: number | null;
  position: number;
}

export interface BoardSettings {
  id: string;
  project_id: string;
  columns: BoardColumnConfig[];
  swimlane_field: string | null;
  updated_at: string;
}

export interface BoardSettingsUpdate {
  columns: BoardColumnConfig[];
  swimlane_field?: string | null;
}

export interface WorkflowTransition {
  id: string;
  project_id: string;
  from_status_id: string;
  to_status_id: string;
  name: string | null;
  created_at?: string;
}

export interface WorkflowTransitionCreate {
  from_status_id: string;
  to_status_id: string;
  name?: string | null;
}
