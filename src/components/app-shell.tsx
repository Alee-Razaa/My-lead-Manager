"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
const navigation = [
  "Imports",
  "Batches",
  "Qualified",
  "Ready",
  "Activity",
  "Settings",
];
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState("imports");
  useEffect(() => {
    const change = () => setActive(location.hash.slice(1) || "imports");
    change();
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span>Lead Workspace</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <a
              href={`#${item.toLowerCase()}`}
              className={active === item.toLowerCase() ? "active" : ""}
              key={item}
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>Manual pilot</span>
          <strong>AI processing is paused</strong>
          <button
            className="button"
            onClick={async () => {
              await fetch("/api/session", { method: "DELETE" });
              router.push("/login");
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <strong>From source to action</strong>
          </div>
          <div className="topbar-spacer" />
          <a className="button" href="/api/export">
            Download master Excel
          </a>
          <a href="/api/export?format=json">JSON backup</a>
        </header>
        {children}
      </main>
    </div>
  );
}
