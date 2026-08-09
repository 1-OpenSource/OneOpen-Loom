import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { Dashboard, DashboardCreate, DashboardGadgetCreate } from "../types/dashboard";

export const dashboardService = {
  async listDashboards(workspaceId: string): Promise<Dashboard[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<Dashboard[]>(`/api/workspaces/${workspaceId}/dashboards`);
      return response.data;
    }, []);
  },

  async createDashboard(workspaceId: string, payload: DashboardCreate): Promise<Dashboard> {
    const response = await apiClient.post<Dashboard>(`/api/workspaces/${workspaceId}/dashboards`, payload);
    return response.data;
  },

  async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    return safeRequest(async () => {
      const response = await apiClient.get<Dashboard>(`/api/dashboards/${dashboardId}`);
      return response.data;
    }, null);
  },

  async addGadget(dashboardId: string, payload: DashboardGadgetCreate): Promise<Dashboard> {
    const response = await apiClient.post<Dashboard>(`/api/dashboards/${dashboardId}/gadgets`, payload);
    return response.data;
  },

  async removeGadget(gadgetId: string): Promise<void> {
    await apiClient.delete(`/api/gadgets/${gadgetId}`);
  },

  async deleteDashboard(dashboardId: string): Promise<void> {
    await apiClient.delete(`/api/dashboards/${dashboardId}`);
  }
};
