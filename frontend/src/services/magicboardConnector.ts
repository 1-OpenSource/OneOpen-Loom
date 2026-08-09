import axios from "axios";
import { getAuthToken } from "../utils/authToken";
import { magicboardService } from "./magicboardService";
import type { MagicboardTemplate, Space, SpacePage } from "../types/magicboard";

const magicboardApiUrl = (import.meta.env.VITE_MAGICBOARD_API_URL as string | undefined)?.trim();
export const magicboardAppUrl = (import.meta.env.VITE_MAGICBOARD_APP_URL as string | undefined)?.trim();

export function isMagicboardConfigured(): boolean {
  return Boolean(magicboardApiUrl || magicboardAppUrl);
}

const remoteClient = magicboardApiUrl
  ? axios.create({
      baseURL: magicboardApiUrl.replace(/\/$/, ""),
      headers: { "Content-Type": "application/json" }
    })
  : null;

if (remoteClient) {
  remoteClient.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

/** Prefer remote Magicboard API when configured; otherwise fall back to in-process routes. */
export const magicboardConnector = {
  async listSpaces(workspaceId: string): Promise<Space[]> {
    if (remoteClient) {
      const response = await remoteClient.get<Space[]>(`/api/workspaces/${workspaceId}/spaces`);
      return response.data;
    }
    return magicboardService.listSpaces(workspaceId);
  },

  async listPagesFlat(spaceId: string): Promise<SpacePage[]> {
    if (remoteClient) {
      const response = await remoteClient.get<SpacePage[]>(`/api/spaces/${spaceId}/pages`);
      return response.data;
    }
    return magicboardService.listPagesFlat(spaceId);
  },

  async listTemplates(): Promise<MagicboardTemplate[]> {
    if (remoteClient) {
      const response = await remoteClient.get<MagicboardTemplate[]>("/api/magicboard/templates");
      return response.data;
    }
    return magicboardService.listTemplates();
  },

  async createPageFromTemplate(
    spaceId: string,
    payload: { template_key: string; title?: string }
  ): Promise<SpacePage> {
    if (remoteClient) {
      const response = await remoteClient.post<SpacePage>(`/api/spaces/${spaceId}/pages/from-template`, payload);
      return response.data;
    }
    return magicboardService.createPageFromTemplate(spaceId, payload);
  },

  pageUrl(spaceId: string, pageId: string): string {
    const base = (magicboardAppUrl || "").replace(/\/$/, "") || "";
    if (base) {
      return `${base}/magicboard/spaces/${spaceId}/pages/${pageId}`;
    }
    return `/magicboard/spaces/${spaceId}/pages/${pageId}`;
  },

  // Link APIs stay on Workboard (join table ownership)
  listPagesForWorkItem: magicboardService.listPagesForWorkItem.bind(magicboardService),
  linkPageToWorkItem: magicboardService.linkPageToWorkItem.bind(magicboardService),
  unlinkPageFromWorkItem: magicboardService.unlinkPageFromWorkItem.bind(magicboardService)
};
