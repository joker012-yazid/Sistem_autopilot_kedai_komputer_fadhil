"use client";

import { Bell, CheckCircle2, ClipboardCheck, ClipboardList, FileSearch, LayoutDashboard, ListChecks, Lock, RotateCcw, Settings, Upload, Users } from "lucide-react";
import Link from "next/link";
import { CAREDESK_API_BASE_URL } from "../api/caredesk-api";
import { getText, type CareDeskRole, type Language, type NavKey } from "../domain/domain";
import { EmptyState } from "./shared";

export type PrototypePage = "dashboard" | "jobs" | "scan" | "my-jobs" | "review" | "checklist-reports" | "pickup" | "notifications" | "customers" | "reports" | "settings" | "job-detail";

export const icons: Record<NavKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  jobs: FileSearch,
  scanJob: Upload,
  myJobs: ListChecks,
  review: ClipboardCheck,
  checklistReports: ClipboardList,
  pickup: CheckCircle2,
  notifications: Bell,
  customers: Users,
  reports: ClipboardList,
  settings: Settings
};

export function Brand({ language }: { language: Language }) {
  return (
    <Link className="brand" href="/dashboard">
      <div className="brand-mark">FC</div>
      <div>
        <div>{getText(language, "appName")}</div>
        <div className="job-meta">{getText(language, "subtitle")}</div>
      </div>
    </Link>
  );
}

export function PrototypeLoadingShell({ language }: { language: Language }) {
  return (
    <div className="caredesk-shell prototype-loading-shell">
      <aside className="caredesk-sidebar">
        <Brand language={language} />
      </aside>
      <main className="caredesk-main">
        <div className="stack" style={{ maxWidth: "720px", margin: "0 auto", width: "100%" }}>
          {/* Skeleton topbar */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px" }}>
            <div style={{ width: "200px", height: "20px", borderRadius: "var(--radius-md)", background: "var(--panel-soft)" }} />
            <div style={{ marginLeft: "auto", width: "120px", height: "36px", borderRadius: "var(--radius-md)", background: "var(--panel-soft)" }} />
          </div>
          {/* Skeleton stats */}
          <div className="summary-row">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="panel" style={{ height: "80px", borderRadius: "var(--radius-md)", background: "var(--panel-soft)" }} />
            ))}
          </div>
          {/* Skeleton panels */}
          <div className="dashboard-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="panel" style={{ height: "180px", borderRadius: "var(--radius-md)", background: "var(--panel-soft)" }} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export function ApiErrorShell({
  language,
  error,
  onRetry
}: {
  language: Language;
  error?: string;
  onRetry: () => void;
}) {
  return (
    <div className="caredesk-shell prototype-loading-shell">
      <aside className="caredesk-sidebar">
        <Brand language={language} />
      </aside>
      <main className="caredesk-main">
        <header className="caredesk-topbar">
          <div>
            <p className="eyebrow">API-first mode</p>
            <h1>{language === "bm" ? "CareDesk API tidak dapat dihubungi" : "CareDesk API is unavailable"}</h1>
            <p className="subtle">{CAREDESK_API_BASE_URL}</p>
          </div>
          <div className="topbar-actions">
            <button className="primary-button compact" type="button" onClick={onRetry}>
              <RotateCcw size={16} aria-hidden />
              Retry
            </button>
          </div>
        </header>
        <section className="panel empty empty-state api-error-state" role="alert">
          <Lock size={28} aria-hidden />
          <strong>{language === "bm" ? "Backend /caredesk perlu hidup untuk guna app ini." : "The /caredesk backend must be running to use this app."}</strong>
          <p>{error ?? "Request failed."}</p>
          <p className="job-meta">Local/mock data tidak digunakan dalam API-first mode.</p>
        </section>
      </main>
    </div>
  );
}

export function AccessRestricted({ language }: { language: Language }) {
  return (
    <EmptyState
      title={language === "bm" ? "Akses terhad" : "Access restricted"}
      detail={language === "bm" ? "Module ini hanya tersedia untuk Owner/Fadhil." : "This module is only available to Owner/Fadhil."}
      icon={<Lock size={28} aria-hidden />}
      panel
    />
  );
}

export function pageTitleFor(page: PrototypePage, language: Language): string {
  const titleByPage: Record<PrototypePage, string> = {
    dashboard: getText(language, "dashboard"),
    jobs: getText(language, "jobs"),
    scan: getText(language, "scanJob"),
    "my-jobs": getText(language, "myJobs"),
    review: getText(language, "review"),
    "checklist-reports": getText(language, "checklistReports"),
    pickup: getText(language, "pickup"),
    notifications: getText(language, "notifications"),
    customers: getText(language, "customers"),
    reports: getText(language, "reports"),
    settings: getText(language, "settings"),
    "job-detail": "Job Detail"
  };
  return titleByPage[page];
}

export function isRestricted(page: PrototypePage, role: CareDeskRole): boolean {
  return role === "technician" && ["dashboard", "review", "customers", "settings"].includes(page);
}
