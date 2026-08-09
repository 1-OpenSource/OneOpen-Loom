export interface AutomationRule {
  id: string;
  project_id: string;
  name: string;
  trigger_type: string;
  condition: string | null;
  action_type: string;
  action_config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleCreate {
  name: string;
  trigger_type: string;
  condition?: string | null;
  action_type: string;
  action_config?: Record<string, unknown>;
  is_enabled?: boolean;
}
