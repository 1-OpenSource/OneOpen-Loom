import { apiClient } from "./apiClient";

export interface SearchResultItem {
  entity_type: string;
  identifier: string;
  title: string;
  context: string | null;
  status: string | null;
  href: string;
  entity_id: string;
}

export const searchService = {
  async search(workspaceId: string, q: string): Promise<SearchResultItem[]> {
    const response = await apiClient.get<{ query: string; results: SearchResultItem[] }>("/api/search", {
      params: { workspace_id: workspaceId, q }
    });
    return response.data.results;
  }
};
