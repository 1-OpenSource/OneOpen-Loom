import { apiClient } from "./apiClient";
import type { Activity } from "../types/activity";

export const activityService = {
  async listWorkItemActivity(workItemId: string): Promise<Activity[]> {
    const response = await apiClient.get<Activity[]>(`/api/work-items/${workItemId}/activity`);
    return response.data;
  },

  async listProjectActivity(projectId: string): Promise<Activity[]> {
    const response = await apiClient.get<Activity[]>(`/api/projects/${projectId}/activity`);
    return response.data;
  },

  async listWorkspaceActivity(workspaceId: string): Promise<Activity[]> {
    const response = await apiClient.get<Activity[]>(`/api/workspaces/${workspaceId}/activity`);
    return response.data;
  }
};
