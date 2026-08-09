export interface WorkspaceSmtpSettings {
  id: string;
  workspace_id: string;
  host: string | null;
  port: number;
  username: string | null;
  password_set: boolean;
  use_tls: boolean;
  from_email: string | null;
  from_name: string | null;
  enabled: boolean;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  updated_at: string;
}

export interface WorkspaceDomain {
  id: string;
  workspace_id: string;
  domain: string;
  verified: boolean;
  verification_token: string;
  txt_record_name: string | null;
  created_at: string;
  verified_at: string | null;
}

export interface WorkspaceDnsProvider {
  id: string;
  workspace_id: string;
  provider: string;
  api_token_set: boolean;
  zone_id: string | null;
  enabled: boolean;
  config_json: Record<string, unknown>;
  updated_at: string;
}

export interface IssueTypeSchemeItem {
  id: string;
  scheme_id: string;
  work_item_type: string;
  position: number;
}

export interface IssueTypeScheme {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  items: IssueTypeSchemeItem[];
}

export interface MarketplaceCatalogItem {
  id: string;
  name: string;
  description: string;
  version: string;
  manifest: Record<string, unknown>;
}

export interface WorkflowTransitionRule {
  id: string;
  transition_id: string;
  kind: "CONDITION" | "VALIDATOR" | "POST_FUNCTION";
  rule_type: string;
  config: Record<string, unknown>;
  position: number;
}
