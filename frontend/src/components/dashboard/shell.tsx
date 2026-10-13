"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createContext, useState } from "react";
import {
  Activity,
  CircleDot,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { signOut } from "@/lib/auth/actions";
import type { Session } from "@/lib/auth/types";
import { sampleIncident, type IncidentReport } from "@/lib/incidents";
export const IncidentContext = createContext<{
  report: IncidentReport | null;
  setReport: (report: IncidentReport) => void;
  decision: "approve" | "reject" | null;
  setDecision: (decision: "approve" | "reject" | null) => void;
}>({
  report: null,
  setReport: () => {},
  decision: null,
  setDecision: () => {},
});
const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/investigations", label: "Incidents", icon: CircleDot },
  { href: "/dashboard/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/integrations", label: "Connections", icon: Plug },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [report, setReport] = useState<IncidentReport | null>(
    session.workspace.source === "demo" ? sampleIncident : null,
  );
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [open, setOpen] = useState(false);
  const title = links.find((l) => l.href === pathname)?.label ?? "Workspace";
  return (
    <IncidentContext.Provider
      value={{
        report,
        decision,
        setDecision,
        setReport: (next) => {
          setReport(next);
          setDecision(null);
        },
      }}
    >
      <div className="app-shell">
        <aside className="app-sidebar">
          <Brand />
          <div className="workspace-switch">
            <span className="workspace-avatar">
              {session.workspace.name[0].toUpperCase()}
            </span>
            <div>
              <strong>{session.workspace.name}</strong>
              <small>Your workspace</small>
            </div>
          </div>
          <button
            className="app-mobile-toggle icon-button"
            aria-expanded={open}
            aria-controls="workspace-nav"
            aria-label={
              open ? "Close workspace navigation" : "Open workspace navigation"
            }
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            id="workspace-nav"
            aria-label="Workspace navigation"
            className={open ? "is-open" : ""}
          >
            <span className="nav-caption">WORKSPACE</span>
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-guide">
            <ShieldCheck size={20} />
            <strong>Human control, by design.</strong>
            <p>Every repair requires an explicit decision.</p>
            <a href="/docs">Read the safety model →</a>
          </div>
          <div className="sidebar-user">
            <span className="workspace-avatar">
              {session.user.name[0].toUpperCase()}
            </span>
            <div>
              <strong>{session.user.name}</strong>
              <small>
                {session.mode === "demo" ? "Sample session" : "Signed in"}
              </small>
            </div>
            <form action={signOut}>
              <button className="icon-button" aria-label="Sign out">
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </aside>
        <div className="app-body">
          <header className="app-topbar">
            <span>
              Workspace <span>/</span> <strong>{title}</strong>
            </span>
            <a href="/docs">
              <Activity size={14} /> neatHack 2026 prototype
            </a>
          </header>
          <main id="main" className="dashboard-main">
            {children}
          </main>
        </div>
      </div>
    </IncidentContext.Provider>
  );
}
