import type { UserSummary } from "./auth";

export interface Activity {
  id: string;
  work_item_id: string | null;
  project_id: string | null;
  workspace_id: string | null;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata_json: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actor?: UserSummary | null;
}
