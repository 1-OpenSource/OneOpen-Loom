import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { WorkLog, WorkLogCreate } from "../types/workLog";

export const workLogService = {
  async listWorkLogs(workItemId: string): Promise<WorkLog[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<WorkLog[]>(`/api/work-items/${workItemId}/worklogs`);
      return response.data;
    }, []);
  },

  async createWorkLog(workItemId: string, payload: WorkLogCreate): Promise<WorkLog> {
    const response = await apiClient.post<WorkLog>(`/api/work-items/${workItemId}/worklogs`, payload);
    return response.data;
  },

  async deleteWorkLog(workLogId: string): Promise<void> {
    await apiClient.delete(`/api/worklogs/${workLogId}`);
  }
};
