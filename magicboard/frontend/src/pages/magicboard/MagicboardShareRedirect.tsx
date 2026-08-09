import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { magicboardService } from "../../services/magicboardService";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

export default function MagicboardShareRedirect() {
  const { token = "" } = useParams();
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!token) {
        setError("Missing share token.");
        return;
      }
      try {
        const resolved = await magicboardService.resolveShareLink(token);
        if (!cancelled) {
          setTarget(`/magicboard/spaces/${resolved.space_id}/pages/${resolved.page_id}`);
        }
      } catch (resolveError) {
        if (!cancelled) {
          setError(getApiErrorMessage(resolveError, "Share link is invalid or revoked"));
        }
      }
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) return <div className="error-banner">{error}</div>;
  if (target) return <Navigate to={target} replace />;
  return <div className="state-text">Opening shared page…</div>;
}
