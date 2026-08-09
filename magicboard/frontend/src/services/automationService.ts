import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { AutomationRule, AutomationRuleCreate } from "../types/automation";

export const automationService = {
  async listRules(projectId: string): Promise<AutomationRule[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<AutomationRule[]>(`/api/projects/${projectId}/automation-rules`);
      return response.data;
    }, []);
  },

  async createRule(projectId: string, payload: AutomationRuleCreate): Promise<AutomationRule> {
    const response = await apiClient.post<AutomationRule>(`/api/projects/${projectId}/automation-rules`, payload);
    return response.data;
  },

  async updateRule(ruleId: string, payload: Partial<AutomationRuleCreate>): Promise<AutomationRule> {
    const response = await apiClient.put<AutomationRule>(`/api/automation-rules/${ruleId}`, payload);
    return response.data;
  },

  async toggleRule(ruleId: string, isEnabled: boolean): Promise<AutomationRule> {
    const response = await apiClient.put<AutomationRule>(`/api/automation-rules/${ruleId}/toggle`, { is_enabled: isEnabled });
    return response.data;
  },

  async deleteRule(ruleId: string): Promise<void> {
    await apiClient.delete(`/api/automation-rules/${ruleId}`);
  }
};
