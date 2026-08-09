import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { BurndownPoint, CreatedVsResolvedPoint, CumulativeFlowPoint, VelocityPoint } from "../types/report";

function asSeries<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { series?: unknown }).series)) {
    return (payload as { series: T[] }).series;
  }
  return [];
}

function normalizeBurndown(payload: unknown): BurndownPoint[] {
  return asSeries<Record<string, unknown>>(payload).map((point) => ({
    date: String(point.date ?? ""),
    remaining_points: Number(point.remaining_points ?? 0),
    ideal_points: Number(point.ideal_points ?? point.ideal_remaining_points ?? 0)
  }));
}

function normalizeCfd(payload: unknown): CumulativeFlowPoint[] {
  return asSeries<Record<string, unknown>>(payload).map((point) => {
    if (point.counts_by_status && typeof point.counts_by_status === "object") {
      return {
        date: String(point.date ?? ""),
        counts_by_status: point.counts_by_status as Record<string, number>
      };
    }
    const counts_by_status: Record<string, number> = {};
    for (const [key, value] of Object.entries(point)) {
      if (key === "date") continue;
      if (typeof value === "number") counts_by_status[key] = value;
    }
    return { date: String(point.date ?? ""), counts_by_status };
  });
}

export const reportService = {
  async getVelocity(projectId: string): Promise<VelocityPoint[]> {
    return safeRequest(async () => {
      const response = await apiClient.get(`/api/projects/${projectId}/reports/velocity`);
      return asSeries<VelocityPoint>(response.data);
    }, []);
  },

  async getBurndown(projectId: string, sprintId?: string): Promise<BurndownPoint[]> {
    return safeRequest(async () => {
      const response = await apiClient.get(`/api/projects/${projectId}/reports/burndown`, {
        params: { sprint_id: sprintId }
      });
      return normalizeBurndown(response.data);
    }, []);
  },

  async getCumulativeFlow(projectId: string): Promise<CumulativeFlowPoint[]> {
    return safeRequest(async () => {
      const response = await apiClient.get(`/api/projects/${projectId}/reports/cumulative-flow`);
      return normalizeCfd(response.data);
    }, []);
  },

  async getCreatedVsResolved(projectId: string): Promise<CreatedVsResolvedPoint[]> {
    return safeRequest(async () => {
      const response = await apiClient.get(`/api/projects/${projectId}/reports/created-vs-resolved`);
      return asSeries<CreatedVsResolvedPoint>(response.data);
    }, []);
  }
};
