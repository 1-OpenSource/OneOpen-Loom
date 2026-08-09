import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { ProjectIntegration, ProjectIntegrationCreate } from "../types/integration";
import type { PluginInstall, SlackConfig } from "../types/plugin";

export const integrationService = {
  async listIntegrations(projectId: string): Promise<ProjectIntegration[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<ProjectIntegration[]>(`/api/projects/${projectId}/integrations`);
      return response.data;
    }, []);
  },

  async createIntegration(projectId: string, payload: ProjectIntegrationCreate): Promise<ProjectIntegration> {
    const response = await apiClient.post<ProjectIntegration>(`/api/projects/${projectId}/integrations`, payload);
    return response.data;
  },

  async deleteIntegration(integrationId: string): Promise<void> {
    await apiClient.delete(`/api/integrations/${integrationId}`);
  },

  async listPlugins(workspaceId: string): Promise<PluginInstall[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<PluginInstall[]>(`/api/workspaces/${workspaceId}/plugins`);
      return response.data;
    }, []);
  },

  async installPlugin(workspaceId: string, name: string): Promise<PluginInstall> {
    const response = await apiClient.post<PluginInstall>(`/api/workspaces/${workspaceId}/plugins`, {
      name,
      manifest_json: {}
    });
    return response.data;
  },

  async updatePlugin(pluginId: string, payload: { enabled?: boolean }): Promise<PluginInstall> {
    const response = await apiClient.put<PluginInstall>(`/api/plugins/${pluginId}`, payload);
    return response.data;
  },

  async uninstallPlugin(pluginId: string): Promise<void> {
    await apiClient.delete(`/api/plugins/${pluginId}`);
  },

  async getSlackConfig(workspaceId: string): Promise<SlackConfig | null> {
    return safeRequest(async () => {
      const response = await apiClient.get<SlackConfig | null>(`/api/workspaces/${workspaceId}/slack-config`);
      return response.data;
    }, null);
  },

  async updateSlackConfig(
    workspaceId: string,
    payload: { webhook_url?: string | null; default_channel?: string | null; enabled: boolean }
  ): Promise<SlackConfig> {
    const response = await apiClient.put<SlackConfig>(`/api/workspaces/${workspaceId}/slack-config`, payload);
    return response.data;
  }
};
