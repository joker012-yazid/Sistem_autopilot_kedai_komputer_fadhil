"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  activeJobs,
  buildChecklistCustomerSummary,
  buildCustomerReport,
  buildPickupWhatsAppMessage,
  buildReportSummaryText,
  buildWhatsAppReportSummary,
  canAddChecklistImage,
  canApplyJobAction,
  canEditChecklistReport,
  careDeskStatuses,
  deviceLabel,
  getAssignedTechnician,
  getChecklistReportsForRole,
  getCustomer,
  getCustomerDetail,
  getCustomerSummariesForRole,
  getDevice,
  getNavigationForRole,
  getPickupQueueForRole,
  getReportRangeLabel,
  getText,
  normalizeReminderDays,
  parseReasonList,
  type CareDeskRole,
  type ChecklistImage,
  type ChecklistImageSection,
  type ChecklistReport,
  type CustomerDetail,
  type CustomerDeviceHistoryItem,
  type CustomerJobHistoryItem,
  type CustomerReport,
  type CustomerSummary,
  type Job,
  type JobStatus,
  type Language,
  type NavKey,
  type NotificationRecord,
  type PickupQueueItem,
  type PrototypeState,
  type ReportRange,
  type ReportsDashboard,
  type SettingsDraft,
  type TimelineEvent
} from "../domain/domain";

export const statusTone: Record<JobStatus, string> = {
  "NEW JOB": "status-new",
  "WAITING FADHIL REVIEW": "status-review",
  "WAITING CUSTOMER CONFIRMATION": "status-customer",
  "IN PROGRESS": "status-progress",
  "NOT PROCEED": "status-muted",
  "READY PICKUP": "status-pickup",
  UNCLAIMED: "status-danger",
  COMPLETE: "status-complete"
};

export function ReportBox({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className ? `report-box ${className}` : "report-box"}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="readonly-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function JobMiniList({ state, jobs, onOpen }: { state: PrototypeState; jobs: Job[]; onOpen: (id: string) => void }) {
  if (jobs.length === 0) {
    return <EmptyState title="No jobs in this queue" detail="Jobs that need action will appear here automatically." compact />;
  }
  return (
    <div className="job-list">
      {jobs.map((job) => (
        <article className="mini-job" key={job.id}>
          <div>
            <strong>{job.jobIdDisplay}</strong>
            <p className="job-meta">{getCustomer(state, job.customerId).name} - {deviceLabel(getDevice(state, job.deviceId))}</p>
          </div>
          <button className="text-button" type="button" onClick={() => onOpen(job.id)}>Open</button>
        </article>
      ))}
    </div>
  );
}

export function TimelineList({ events, compact }: { events: TimelineEvent[]; compact?: boolean }) {
  if (events.length === 0) {
    return <EmptyState title="No timeline events" detail="Status, diagnosis, pickup, and audit events will appear here." compact />;
  }
  return (
    <div className={compact ? "timeline compact" : "timeline"}>
      {events.map((event) => (
        <article className={event.important ? "timeline-item important" : "timeline-item"} key={event.id}>
          <strong>{event.title}</strong>
          <p>{event.detail}</p>
          <time>{event.actor} - {new Date(event.createdAt).toLocaleString()}</time>
        </article>
      ))}
    </div>
  );
}

export function EmptyState({ title, detail, compact, panel, icon }: { title: string; detail?: string; compact?: boolean; panel?: boolean; icon?: ReactNode }) {
  const className = `${panel ? "panel " : ""}empty empty-state${compact ? " compact-empty" : ""}`;
  return (
    <div className={className} role="status">
      {icon ? <div className="empty-state-icon">{icon}</div> : null}
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

export function PanelHeading({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        <p className="eyebrow">{caption}</p>
      </div>
    </div>
  );
}

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

export function StatCard({ label, value, icon, trend, color = "primary" }: { label: string; value: string | number; icon: ReactNode; trend?: string; color?: "primary" | "success" | "warning" | "danger" }) {
  const colorMap = {
    primary: { bg: "var(--panel)", accent: "var(--primary)", trend: "var(--green)" },
    success: { bg: "var(--panel)", accent: "var(--green)", trend: "var(--green)" },
    warning: { bg: "var(--panel)", accent: "var(--amber)", trend: "var(--amber)" },
    danger: { bg: "var(--panel)", accent: "var(--red)", trend: "var(--red)" },
  };
  const c = colorMap[color];
  return (
    <div className="panel" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderLeft: "3px solid " + c.accent }}>
      <div style={{ color: c.accent, display: "grid", placeItems: "center", width: "40px", height: "40px", borderRadius: "var(--radius-md)", background: "color-mix(in srgb, " + c.accent + " 12%, transparent)" }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.2, color: "var(--ink)" }}>{value}</div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--muted)", fontWeight: 500 }}>{label}</div>
      </div>
      {trend ? (
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: c.trend, display: "flex", alignItems: "center", gap: "2px" }}>
          {trend === "!" ? "⚠" : trend}
        </div>
      ) : null}
    </div>
  );
}

export function Field({ label, value, onChange, multiline, hint, error, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; hint?: string; error?: string; required?: boolean; type?: React.HTMLInputTypeAttribute }) {
  return (
    <label className={error ? "field field-error" : "field"}>
      <span>
        {label}
        {required ? <span className="required-indicator" aria-hidden="true"> *</span> : null}
      </span>
      {multiline ? <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={!!error} /> : <input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={!!error} />}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error-text">{error}</span> : null}
    </label>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className ? "skeleton " + className : "skeleton"}
      style={{
        ...style,
        background: "linear-gradient(90deg, var(--panel-soft) 25%, var(--line) 50%, var(--panel-soft) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s infinite",
        borderRadius: "var(--radius-md)",
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-text" style={{ width: i === 0 ? "60%" : i === lines - 1 ? "40%" : "80%" }} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="panel" aria-hidden="true">
      <div className="skeleton skeleton-title" />
      <SkeletonText lines={3} />
    </div>
  );
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the textarea fallback for restricted browser contexts.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
