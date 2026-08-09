import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { Space, SpaceCreate, SpacePage, SpacePageCreate } from "../types/space";

export const spaceService = {
  async listSpaces(workspaceId: string): Promise<Space[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<Space[]>(`/api/workspaces/${workspaceId}/spaces`);
      return response.data;
    }, []);
  },

  async createSpace(workspaceId: string, payload: SpaceCreate): Promise<Space> {
    const response = await apiClient.post<Space>(`/api/workspaces/${workspaceId}/spaces`, payload);
    return response.data;
  },

  async getSpace(spaceId: string): Promise<Space | null> {
    return safeRequest(async () => {
      const response = await apiClient.get<Space>(`/api/spaces/${spaceId}`);
      return response.data;
    }, null);
  },

  async deleteSpace(spaceId: string): Promise<void> {
    await apiClient.delete(`/api/spaces/${spaceId}`);
  },

  async listPages(spaceId: string): Promise<SpacePage[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePage[]>(`/api/spaces/${spaceId}/pages`);
      return response.data;
    }, []);
  },

  async createPage(spaceId: string, payload: SpacePageCreate): Promise<SpacePage> {
    const response = await apiClient.post<SpacePage>(`/api/spaces/${spaceId}/pages`, payload);
    return response.data;
  },

  async getPage(pageId: string): Promise<SpacePage | null> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePage>(`/api/pages/${pageId}`);
      return response.data;
    }, null);
  },

  async updatePage(pageId: string, payload: Partial<SpacePageCreate>): Promise<SpacePage> {
    const response = await apiClient.put<SpacePage>(`/api/pages/${pageId}`, payload);
    return response.data;
  },

  async deletePage(pageId: string): Promise<void> {
    await apiClient.delete(`/api/pages/${pageId}`);
  }
};
