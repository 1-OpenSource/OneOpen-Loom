import { apiClient } from "./apiClient";
import type { Comment } from "../types/comment";

export const commentService = {
  async listComments(workItemId: string): Promise<Comment[]> {
    const response = await apiClient.get<Comment[]>(`/api/work-items/${workItemId}/comments`);
    return response.data;
  },

  async createComment(workItemId: string, commentText: string): Promise<Comment> {
    const response = await apiClient.post<Comment>(`/api/work-items/${workItemId}/comments`, {
      comment_text: commentText
    });
    return response.data;
  },

  async updateComment(commentId: string, commentText: string): Promise<Comment> {
    const response = await apiClient.put<Comment>(`/api/comments/${commentId}`, {
      comment_text: commentText
    });
    return response.data;
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/api/comments/${commentId}`);
  }
};
