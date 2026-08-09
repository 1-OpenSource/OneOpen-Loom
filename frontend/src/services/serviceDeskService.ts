import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { PortalProjectInfo, PortalRequestCreate, ServiceQueue, ServiceQueueCreate } from "../types/serviceDesk";
import type { WorkItem } from "../types/workItem";

export const serviceDeskService = {
  async listQueues(projectId: string): Promise<ServiceQueue[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<ServiceQueue[]>(`/api/projects/${projectId}/queues`);
      return response.data;
    }, []);
  },

  async createQueue(projectId: string, payload: ServiceQueueCreate): Promise<ServiceQueue> {
    const response = await apiClient.post<ServiceQueue>(`/api/projects/${projectId}/queues`, payload);
    return response.data;
  },

  async deleteQueue(queueId: string): Promise<void> {
    await apiClient.delete(`/api/queues/${queueId}`);
  },

  async getPortalInfo(projectKey: string): Promise<PortalProjectInfo | null> {
    return safeRequest(async () => {
      const response = await apiClient.get<PortalProjectInfo>(`/api/portal/${projectKey}`);
      return response.data;
    }, null);
  },

  async submitPortalRequest(projectKey: string, payload: PortalRequestCreate): Promise<WorkItem> {
    const response = await apiClient.post<WorkItem>(`/api/portal/${projectKey}/requests`, payload);
    return response.data;
  }
};
