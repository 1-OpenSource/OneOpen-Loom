import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../hooks/useAuth";
import LoginPage from "../pages/LoginPage";
import MagicboardHomePage from "../pages/magicboard/MagicboardHomePage";
import MagicboardPageEditor from "../pages/magicboard/MagicboardPageEditor";
import MagicboardPathRedirect from "../pages/magicboard/MagicboardPathRedirect";
import MagicboardShareRedirect from "../pages/magicboard/MagicboardShareRedirect";
import MagicboardSpacePage from "../pages/magicboard/MagicboardSpacePage";
import RegisterPage from "../pages/RegisterPage";
import WorkspaceDetailPage from "../pages/WorkspaceDetailPage";
import WorkspaceListPage from "../pages/WorkspaceListPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, isBootstrapping } = useAuth();
  if (isBootstrapping) {
    return <div className="state-text">Loading…</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<MagicboardHomePage />} />
        <Route path="/magicboard" element={<Navigate to="/" replace />} />
        <Route path="/magicboard/share/:token" element={<MagicboardShareRedirect />} />
        <Route path="/magicboard/spaces/:spaceId" element={<MagicboardSpacePage />}>
          <Route path="pages/:pageId" element={<MagicboardPageEditor />} />
        </Route>
        <Route path="/magicboard/:spaceKey/:pageSlug" element={<MagicboardPathRedirect />} />
        <Route path="/workspaces" element={<WorkspaceListPage />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
