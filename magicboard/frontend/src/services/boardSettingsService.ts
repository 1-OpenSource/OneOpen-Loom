import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { WorkflowTransitionRule } from "../types/admin";
import type { WorkflowStatus } from "../types/project";
import type { BoardSettings, BoardSettingsUpdate, WorkflowTransition, WorkflowTransitionCreate } from "../types/boardSettings";

export const boardSettingsService = {
  async getBoardSettings(projectId: string): Promise<BoardSettings | null> {
    return safeRequest(async () => {
      const response = await apiClient.get<BoardSettings>(`/api/projects/${projectId}/board-settings`);
      return response.data;
    }, null);
  },

  async updateBoardSettings(projectId: string, payload: BoardSettingsUpdate): Promise<BoardSettings> {
    const response = await apiClient.put<BoardSettings>(`/api/projects/${projectId}/board-settings`, payload);
    return response.data;
  },

  async createStatus(
    projectId: string,
    payload: { name: string; key: string; color?: string; category?: string; position?: number }
  ): Promise<WorkflowStatus> {
    const response = await apiClient.post<WorkflowStatus>(`/api/projects/${projectId}/statuses`, payload);
    return response.data;
  },

  async updateStatus(
    statusId: string,
    payload: { name?: string; color?: string; category?: string; position?: number }
  ): Promise<WorkflowStatus> {
    const response = await apiClient.put<WorkflowStatus>(`/api/statuses/${statusId}`, payload);
    return response.data;
  },

  async deleteStatus(statusId: string): Promise<void> {
    await apiClient.delete(`/api/statuses/${statusId}`);
  },

  async listTransitions(projectId: string): Promise<WorkflowTransition[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<WorkflowTransition[]>(`/api/projects/${projectId}/transitions`);
      return response.data;
    }, []);
  },

  async createTransition(projectId: string, payload: WorkflowTransitionCreate): Promise<WorkflowTransition> {
    const response = await apiClient.post<WorkflowTransition>(`/api/projects/${projectId}/transitions`, payload);
    return response.data;
  },

  async deleteTransition(transitionId: string): Promise<void> {
    await apiClient.delete(`/api/transitions/${transitionId}`);
  },

  async listTransitionRules(transitionId: string): Promise<WorkflowTransitionRule[]> {
    const response = await apiClient.get<WorkflowTransitionRule[]>(`/api/transitions/${transitionId}/rules`);
    return response.data;
  },

  async createTransitionRule(
    transitionId: string,
    payload: { kind: string; rule_type: string; config?: Record<string, unknown>; position?: number }
  ): Promise<WorkflowTransitionRule> {
    const response = await apiClient.post<WorkflowTransitionRule>(`/api/transitions/${transitionId}/rules`, payload);
    return response.data;
  },

  async deleteTransitionRule(ruleId: string): Promise<void> {
    await apiClient.delete(`/api/transition-rules/${ruleId}`);
  }
};
