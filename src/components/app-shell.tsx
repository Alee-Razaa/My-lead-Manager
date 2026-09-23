import type { ReactNode } from "react";

const navigation = ["Imports", "Batches", "Qualified", "Ready", "Activity", "Settings"];
const stages = ["Import", "Research", "Qualify", "Enrich", "Prepare", "Ready"];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span><span>Lead Workspace</span></div>
        <nav aria-label="Main navigation">
          {navigation.map((item, index) => <a href={index === 0 ? "/" : `#${item.toLowerCase()}`} className={index === 0 ? "active" : ""} key={item}>{item}<span>{index === 0 ? "1" : ""}</span></a>)}
        </nav>
        <div className="sidebar-footer"><span>Local workspace</span><strong>Private by default</strong></div>
      </aside>
      <main>
        <header className="topbar"><div><span>Current batch</span><strong>Not started</strong></div><div><span>Selected</span><strong>0 / 10 leads</strong></div><div className="topbar-spacer" /><button className="text-button">Usage limits</button></header>
        <ol className="stage-strip" aria-label="Processing stages">{stages.map((stage, index) => <li className={index === 0 ? "current" : ""} key={stage}><span>{index + 1}</span>{stage}</li>)}</ol>
        {children}
      </main>
    </div>
  );
}
