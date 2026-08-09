import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { magicboardService } from "../../services/magicboardService";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getActiveWorkspaceId } from "../../utils/workspaceState";

export default function MagicboardPathRedirect() {
  const { spaceKey = "", pageSlug = "" } = useParams();
  const workspaceId = getActiveWorkspaceId() ?? "";
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!workspaceId || !spaceKey || !pageSlug) {
        setError("Missing workspace or path.");
        return;
      }
      try {
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
  }, [workspaceId, spaceKey, pageSlug]);

  if (error) return <div className="error-banner">{error}</div>;
  if (target) return <Navigate to={target} replace />;
  return <div className="state-text">Opening {spaceKey}/{pageSlug}…</div>;
}
