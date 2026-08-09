import { apiClient } from "./apiClient";
import type {
  ApiToken,
  ApiTokenCreated,
  PermissionGrant,
  PermissionGrantCreate,
  PermissionScheme,
  SsoConfig,
  UserGroup
} from "../types/enterprise";

export const enterpriseService = {
  async listGroups(workspaceId: string): Promise<UserGroup[]> {
    const response = await apiClient.get<UserGroup[]>(`/api/workspaces/${workspaceId}/groups`);
    return response.data;
  },

  async createGroup(workspaceId: string, name: string): Promise<UserGroup> {
    const response = await apiClient.post<UserGroup>(`/api/workspaces/${workspaceId}/groups`, { name });
    return response.data;
  },

  async deleteGroup(groupId: string): Promise<void> {
    await apiClient.delete(`/api/groups/${groupId}`);
  },

  async addGroupMember(groupId: string, userId: string): Promise<void> {
    await apiClient.post(`/api/groups/${groupId}/members`, { user_id: userId });
  },

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await apiClient.delete(`/api/groups/${groupId}/members/${userId}`);
  },

  async listApiTokens(): Promise<ApiToken[]> {
    const response = await apiClient.get<ApiToken[]>(`/api/api-tokens`);
    return response.data;
  },

  async createApiToken(name: string): Promise<ApiTokenCreated> {
    const response = await apiClient.post<ApiTokenCreated>(`/api/api-tokens`, { name });
    return response.data;
  },

  async revokeApiToken(tokenId: string): Promise<void> {
    await apiClient.delete(`/api/api-tokens/${tokenId}`);
  },

  async getSsoConfig(workspaceId: string): Promise<SsoConfig | null> {
    const response = await apiClient.get<SsoConfig | null>(`/api/workspaces/${workspaceId}/sso-config`);
    return response.data;
  },

  async updateSsoConfig(
    workspaceId: string,
    payload: {
      provider: string;
      client_id?: string | null;
      client_secret?: string | null;
      issuer?: string | null;
      idp_entity_id?: string | null;
      idp_sso_url?: string | null;
      idp_x509_cert?: string | null;
      sp_entity_id?: string | null;
      enabled: boolean;
    }
  ): Promise<SsoConfig> {
    const response = await apiClient.put<SsoConfig>(`/api/workspaces/${workspaceId}/sso-config`, payload);
    return response.data;
  },

  async validateSso(workspaceId: string): Promise<{ valid?: boolean; reason?: string; provider?: string }> {
    const response = await apiClient.post<{ valid?: boolean; reason?: string; provider?: string }>(
      `/api/workspaces/${workspaceId}/sso-config/validate`,
      {}
    );
    return response.data;
  },

  async requestGdprExport(): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`/api/me/gdpr-export`);
    return response.data;
  },

  async getPermissionScheme(projectId: string): Promise<PermissionScheme> {
    const response = await apiClient.get<PermissionScheme>(`/api/projects/${projectId}/permission-scheme`);
    return response.data;
  },

  async createPermissionScheme(projectId: string, name: string): Promise<PermissionScheme> {
    const response = await apiClient.post<PermissionScheme>(`/api/projects/${projectId}/permission-scheme`, {
      name
    });
    return response.data;
  },

  async addPermissionGrant(projectId: string, payload: PermissionGrantCreate): Promise<PermissionGrant> {
    const response = await apiClient.post<PermissionGrant>(
      `/api/projects/${projectId}/permission-scheme/grants`,
      payload
    );
    return response.data;
  },

  async deletePermissionGrant(projectId: string, grantId: string): Promise<void> {
    await apiClient.delete(`/api/projects/${projectId}/permission-scheme/grants/${grantId}`);
  }
};
