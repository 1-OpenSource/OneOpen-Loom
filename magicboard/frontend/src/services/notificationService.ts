import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type { NotificationItem } from "../types/notification";

export const notificationService = {
  async list(unreadOnly = false): Promise<NotificationItem[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<NotificationItem[]>(`/api/notifications`, {
        params: { unread_only: unreadOnly || undefined }
      });
      return Array.isArray(response.data) ? response.data : [];
    }, []);
  },

  async unreadCount(): Promise<number> {
    return safeRequest(async () => {
      const response = await apiClient.get<{ count: number }>(`/api/notifications/unread-count`);
      return Number(response.data?.count ?? 0);
    }, 0);
  },

  async markRead(notificationId: string): Promise<void> {
    await apiClient.put(`/api/notifications/${notificationId}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.put(`/api/notifications/read-all`);
  }
};
