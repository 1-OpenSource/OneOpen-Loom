import type { ReactNode } from "react";
import Topbar from "./Topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell mb-shell">
      <Topbar />
      <main className="page-shell mb-page-shell">
        <div className="page mb-page">{children}</div>
      </main>
    </div>
  );
}
