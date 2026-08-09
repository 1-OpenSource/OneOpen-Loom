import { apiClient } from "./apiClient";
import type { Page } from "../types/common";
import type { Project, ProjectCreate, ProjectMember, ProjectOverview } from "../types/project";

export const projectService = {
  async listProjects(
    workspaceId: string,
    params?: { page?: number; page_size?: number; search?: string; sort_by?: string; archived?: boolean }
  ): Promise<Page<Project>> {
    const response = await apiClient.get<Page<Project>>(`/api/workspaces/${workspaceId}/projects`, { params });
    return response.data;
  },

  async createProject(workspaceId: string, payload: ProjectCreate): Promise<Project> {
    const response = await apiClient.post<Project>(`/api/workspaces/${workspaceId}/projects`, payload);
    return response.data;
  },

  async getProject(projectId: string): Promise<Project> {
    const response = await apiClient.get<Project>(`/api/projects/${projectId}`);
    return response.data;
  },

  async getOverview(projectId: string): Promise<ProjectOverview> {
    const response = await apiClient.get<ProjectOverview>(`/api/projects/${projectId}/overview`);
    return response.data;
  },

  async updateProject(projectId: string, payload: Partial<ProjectCreate>): Promise<Project> {
    const response = await apiClient.put<Project>(`/api/projects/${projectId}`, payload);
    return response.data;
  },

  async setArchived(projectId: string, archived: boolean): Promise<Project> {
    const response = await apiClient.put<Project>(`/api/projects/${projectId}/archive`, { archived });
    return response.data;
  },

  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/api/projects/${projectId}`);
  },

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await apiClient.get<ProjectMember[]>(`/api/projects/${projectId}/members`);
    return response.data;
  },

  async addMember(projectId: string, userId: string, role: string): Promise<ProjectMember> {
    const response = await apiClient.post<ProjectMember>(`/api/projects/${projectId}/members`, { user_id: userId, role });
    return response.data;
  },

  async updateMemberRole(projectId: string, userId: string, role: string): Promise<ProjectMember> {
    const response = await apiClient.put<ProjectMember>(`/api/projects/${projectId}/members/${userId}/role`, {
      role
    });
    return response.data;
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await apiClient.delete(`/api/projects/${projectId}/members/${userId}`);
  }
};
