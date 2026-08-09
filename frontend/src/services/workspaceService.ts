import { apiClient } from "./apiClient";
import type {
  Workspace,
  WorkspaceCreate,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceOverview
} from "../types/workspace";

export const workspaceService = {
  async listWorkspaces(): Promise<Workspace[]> {
    const response = await apiClient.get<Workspace[]>("/api/workspaces");
    return response.data;
  },

  async createWorkspace(payload: WorkspaceCreate): Promise<Workspace> {
    const response = await apiClient.post<Workspace>("/api/workspaces", payload);
    return response.data;
  },

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const response = await apiClient.get<Workspace>(`/api/workspaces/${workspaceId}`);
    return response.data;
  },

  async getOverview(workspaceId: string): Promise<WorkspaceOverview> {
    const response = await apiClient.get<WorkspaceOverview>(`/api/workspaces/${workspaceId}/overview`);
    return response.data;
  },

  async updateWorkspace(workspaceId: string, payload: Partial<WorkspaceCreate>): Promise<Workspace> {
    const response = await apiClient.put<Workspace>(`/api/workspaces/${workspaceId}`, payload);
    return response.data;
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspaceId}`);
  },

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await apiClient.get<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`);
    return response.data;
  },

  async listInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    const response = await apiClient.get<WorkspaceInvitation[]>(`/api/workspaces/${workspaceId}/invitations`);
    return response.data;
  },

  async inviteMember(workspaceId: string, email: string, role: string): Promise<WorkspaceInvitation> {
    const response = await apiClient.post<WorkspaceInvitation>(`/api/workspaces/${workspaceId}/invitations`, {
      email,
      role
    });
    return response.data;
  },

  async resendInvitation(workspaceId: string, invitationId: string): Promise<WorkspaceInvitation> {
    const response = await apiClient.post<WorkspaceInvitation>(
      `/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`
    );
    return response.data;
  },

  async revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspaceId}/invitations/${invitationId}`);
  },

  async updateMemberRole(workspaceId: string, userId: string, role: string): Promise<WorkspaceMember> {
    const response = await apiClient.put<WorkspaceMember>(`/api/workspaces/${workspaceId}/members/${userId}/role`, {
      role
    });
    return response.data;
  },

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
  }
};
