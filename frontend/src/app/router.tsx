import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../hooks/useAuth";
import BoardSettingsPage from "../pages/BoardSettingsPage";
import CalendarPage from "../pages/CalendarPage";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";
import NavigatorPage from "../pages/NavigatorPage";
import PortalPage from "../pages/PortalPage";
import ProjectDetailPage from "../pages/ProjectDetailPage";
import ProjectListPage from "../pages/ProjectListPage";
import QueuesPage from "../pages/QueuesPage";
import RegisterPage from "../pages/RegisterPage";
import ReleasesPage from "../pages/ReleasesPage";
import ReportsPage from "../pages/ReportsPage";
import RoadmapPage from "../pages/RoadmapPage";
import SpacePageEditor from "../pages/SpacePageEditor";
import SpacesPage from "../pages/SpacesPage";
import SprintBoardPage from "../pages/SprintBoardPage";
import WorkItemDetailPage from "../pages/WorkItemDetailPage";
import WorkItemListPage from "../pages/WorkItemListPage";
import WorkboardPage from "../pages/WorkboardPage";
import WorkspaceAdminPage from "../pages/WorkspaceAdminPage";
import WorkspaceDetailPage from "../pages/WorkspaceDetailPage";
import WorkspaceListPage from "../pages/WorkspaceListPage";

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="screen-message">Loading</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="screen-message">Loading</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/portal/:projectKey" element={<PortalPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/workspaces" element={<WorkspaceListPage />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
        <Route path="/workspaces/:workspaceId/admin" element={<WorkspaceAdminPage />} />
        <Route path="/workspaces/:workspaceId/projects" element={<ProjectListPage />} />
        <Route path="/workspaces/:workspaceId/dashboards" element={<DashboardPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/work-items" element={<WorkItemListPage />} />
        <Route path="/projects/:projectId/workboard" element={<WorkboardPage />} />
        <Route path="/projects/:projectId/sprints" element={<SprintBoardPage />} />
        <Route path="/projects/:projectId/board-settings" element={<BoardSettingsPage />} />
        <Route path="/projects/:projectId/navigator" element={<NavigatorPage />} />
        <Route path="/projects/:projectId/reports" element={<ReportsPage />} />
        <Route path="/projects/:projectId/roadmap" element={<RoadmapPage />} />
        <Route path="/projects/:projectId/calendar" element={<CalendarPage />} />
        <Route path="/projects/:projectId/releases" element={<ReleasesPage />} />
        <Route path="/projects/:projectId/queues" element={<QueuesPage />} />
        <Route path="/work-items/:workItemId" element={<WorkItemDetailPage />} />
        <Route path="/navigator" element={<NavigatorPage />} />
        <Route path="/spaces" element={<SpacesPage />} />
        <Route path="/spaces/:spaceId/pages/:pageId" element={<SpacePageEditor />} />
      </Route>
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
}
