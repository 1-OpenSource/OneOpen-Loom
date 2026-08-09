import { apiClient } from "./apiClient";
import type {
  EmailTemplate,
  IssueTypeScheme,
  MarketplaceCatalogItem,
  WorkspaceDnsProvider,
  WorkspaceDomain,
  WorkspaceSmtpSettings
} from "../types/admin";
import type { PluginInstall } from "../types/plugin";

export const adminService = {
  async getSmtp(workspaceId: string): Promise<WorkspaceSmtpSettings | null> {
    const response = await apiClient.get<WorkspaceSmtpSettings | null>(`/api/workspaces/${workspaceId}/smtp`);
    return response.data;
  },

  async upsertSmtp(
    workspaceId: string,
    payload: {
      host?: string | null;
      port?: number;
      username?: string | null;
      password?: string | null;
      use_tls?: boolean;
      from_email?: string | null;
      from_name?: string | null;
      enabled?: boolean;
    }
  ): Promise<WorkspaceSmtpSettings> {
    const response = await apiClient.put<WorkspaceSmtpSettings>(`/api/workspaces/${workspaceId}/smtp`, payload);
    return response.data;
  },

  async testSmtp(workspaceId: string, toEmail: string): Promise<{ sent?: boolean; detail?: string }> {
    const response = await apiClient.post<{ sent?: boolean; detail?: string }>(
      `/api/workspaces/${workspaceId}/smtp/test`,
      { to_email: toEmail }
    );
    return response.data;
  },

  async listEmailTemplates(workspaceId: string): Promise<EmailTemplate[]> {
    const response = await apiClient.get<EmailTemplate[]>(`/api/workspaces/${workspaceId}/email-templates`);
    return response.data;
  },

  async upsertEmailTemplates(
    workspaceId: string,
    templates: Array<{
      key: string;
      name: string;
      subject: string;
      body_html: string;
      body_text: string;
    }>
  ): Promise<EmailTemplate[]> {
    const response = await apiClient.put<EmailTemplate[]>(
      `/api/workspaces/${workspaceId}/email-templates`,
      templates
    );
    return response.data;
  },

  async listDomains(workspaceId: string): Promise<WorkspaceDomain[]> {
    const response = await apiClient.get<WorkspaceDomain[]>(`/api/workspaces/${workspaceId}/domains`);
    return response.data;
  },

  async createDomain(workspaceId: string, domain: string): Promise<WorkspaceDomain> {
    const response = await apiClient.post<WorkspaceDomain>(`/api/workspaces/${workspaceId}/domains`, { domain });
    return response.data;
  },

  async deleteDomain(domainId: string): Promise<void> {
    await apiClient.delete(`/api/domains/${domainId}`);
  },

  async verifyDomain(domainId: string): Promise<WorkspaceDomain> {
    const response = await apiClient.post<WorkspaceDomain>(`/api/domains/${domainId}/verify`);
    return response.data;
  },

  async getDnsProvider(workspaceId: string): Promise<WorkspaceDnsProvider | null> {
    const response = await apiClient.get<WorkspaceDnsProvider | null>(
      `/api/workspaces/${workspaceId}/dns-provider`
    );
    return response.data;
  },

  async upsertDnsProvider(
    workspaceId: string,
    payload: {
      provider?: string;
      api_token?: string | null;
      zone_id?: string | null;
      enabled?: boolean;
      config_json?: Record<string, unknown>;
    }
  ): Promise<WorkspaceDnsProvider> {
    const response = await apiClient.put<WorkspaceDnsProvider>(
      `/api/workspaces/${workspaceId}/dns-provider`,
      payload
    );
    return response.data;
  },

  async listIssueTypeSchemes(workspaceId: string): Promise<IssueTypeScheme[]> {
    const response = await apiClient.get<IssueTypeScheme[]>(
      `/api/workspaces/${workspaceId}/issue-type-schemes`
    );
    return response.data;
  },

  async createIssueTypeScheme(
    workspaceId: string,
    payload: { name: string; description?: string | null; work_item_types: string[] }
  ): Promise<IssueTypeScheme> {
    const response = await apiClient.post<IssueTypeScheme>(
      `/api/workspaces/${workspaceId}/issue-type-schemes`,
      payload
    );
    return response.data;
  },

  async updateIssueTypeScheme(
    schemeId: string,
    payload: { name?: string; description?: string | null; work_item_types?: string[] }
  ): Promise<IssueTypeScheme> {
    const response = await apiClient.put<IssueTypeScheme>(`/api/issue-type-schemes/${schemeId}`, payload);
    return response.data;
  },

  async deleteIssueTypeScheme(schemeId: string): Promise<void> {
    await apiClient.delete(`/api/issue-type-schemes/${schemeId}`);
  },

  async assignIssueTypeScheme(projectId: string, issueTypeSchemeId: string | null): Promise<void> {
    await apiClient.put(`/api/projects/${projectId}/issue-type-scheme`, {
      issue_type_scheme_id: issueTypeSchemeId
    });
  },

  async listMarketplace(workspaceId: string): Promise<MarketplaceCatalogItem[]> {
    const response = await apiClient.get<MarketplaceCatalogItem[]>(
      `/api/workspaces/${workspaceId}/marketplace/catalog`
    );
    return response.data;
  },

  async installMarketplaceApp(workspaceId: string, catalogId: string): Promise<PluginInstall> {
    const response = await apiClient.post<PluginInstall>(
      `/api/workspaces/${workspaceId}/marketplace/install`,
      { catalog_id: catalogId }
    );
    return response.data;
  }
};
