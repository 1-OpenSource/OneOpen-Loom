export interface UserGroup {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_ids: string[];
}

export interface ApiToken {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface ApiTokenCreated {
  token: ApiToken;
  secret: string;
}

export interface SsoConfig {
  id: string;
  workspace_id: string;
  provider: string;
  client_id: string | null;
  issuer: string | null;
  idp_entity_id: string | null;
  idp_sso_url: string | null;
  idp_x509_cert: string | null;
  sp_entity_id: string | null;
  enabled: boolean;
  updated_at: string;
}

export interface PermissionGrant {
  id: string;
  scheme_id: string;
  permission: string;
  holder_type: string;
  holder_id: string | null;
  holder_role: string | null;
}

export interface PermissionScheme {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  grants: PermissionGrant[];
}

export interface PermissionGrantCreate {
  permission: string;
  holder_type?: string;
  holder_id?: string | null;
  holder_role?: string | null;
}
