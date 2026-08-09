import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { magicboardService } from "../../services/magicboardService";
import { workspaceService } from "../../services/workspaceService";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "../../utils/workspaceState";

export default function MagicboardPathRedirect() {
  const { spaceKey = "", pageSlug = "" } = useParams();
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!spaceKey || !pageSlug) {
        setError("Missing page path.");
        return;
      }
      try {
        let workspaceId = getActiveWorkspaceId() ?? "";
        if (!workspaceId) {
          const workspaces = await workspaceService.listWorkspaces();
          workspaceId = workspaces[0]?.id ?? "";
          if (workspaceId) {
            setActiveWorkspaceId(workspaceId);
          }
        }
        if (!workspaceId) {
          if (!cancelled) setError("No workspace available.");
          return;
        }
        const resolved = await magicboardService.resolvePath(workspaceId, spaceKey, pageSlug);
        if (!cancelled) {
          setTarget(`/magicboard/spaces/${resolved.space_id}/pages/${resolved.page_id}`);
        }
      } catch (resolveError) {
        if (!cancelled) {
          setError(getApiErrorMessage(resolveError, "Could not resolve page path"));
        }
      }
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [spaceKey, pageSlug]);

  if (error) return <div className="error-banner">{error}</div>;
  if (target) return <Navigate to={target} replace />;
  return <div className="state-text">Opening {spaceKey}/{pageSlug}…</div>;
}
