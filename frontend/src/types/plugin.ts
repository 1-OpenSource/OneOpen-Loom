export interface SlackConfig {
  id: string;
  workspace_id: string;
  webhook_url: string | null;
  default_channel: string | null;
  enabled: boolean;
  updated_at: string;
}

export interface PluginInstall {
  id: string;
  workspace_id: string;
  name: string;
  manifest_json: Record<string, unknown>;
  enabled: boolean;
  installed_at: string;
}
