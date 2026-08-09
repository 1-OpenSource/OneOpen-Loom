import { Navigate, useParams } from "react-router-dom";

export default function SpacePageEditor() {
  const { spaceId = "", pageId = "" } = useParams();
  return <Navigate to={`/magicboard/spaces/${spaceId}/pages/${pageId}`} replace />;
}
