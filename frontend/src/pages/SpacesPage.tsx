import { Navigate } from "react-router-dom";
import { magicboardAppUrl } from "../services/magicboardConnector";

/** Legacy /spaces → Magicboard product (external when configured). */
export default function SpacesPage() {
  if (magicboardAppUrl) {
    window.location.assign(`${magicboardAppUrl.replace(/\/$/, "")}/`);
    return <div className="state-text">Opening Magicboard…</div>;
  }
  return <Navigate to="/magicboard" replace />;
}
