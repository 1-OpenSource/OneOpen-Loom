import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { CustomField, CustomFieldCreate, ProjectComponent, ProjectLabel } from "../types/fieldCatalog";

export const fieldCatalogService = {
  async listLabels(projectId: string): Promise<ProjectLabel[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<ProjectLabel[]>(`/api/projects/${projectId}/labels`);
      return response.data;
    }, []);
  },

  async createLabel(projectId: string, name: string, color?: string | null): Promise<ProjectLabel> {
    const response = await apiClient.post<ProjectLabel>(`/api/projects/${projectId}/labels`, { name, color });
    return response.data;
  },

  async deleteLabel(labelId: string): Promise<void> {
    await apiClient.delete(`/api/labels/${labelId}`);
  },

  async listComponents(projectId: string): Promise<ProjectComponent[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<ProjectComponent[]>(`/api/projects/${projectId}/components`);
      return response.data;
    }, []);
  },

  async createComponent(projectId: string, name: string, description?: string | null): Promise<ProjectComponent> {
    const response = await apiClient.post<ProjectComponent>(`/api/projects/${projectId}/components`, { name, description });
    return response.data;
  },

  async deleteComponent(componentId: string): Promise<void> {
    await apiClient.delete(`/api/components/${componentId}`);
  },

  async listCustomFields(projectId: string): Promise<CustomField[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<CustomField[]>(`/api/projects/${projectId}/custom-fields`);
      return response.data;
    }, []);
  },

  async createCustomField(projectId: string, payload: CustomFieldCreate): Promise<CustomField> {
    const response = await apiClient.post<CustomField>(`/api/projects/${projectId}/custom-fields`, payload);
    return response.data;
  },

  async deleteCustomField(fieldId: string): Promise<void> {
    await apiClient.delete(`/api/custom-fields/${fieldId}`);
  }
};
