import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { RoadmapItem } from "../types/roadmap";

export const roadmapService = {
  async getRoadmap(projectId: string): Promise<RoadmapItem[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<{ items: RoadmapItem[] }>(`/api/projects/${projectId}/roadmap`);
      return response.data.items;
    }, []);
  }
};
