import { apiClient } from "./apiClient";
import type { Page } from "../types/common";
import type {
  WorkItem,
  WorkItemAttachment,
  WorkItemCreate,
  WorkItemLink,
  WorkItemLinkType,
  WorkItemPriority,
  WorkItemStatus,
  WorkItemSummary,
  Workboard
} from "../types/workItem";

export const workItemService = {
  async listWorkItems(
    projectId: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): Promise<Page<WorkItemSummary>> {
    const response = await apiClient.get<Page<WorkItemSummary>>(`/api/projects/${projectId}/work-items`, { params });
    return response.data;
  },

  async createWorkItem(projectId: string, payload: WorkItemCreate): Promise<WorkItem> {
    const response = await apiClient.post<WorkItem>(`/api/projects/${projectId}/work-items`, payload);
    return response.data;
  },

  async getWorkItem(workItemId: string): Promise<WorkItem> {
    const response = await apiClient.get<WorkItem>(`/api/work-items/${workItemId}`);
    return response.data;
  },

  async updateWorkItem(workItemId: string, payload: Partial<WorkItemCreate> & Record<string, unknown>): Promise<WorkItem> {
    const response = await apiClient.put<WorkItem>(`/api/work-items/${workItemId}`, payload);
    return response.data;
  },

  async updateStatus(workItemId: string, status: WorkItemStatus): Promise<WorkItem> {
    const response = await apiClient.put<WorkItem>(`/api/work-items/${workItemId}/status`, { status });
    return response.data;
  },

  async updateBlocked(workItemId: string, is_blocked: boolean): Promise<WorkItem> {
    const response = await apiClient.put<WorkItem>(`/api/work-items/${workItemId}/blocked`, { is_blocked });
    return response.data;
  },

  async updatePriority(workItemId: string, priority: WorkItemPriority): Promise<WorkItem> {
    const response = await apiClient.put<WorkItem>(`/api/work-items/${workItemId}/priority`, { priority });
    return response.data;
  },

  async updateAssignee(workItemId: string, assignee_user_id: string | null): Promise<WorkItem> {
    const response = await apiClient.put<WorkItem>(`/api/work-items/${workItemId}/owner`, { assignee_user_id });
    return response.data;
  },

  async getWorkboard(
    projectId: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): Promise<Workboard> {
    const response = await apiClient.get<Workboard>(`/api/projects/${projectId}/workboard`, { params });
    return response.data;
  },

  async uploadAttachment(workItemId: string, file: File): Promise<WorkItemAttachment> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<WorkItemAttachment>(`/api/work-items/${workItemId}/attachments`, formData);
    return response.data;
  },

  async downloadAttachment(attachmentId: string, filename: string): Promise<void> {
    const response = await apiClient.get<Blob>(`/api/attachments/${attachmentId}/download`, {
      responseType: "blob"
    });
    const objectUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  },

  async getAttachmentBlob(attachmentId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/attachments/${attachmentId}/download`, {
      responseType: "blob"
    });
    return response.data;
  },

  attachmentDownloadUrl(attachmentId: string): string {
    return `${apiClient.defaults.baseURL}/api/attachments/${attachmentId}/download`;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await apiClient.delete(`/api/attachments/${attachmentId}`);
  },

  async createLink(workItemId: string, target_work_item_id: string, link_type: WorkItemLinkType): Promise<WorkItemLink> {
    const response = await apiClient.post<WorkItemLink>(`/api/work-items/${workItemId}/links`, {
      target_work_item_id,
      link_type
    });
    return response.data;
  },

  async deleteLink(linkId: string): Promise<void> {
    await apiClient.delete(`/api/work-item-links/${linkId}`);
  },

  /** Reorders a work item within the ranked backlog relative to its neighbours. */
  async updateRank(workItemId: string, payload: { before_id?: string | null; after_id?: string | null }): Promise<WorkItem> {
    const response = await apiClient.put<WorkItem>(`/api/work-items/${workItemId}/rank`, payload);
    return response.data;
  },

  async clone(workItemId: string): Promise<WorkItem> {
    const response = await apiClient.post<WorkItem>(`/api/work-items/${workItemId}/clone`);
    return response.data;
  },

  async bulk(payload: {
    work_item_ids: string[];
    action: "status" | "assignee" | "priority" | "delete" | "sprint" | "labels";
    value?: unknown;
  }): Promise<void> {
    await apiClient.post(`/api/work-items/bulk`, payload);
  },

  async updateWatchers(workItemId: string, watcher_ids: string[]): Promise<WorkItem> {
    const response = await apiClient.put<WorkItem>(`/api/work-items/${workItemId}`, { watcher_ids });
    return response.data;
  }
};
