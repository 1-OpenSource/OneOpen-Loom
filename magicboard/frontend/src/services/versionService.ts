import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { ProjectVersion, ProjectVersionCreate } from "../types/version";

export const versionService = {
  async listVersions(projectId: string): Promise<ProjectVersion[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<ProjectVersion[]>(`/api/projects/${projectId}/versions`);
      return response.data;
    }, []);
  },

  async createVersion(projectId: string, payload: ProjectVersionCreate): Promise<ProjectVersion> {
    const response = await apiClient.post<ProjectVersion>(`/api/projects/${projectId}/versions`, payload);
    return response.data;
  },

  async updateVersion(versionId: string, payload: Partial<ProjectVersionCreate>): Promise<ProjectVersion> {
    const response = await apiClient.put<ProjectVersion>(`/api/versions/${versionId}`, payload);
    return response.data;
  },

  async releaseVersion(versionId: string): Promise<ProjectVersion> {
    const response = await apiClient.post<ProjectVersion>(`/api/versions/${versionId}/release`);
    return response.data;
  },

  async deleteVersion(versionId: string): Promise<void> {
    await apiClient.delete(`/api/versions/${versionId}`);
  }
};
