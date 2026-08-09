import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { Sprint, SprintCreate } from "../types/sprint";
import type { WorkItemSummary } from "../types/workItem";

export const sprintService = {
  async listSprints(projectId: string): Promise<Sprint[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<Sprint[]>(`/api/projects/${projectId}/sprints`);
      return response.data;
    }, []);
  },

  async createSprint(projectId: string, payload: SprintCreate): Promise<Sprint> {
    const response = await apiClient.post<Sprint>(`/api/projects/${projectId}/sprints`, payload);
    return response.data;
  },

  async updateSprint(sprintId: string, payload: Partial<SprintCreate>): Promise<Sprint> {
    const response = await apiClient.put<Sprint>(`/api/sprints/${sprintId}`, payload);
    return response.data;
  },

  async startSprint(sprintId: string): Promise<Sprint> {
    const response = await apiClient.post<Sprint>(`/api/sprints/${sprintId}/start`);
    return response.data;
  },

  async completeSprint(sprintId: string): Promise<Sprint> {
    const response = await apiClient.post<Sprint>(`/api/sprints/${sprintId}/complete`);
    return response.data;
  },

  async deleteSprint(sprintId: string): Promise<void> {
    await apiClient.delete(`/api/sprints/${sprintId}`);
  },

  async listSprintItems(sprintId: string): Promise<WorkItemSummary[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<WorkItemSummary[]>(`/api/sprints/${sprintId}/work-items`);
      return response.data;
    }, []);
  },

  async assignToSprint(workItemId: string, sprintId: string | null): Promise<void> {
    await apiClient.put(`/api/work-items/${workItemId}/sprint`, { sprint_id: sprintId });
  }
};
