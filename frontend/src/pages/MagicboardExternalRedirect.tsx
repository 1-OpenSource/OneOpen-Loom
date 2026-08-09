import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../components/ui/Button";
import { magicboardAppUrl, isMagicboardConfigured } from "../services/magicboardConnector";

/** Workboard no longer hosts Magicboard UI — send users to the Magicboard product. */
export default function MagicboardExternalRedirect() {
  const location = useLocation();
  const target = magicboardAppUrl
    ? `${magicboardAppUrl.replace(/\/$/, "")}${location.pathname}${location.search}`
    : null;

  useEffect(() => {
    if (target) {
      window.location.assign(target);
    }
  }, [target]);

  if (target) {
    return <div className="state-text">Opening Magicboard…</div>;
  }

  return (
    <div className="error-banner">
      <p>
        Magicboard is a separate product. Set <code>VITE_MAGICBOARD_APP_URL</code> to open it from Workboard
        {isMagicboardConfigured() ? "." : "."}
      </p>
      <Link to="/workspaces">
        <Button variant="secondary">Back to Workboard</Button>
      </Link>
    </div>
  );
}
