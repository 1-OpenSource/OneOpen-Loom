import { apiClient } from "./apiClient";
import { safeRequest } from "../utils/safeRequest";
import type {
  MagicboardSearchResult,
  MagicboardTemplate,
  PageWorkItemSummary,
  Space,
  SpaceCreate,
  SpaceExport,
  SpaceImportRequest,
  SpaceMember,
  SpaceMembersUpdate,
  SpacePage,
  SpacePageAttachment,
  SpacePageComment,
  SpacePageCommentCreate,
  SpacePageCreate,
  SpacePageFavorite,
  SpacePageFromTemplateCreate,
  SpacePagePathResolve,
  SpacePageRecent,
  SpacePageShareLink,
  SpacePageTreeNode,
  SpacePageUpdate,
  SpacePageVersion,
  SpaceUpdate,
  SuiteSearchResult,
  WorkItemPageLink
} from "../types/magicboard";

export const magicboardService = {
  async listSpaces(workspaceId: string): Promise<Space[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<Space[]>(`/api/workspaces/${workspaceId}/spaces`);
      return response.data;
    }, []);
  },

  async createSpace(workspaceId: string, payload: SpaceCreate): Promise<Space> {
    const response = await apiClient.post<Space>(`/api/workspaces/${workspaceId}/spaces`, payload);
    return response.data;
  },

  async getSpace(spaceId: string): Promise<Space> {
    const response = await apiClient.get<Space>(`/api/spaces/${spaceId}`);
    return response.data;
  },

  async updateSpace(spaceId: string, payload: SpaceUpdate): Promise<Space> {
    const response = await apiClient.put<Space>(`/api/spaces/${spaceId}`, payload);
    return response.data;
  },

  async deleteSpace(spaceId: string): Promise<void> {
    await apiClient.delete(`/api/spaces/${spaceId}`);
  },

  async archiveSpace(spaceId: string): Promise<Space> {
    const response = await apiClient.post<Space>(`/api/spaces/${spaceId}/archive`);
    return response.data;
  },

  async listSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpaceMember[]>(`/api/spaces/${spaceId}/members`);
      return response.data;
    }, []);
  },

  async setSpaceMembers(spaceId: string, payload: SpaceMembersUpdate): Promise<SpaceMember[]> {
    const response = await apiClient.put<SpaceMember[]>(`/api/spaces/${spaceId}/members`, payload);
    return response.data;
  },

  async watchSpace(spaceId: string): Promise<void> {
    await apiClient.post(`/api/spaces/${spaceId}/watch`);
  },

  async unwatchSpace(spaceId: string): Promise<void> {
    await apiClient.delete(`/api/spaces/${spaceId}/watch`);
  },

  async exportSpace(spaceId: string): Promise<SpaceExport> {
    const response = await apiClient.get<SpaceExport>(`/api/spaces/${spaceId}/export`);
    return response.data;
  },

  async importSpacePages(spaceId: string, payload: SpaceImportRequest): Promise<SpacePage[]> {
    const response = await apiClient.post<SpacePage[]>(`/api/spaces/${spaceId}/import`, payload);
    return response.data;
  },

  async listPagesFlat(spaceId: string): Promise<SpacePage[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePage[]>(`/api/spaces/${spaceId}/pages`);
      return response.data;
    }, []);
  },

  async getPageTree(spaceId: string): Promise<SpacePageTreeNode[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePageTreeNode[]>(`/api/spaces/${spaceId}/pages/tree`);
      return response.data;
    }, []);
  },

  async createPage(spaceId: string, payload: SpacePageCreate): Promise<SpacePage> {
    const response = await apiClient.post<SpacePage>(`/api/spaces/${spaceId}/pages`, payload);
    return response.data;
  },

  async createPageFromTemplate(spaceId: string, payload: SpacePageFromTemplateCreate): Promise<SpacePage> {
    const response = await apiClient.post<SpacePage>(`/api/spaces/${spaceId}/pages/from-template`, payload);
    return response.data;
  },

  async getPage(pageId: string): Promise<SpacePage> {
    const response = await apiClient.get<SpacePage>(`/api/pages/${pageId}`);
    return response.data;
  },

  async updatePage(pageId: string, payload: SpacePageUpdate): Promise<SpacePage> {
    const response = await apiClient.put<SpacePage>(`/api/pages/${pageId}`, payload);
    return response.data;
  },

  async deletePage(pageId: string): Promise<void> {
    await apiClient.delete(`/api/pages/${pageId}`);
  },

  async archivePage(pageId: string): Promise<SpacePage> {
    const response = await apiClient.post<SpacePage>(`/api/pages/${pageId}/archive`);
    return response.data;
  },

  async listPageVersions(pageId: string): Promise<SpacePageVersion[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePageVersion[]>(`/api/pages/${pageId}/versions`);
      return response.data;
    }, []);
  },

  async restorePageVersion(pageId: string, versionId: string): Promise<SpacePage> {
    const response = await apiClient.post<SpacePage>(`/api/pages/${pageId}/restore/${versionId}`);
    return response.data;
  },

  async listPageComments(pageId: string): Promise<SpacePageComment[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePageComment[]>(`/api/pages/${pageId}/comments`);
      return response.data;
    }, []);
  },

  async addPageComment(pageId: string, payload: SpacePageCommentCreate): Promise<SpacePageComment> {
    const response = await apiClient.post<SpacePageComment>(`/api/pages/${pageId}/comments`, payload);
    return response.data;
  },

  async deletePageComment(commentId: string): Promise<void> {
    await apiClient.delete(`/api/page-comments/${commentId}`);
  },

  async watchPage(pageId: string): Promise<void> {
    await apiClient.post(`/api/pages/${pageId}/watch`);
  },

  async unwatchPage(pageId: string): Promise<void> {
    await apiClient.delete(`/api/pages/${pageId}/watch`);
  },

  async favoritePage(pageId: string): Promise<void> {
    await apiClient.post(`/api/pages/${pageId}/favorite`);
  },

  async unfavoritePage(pageId: string): Promise<void> {
    await apiClient.delete(`/api/pages/${pageId}/favorite`);
  },

  async recordPageView(pageId: string): Promise<void> {
    await apiClient.post(`/api/pages/${pageId}/view`);
  },

  async listTemplates(): Promise<MagicboardTemplate[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<MagicboardTemplate[]>("/api/magicboard/templates");
      return response.data;
    }, []);
  },

  async searchPages(workspaceId: string, query: string): Promise<MagicboardSearchResult[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<MagicboardSearchResult[]>(
        `/api/workspaces/${workspaceId}/magicboard/search`,
        { params: { q: query } }
      );
      return response.data;
    }, []);
  },

  async listFavorites(workspaceId: string): Promise<SpacePageFavorite[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePageFavorite[]>(
        `/api/workspaces/${workspaceId}/magicboard/favorites`
      );
      return response.data;
    }, []);
  },

  async listRecent(workspaceId: string): Promise<SpacePageRecent[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePageRecent[]>(`/api/workspaces/${workspaceId}/magicboard/recent`);
      return response.data;
    }, []);
  },

  async listWorkItemsForPage(pageId: string): Promise<PageWorkItemSummary[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<PageWorkItemSummary[]>(`/api/pages/${pageId}/work-items`);
      return response.data;
    }, []);
  },

  async getWorkItemByKey(workspaceId: string, key: string): Promise<PageWorkItemSummary | null> {
    return safeRequest(async () => {
      const response = await apiClient.get<PageWorkItemSummary>(
        `/api/workspaces/${workspaceId}/connector/work-items/by-key/${encodeURIComponent(key)}`
      );
      return response.data;
    }, null);
  },

  async searchWorkItems(workspaceId: string, query: string): Promise<PageWorkItemSummary[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<PageWorkItemSummary[]>(
        `/api/workspaces/${workspaceId}/connector/work-items/search`,
        { params: { q: query } }
      );
      return response.data;
    }, []);
  },

  async listPagesForWorkItem(workItemId: string): Promise<SpacePage[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePage[]>(`/api/work-items/${workItemId}/pages`);
      return response.data;
    }, []);
  },

  async linkPageToWorkItem(workItemId: string, payload: WorkItemPageLink): Promise<void> {
    await apiClient.post(`/api/work-items/${workItemId}/pages`, payload);
  },

  async unlinkPageFromWorkItem(workItemId: string, pageId: string): Promise<void> {
    await apiClient.delete(`/api/work-items/${workItemId}/pages/${pageId}`);
  },

  async listAttachments(pageId: string): Promise<SpacePageAttachment[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePageAttachment[]>(`/api/pages/${pageId}/attachments`);
      return response.data;
    }, []);
  },

  async uploadAttachment(pageId: string, file: File): Promise<SpacePageAttachment> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<SpacePageAttachment>(`/api/pages/${pageId}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await apiClient.delete(`/api/page-attachments/${attachmentId}`);
  },

  async getAttachmentBlob(attachmentId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/page-attachments/${attachmentId}/download`, {
      responseType: "blob"
    });
    return response.data;
  },

  async downloadAttachment(attachmentId: string, filename: string): Promise<void> {
    const blob = await this.getAttachmentBlob(attachmentId);
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  },

  async suiteSearch(workspaceId: string, query: string): Promise<SuiteSearchResult> {
    return safeRequest(async () => {
      const response = await apiClient.get<SuiteSearchResult>(`/api/workspaces/${workspaceId}/suite-search`, {
        params: { q: query }
      });
      return response.data;
    }, { pages: [], work_items: [] });
  },

  async resolvePath(workspaceId: string, spaceKey: string, pageSlug: string): Promise<SpacePagePathResolve> {
    const response = await apiClient.get<SpacePagePathResolve>(
      `/api/workspaces/${workspaceId}/magicboard/resolve`,
      { params: { space_key: spaceKey, page_slug: pageSlug } }
    );
    return response.data;
  },

  async createShareLink(pageId: string): Promise<SpacePageShareLink> {
    const response = await apiClient.post<SpacePageShareLink>(`/api/pages/${pageId}/share-links`);
    return response.data;
  },

  async listShareLinks(pageId: string): Promise<SpacePageShareLink[]> {
    return safeRequest(async () => {
      const response = await apiClient.get<SpacePageShareLink[]>(`/api/pages/${pageId}/share-links`);
      return response.data;
    }, []);
  },

  async revokeShareLink(linkId: string): Promise<void> {
    await apiClient.delete(`/api/share-links/${linkId}`);
  },

  async resolveShareLink(token: string): Promise<SpacePagePathResolve> {
    const response = await apiClient.get<SpacePagePathResolve>(`/api/magicboard/share/${token}`);
    return response.data;
  }
};
