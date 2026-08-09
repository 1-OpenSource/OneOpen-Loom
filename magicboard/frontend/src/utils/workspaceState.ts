const ACTIVE_WORKSPACE_KEY = "oneopen.activeWorkspaceId";

export function getActiveWorkspaceId(): string | null {
  return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

export function setActiveWorkspaceId(workspaceId: string) {
  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
}
