import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { OqlQueryResult, SavedFilter, SavedFilterCreate } from "../types/oql";

export const oqlService = {
  async runQuery(workspaceId: string, oql: string): Promise<OqlQueryResult> {
    const response = await apiClient.post<OqlQueryResult>(`/api/oql/query`, { workspace_id: workspaceId, oql });
    return response.data;
  },

  async listSavedFilters(workspaceId: string): Promise<SavedFilter[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SavedFilter[]>(`/api/oql/filters`, { params: { workspace_id: workspaceId } });
      return response.data;
    }, []);
  },

  async saveFilter(workspaceId: string, payload: SavedFilterCreate): Promise<SavedFilter> {
    const response = await apiClient.post<SavedFilter>(`/api/oql/filters`, { ...payload, workspace_id: workspaceId });
    return response.data;
  },

  async deleteFilter(filterId: string): Promise<void> {
    await apiClient.delete(`/api/oql/filters/${filterId}`);
  }
};
