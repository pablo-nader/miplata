import type { ReactNode } from "react";
import "./app-shell.css";

type AppShellProps = {
  sidebar: ReactNode;
  tabBar: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, tabBar, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__sidebar">{sidebar}</div>
      <main className="app-shell__main">{children}</main>
      <div className="app-shell__tabs">{tabBar}</div>
    </div>
  );
}
