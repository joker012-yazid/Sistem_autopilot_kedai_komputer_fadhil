"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Copy, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createCaredeskUser,
  exportCaredeskCsv,
  exportCaredeskPdf,
  loadReportsDashboard,
  loadSettingsDraft,
  resetCaredeskUserPassword,
  testCaredeskScannerSettings,
  updateCaredeskSettingsDraft,
  updateCaredeskUser,
  validateCaredeskPassword
} from "../api/caredesk-api";
import {
  activeJobs,
  buildSettingsDraft,
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
  type TimelineEvent,
  type NotificationTemplateEntry,
  type PickupReminderDay
} from "../domain/domain";
import { copyText, EmptyState, Field, MetricCard, PanelHeading, ReadOnlyValue, statusTone } from "./shared";

type CustomerDetailTab = "Profile" | "Active Jobs" | "Job History" | "Device History" | "Contact History";

export function CustomersPage({ state, role, userId, onOpen }: { state: PrototypeState; role: CareDeskRole; userId: string; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [tab, setTab] = useState<CustomerDetailTab>("Profile");
  const summaries = getCustomerSummariesForRole(state, role, userId);
  const filtered = summaries.filter((summary) => `${summary.customer.name} ${summary.customer.phone}`.toLowerCase().includes(query.toLowerCase()));
  const selectedId = filtered.some((summary) => summary.customer.id === selectedCustomerId) ? selectedCustomerId : filtered[0]?.customer.id;
  const detail = selectedId ? getCustomerDetail(state, selectedId, role, userId) : undefined;
  return (
    <div className="customer-history-layout">
      <section className="panel customer-list-panel">
        <PanelHeading title="Customers" caption="Search customer profile, active jobs, devices, and contact history." />
        <Field label="Search customer" value={query} onChange={setQuery} />
        <div className="customer-list">
          {filtered.map((summary) => (
            <CustomerSummaryCard
              summary={summary}
              selected={summary.customer.id === selectedId}
              onSelect={() => setSelectedCustomerId(summary.customer.id)}
              onOpen={onOpen}
              key={summary.customer.id}
            />
          ))}
          {filtered.length === 0 ? <EmptyState title="No customer matches this search" detail="Search by customer name or phone number." compact /> : null}
        </div>
      </section>
      <section className="panel customer-detail-panel">
        {detail ? (
          <>
            <div className="customer-detail-header">
              <div>
                <p className="eyebrow">Customer Detail</p>
                <h2>{detail.customer.name}</h2>
                <p className="job-meta">{detail.customer.phone} - {detail.customer.preferredChannel}</p>
              </div>
              <div className="badge-row">
                <span className="small-badge">{detail.summary.activeJobCount} active</span>
                <span className="small-badge">{detail.summary.totalJobCount} total jobs</span>
              </div>
            </div>
            <div className="status-filter-row">
              {(["Profile", "Active Jobs", "Job History", "Device History", "Contact History"] as CustomerDetailTab[]).map((item) => (
                <button className={tab === item ? "status-tab active" : "status-tab"} type="button" onClick={() => setTab(item)} key={item}>
                  {item}
                </button>
              ))}
            </div>
            <CustomerDetailContent detail={detail} tab={tab} onOpen={onOpen} />
          </>
        ) : (
          <EmptyState title="Select a customer" detail="Choose a customer from the list to view profile, active jobs, devices, and contact history." />
        )}
      </section>
    </div>
  );
}

export function CustomerSummaryCard({ summary, selected, onSelect, onOpen }: { summary: CustomerSummary; selected: boolean; onSelect: () => void; onOpen: (id: string) => void }) {
  const firstActiveJob = summary.activeJobs[0] ?? summary.jobs[0];
  return (
    <article className={selected ? "customer-summary-card selected" : "customer-summary-card"}>
      <button className="customer-summary-main" type="button" onClick={onSelect}>
        <span>
          <strong>{summary.customer.name}</strong>
          <small>{summary.customer.phone}</small>
        </span>
        <span className="status">{summary.activeJobCount} active</span>
      </button>
      <div className="customer-summary-meta">
        <span>{summary.totalJobCount} job history</span>
        <span>{summary.preferredChannel}</span>
        <span>Last: {summary.lastJobIdDisplay ?? "-"}</span>
      </div>
      {firstActiveJob ? (
        <button className="secondary-button compact" type="button" onClick={() => onOpen(firstActiveJob.id)}>
          Open active job
        </button>
      ) : null}
    </article>
  );
}

export function CustomerDetailContent({ detail, tab, onOpen }: { detail: CustomerDetail; tab: CustomerDetailTab; onOpen: (id: string) => void }) {
  if (tab === "Profile") {
    return (
      <div className="detail-list customer-profile-grid">
        <ReadOnlyValue label="Name" value={detail.customer.name} />
        <ReadOnlyValue label="Phone" value={detail.customer.phone} />
        <ReadOnlyValue label="Secondary contact" value={detail.customer.secondaryContact ?? "-"} />
        <ReadOnlyValue label="Preferred channel" value={detail.customer.preferredChannel} />
        <ReadOnlyValue label="Notes" value={detail.customer.notes ?? "-"} />
        <ReadOnlyValue label="Last visit" value={detail.summary.lastVisit} />
      </div>
    );
  }
  if (tab === "Active Jobs") {
    return <CustomerJobHistoryList items={detail.activeJobs} onOpen={onOpen} empty="No active jobs for this customer." />;
  }
  if (tab === "Job History") {
    return <CustomerJobHistoryList items={detail.jobHistory} onOpen={onOpen} empty="No job history for this customer." />;
  }
  if (tab === "Device History") {
    return <CustomerDeviceHistoryList items={detail.deviceHistory} onOpen={onOpen} />;
  }
  return <CustomerContactHistoryList items={detail.contactHistory} onOpen={onOpen} />;
}

export function CustomerJobHistoryList({ items, onOpen, empty }: { items: CustomerJobHistoryItem[]; onOpen: (id: string) => void; empty: string }) {
  if (items.length === 0) {
    return <EmptyState title={empty} compact />;
  }
  return (
    <div className="customer-history-grid">
      {items.map((item) => (
        <article className="job-card customer-history-card" key={item.job.id}>
          <div className="job-card-header">
            <div>
              <strong>{item.job.jobIdDisplay}</strong>
              <p className="job-meta">{deviceLabel(item.device)}</p>
            </div>
            <span className={`status ${statusTone[item.status]}`}>{item.status}</span>
          </div>
          <p>{item.job.reportedIssue}</p>
          <div className="badge-row">
            <span className="small-badge">Tech: {item.technician?.name ?? "Unassigned"}</span>
            <span className="small-badge">Last: {item.lastUpdate}</span>
            {item.posReference ? <span className="small-badge">POS: {item.posReference}</span> : null}
          </div>
          <button className="secondary-button compact" type="button" onClick={() => onOpen(item.job.id)}>Open Job</button>
        </article>
      ))}
    </div>
  );
}

export function CustomerDeviceHistoryList({ items, onOpen }: { items: CustomerDeviceHistoryItem[]; onOpen: (id: string) => void }) {
  if (items.length === 0) {
    return <EmptyState title="No device history" detail="Device history will appear after this customer has repair jobs linked to devices." compact />;
  }
  return (
    <div className="customer-history-grid">
      {items.map((item) => (
        <article className="job-card customer-history-card" key={item.device.id}>
          <div className="job-card-header">
            <div>
              <strong>{deviceLabel(item.device)}</strong>
              <p className="job-meta">{item.device.type} - Serial: {item.device.serialNumber ?? "-"}</p>
            </div>
            <span className="status">{item.issueHistory.length} jobs</span>
          </div>
          <p>Accessories: {item.device.accessories ?? "-"}</p>
          <div className="mini-history-list">
            {item.issueHistory.map((history) => (
              <button className="mini-history-row" type="button" onClick={() => onOpen(history.job.id)} key={history.job.id}>
                <span>{history.job.jobIdDisplay}</span>
                <strong>{history.job.reportedIssue}</strong>
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function CustomerContactHistoryList({ items, onOpen }: { items: CustomerDetail["contactHistory"]; onOpen: (id: string) => void }) {
  if (items.length === 0) {
    return <EmptyState title="No contact history" detail="Customer decisions and notification logs will appear here." compact />;
  }
  return (
    <div className="customer-history-grid">
      {items.map((item) => (
        <article className="job-card customer-history-card" key={item.id}>
          <div className="job-card-header">
            <div>
              <strong>{item.jobIdDisplay}</strong>
              <p className="job-meta">{item.type} - {item.channel ?? "Record"}</p>
            </div>
            {item.status ? <span className="status">{item.status}</span> : null}
          </div>
          <p>{item.detail}</p>
          <div className="badge-row">
            <span className="small-badge">{item.createdAt}</span>
            {item.result ? <span className="small-badge">{item.result}</span> : null}
          </div>
          <button className="secondary-button compact" type="button" onClick={() => onOpen(item.jobId)}>Open Job</button>
        </article>
      ))}
    </div>
  );
}

export function ReportsPage({ state, role, onReportAction }: { state: PrototypeState; role: CareDeskRole; onReportAction: (action: string, rangeLabel: string) => void }) {
  const [range, setRange] = useState<ReportRange>("all");
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<ReportsDashboard | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setReport(undefined);
    setError(undefined);
    void loadReportsDashboard(range)
      .then(setReport)
      .catch((loadError: Error) => setError(loadError.message));
  }, [range]);

  const mapDateRangeToPreset = (): ReportRange => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "today";
    if (diffDays <= 7) return "7d";
    if (diffDays <= 30) return "30d";
    return "all";
  };

  const runReport = () => {
    const nextRange = mapDateRangeToPreset();
    setRange(nextRange);
    setReport(undefined);
    setError(undefined);
    void loadReportsDashboard(nextRange)
      .then(setReport)
      .catch((loadError: Error) => setError(loadError.message));
  };

  const setQuickRange = (preset: ReportRange) => {
    const to = new Date();
    const from = new Date();
    if (preset === "today") {
      from.setDate(from.getDate());
    } else if (preset === "7d") {
      from.setDate(from.getDate() - 7);
    } else if (preset === "30d") {
      from.setDate(from.getDate() - 30);
    } else {
      from.setFullYear(2000, 0, 1);
    }
    setToDate(to.toISOString().slice(0, 10));
    setFromDate(from.toISOString().slice(0, 10));
    setRange(preset);
    setReport(undefined);
    setError(undefined);
    void loadReportsDashboard(preset)
      .then(setReport)
      .catch((loadError: Error) => setError(loadError.message));
  };

  const copySummary = async () => {
    if (!report) {
      return;
    }
    await copyText(buildReportSummaryText(report));
    onReportAction("Copy Summary", report.rangeLabel);
  };
  if (error) {
    return <EmptyState title="Reports API unavailable" detail={error} panel />;
  }
  if (!report) {
    return <EmptyState title="Loading reports" detail="Fetching reports dashboard from /caredesk/reports." panel />;
  }
  return (
    <div className="stack reports-dashboard">
      <section className="panel reports-hero-panel">
        <div className="jobs-section-header">
          <PanelHeading title="Reports Dashboard" caption="Operational repair reports for jobs, pickup, workload, and history." />
          <div className="button-row">
            {role === "owner" ? (
              <>
                <button className="primary-button" type="button" onClick={() => { void exportCaredeskCsv(range).then(() => onReportAction("Export CSV", report.rangeLabel)).catch((e: Error) => setError(e.message)); }}>Export CSV</button>
                <button className="secondary-button" type="button" onClick={() => { void exportCaredeskPdf(range).then(() => onReportAction("Export PDF", report.rangeLabel)).catch((e: Error) => setError(e.message)); }}>Export PDF</button>
              </>
            ) : null}
            <button className="secondary-button" type="button" onClick={copySummary}><Copy size={16} aria-hidden /> Copy Report Summary</button>
          </div>
        </div>
        <div className="report-date-row">
          <div className="date-field-group">
            <label className="date-field-label">From</label>
            <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="date-field-group">
            <label className="date-field-label">To</label>
            <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="primary-button" type="button" onClick={runReport}>Run report</button>
        </div>
        <div className="quick-range-row">
          {(["all", "today", "7d", "30d"] as ReportRange[]).map((item) => (
            <button
              key={item}
              type="button"
              className={range === item ? "quick-range-pill active" : "quick-range-pill"}
              onClick={() => setQuickRange(item)}
            >
              {getReportRangeLabel(item)}
            </button>
          ))}
        </div>
      </section>

      <div className="summary-row reports-summary">
        <MetricCard label="Completed jobs" value={report.counts.completed} />
        <MetricCard label="Active jobs" value={report.counts.activeJobs} />
        <MetricCard label="Ready pickup" value={report.counts.readyPickup} />
        <MetricCard label="From" value={report.rangeLabel} />
      </div>

      <div className="reports-card-grid">
        <ReportsJobSummaryCard report={report} />
        <ReportsStatusBreakdownCard report={report} />
        <ReportsTechnicianWorkloadCard report={report} />
        <ReportsPickupCard report={report} />
        <ReportsNotProceedCard report={report} />
        <ReportsCompletedHistoryCard report={report} />
      </div>

      {/* Completed Jobs Table */}
      <section className="panel">
        <PanelHeading title="Completed Jobs" caption="Completed repair history with POS references." />
        {report.completedRows.length > 0 ? (
          <div className="report-table-like">
            <div className="report-table-header">
              <span>Job</span>
              <span>Customer</span>
              <span>Status</span>
              <span>POS</span>
            </div>
            {report.completedRows.map((item) => (
              <div className="report-table-row" key={item.jobId}>
                <strong>{item.jobIdDisplay}</strong>
                <span>{item.customerName}</span>
                <span>COMPLETE</span>
                <span>{item.posReference ? "POS " + item.posReference : "No POS ref"}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No completed jobs" detail="Completed pickup history will appear here." compact />
        )}
      </section>
    </div>
  );
}
export function ReportsJobSummaryCard({ report }: { report: ReportsDashboard }) {
  return (
    <section className="panel report-dashboard-card">
      <PanelHeading title="Job Summary" caption={`${report.rangeLabel} operational job snapshot.`} />
      <div className="report-mini-grid">
        <MetricCard label="Total" value={report.counts.totalJobs} />
        <MetricCard label="Active" value={report.counts.activeJobs} />
        <MetricCard label="Completed" value={report.counts.completed} />
        <MetricCard label="Not proceed" value={report.counts.notProceed} />
      </div>
    </section>
  );
}

export function ReportsStatusBreakdownCard({ report }: { report: ReportsDashboard }) {
  return (
    <section className="panel report-dashboard-card">
      <PanelHeading title="Status Breakdown" caption="Count by locked repair status." />
      <div className="report-list">
        {report.statusBreakdown.map((item) => (
          <div className="report-row" key={item.status}>
            <span>{item.status}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReportsTechnicianWorkloadCard({ report }: { report: ReportsDashboard }) {
  return (
    <section className="panel report-dashboard-card">
      <PanelHeading title="Technician Workload" caption="Assigned, active, completed, and ready pickup average." />
      <div className="report-table-like">
        {report.technicianWorkload.map((item) => (
          <div className="report-table-row" key={item.technicianId}>
            <strong>{item.technicianName}</strong>
            <span>Assigned {item.assignedJobs}</span>
            <span>Active {item.activeJobs}</span>
            <span>Completed {item.completedJobs}</span>
            <span>Avg {item.averageReadyPickupDays}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReportsPickupCard({ report }: { report: ReportsDashboard }) {
  return (
    <section className="panel report-dashboard-card">
      <PanelHeading title="Pickup Report" caption="Ready pickup, reminders, follow-up, and unclaimed." />
      <div className="report-mini-grid">
        <MetricCard label="Ready pickup" value={report.pickup.readyPickup} />
        <MetricCard label="Reminder sent" value={report.pickup.remindersSent} />
        <MetricCard label="Need follow-up" value={report.pickup.needFollowUp} />
        <MetricCard label="Unclaimed" value={report.pickup.unclaimed} />
      </div>
    </section>
  );
}

export function ReportsNotProceedCard({ report }: { report: ReportsDashboard }) {
  return (
    <section className="panel report-dashboard-card">
      <PanelHeading title="Not Proceed Report" caption="Customer decision reasons and method." />
      <div className="report-table-like">
        {report.notProceedRows.map((item) => (
          <div className="report-table-row" key={item.jobId}>
            <strong>{item.jobIdDisplay}</strong>
            <span>{item.customerName}</span>
            <span>{item.deviceType}</span>
            <span>{item.reason}</span>
            <span>{item.method}</span>
          </div>
        ))}
        {report.notProceedRows.length === 0 ? <EmptyState title="No not proceed jobs" detail="Change the report range to review older decisions." compact /> : null}
      </div>
    </section>
  );
}

export function ReportsCompletedHistoryCard({ report }: { report: ReportsDashboard }) {
  return (
    <section className="panel report-dashboard-card">
      <PanelHeading title="Completed Job History" caption="Completed repair history with optional POS reference." />
      <div className="report-table-like">
        {report.completedRows.map((item) => (
          <div className="report-table-row" key={item.jobId}>
            <strong>{item.jobIdDisplay}</strong>
            <span>{item.customerName}</span>
            <span>{item.deviceLabel}</span>
            <span>{item.technicianName}</span>
            <span>{item.completedDate}</span>
            <span>{item.posReference ? "POS " + item.posReference : "No POS ref"}</span>
          </div>
        ))}
        {report.completedRows.length === 0 ? <EmptyState title="No completed jobs" detail="Completed pickup history will appear here." compact /> : null}
      </div>
    </section>
  );
}

export function SettingsPage({ state, onRefresh }: { state: PrototypeState; onRefresh: () => Promise<PrototypeState>; language: Language }) {
  const [draft, setDraft] = useState<SettingsDraft>(() => buildSettingsDraft(state));
  const [reminderDays, setReminderDays] = useState(draft.flowRules.reminderDays.join(", "));
  const [notProceedReasons, setNotProceedReasons] = useState(draft.flowRules.notProceedReasons.join("\n"));
  const [releaseReasons, setReleaseReasons] = useState(draft.flowRules.releaseReasons.join("\n"));
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "technician" as CareDeskRole, password: "" });
  const [userDrafts, setUserDrafts] = useState<Record<string, { name: string; email: string; role: CareDeskRole; status: string }>>({});
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [userNotice, setUserNotice] = useState<string | undefined>();
  const [scannerNotice, setScannerNotice] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    void loadSettingsDraft()
      .then((next) => {
        applyDraftToForm(next);
        setError(undefined);
      })
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  useEffect(() => {
    setUserDrafts(
      Object.fromEntries(
        state.users.map((item) => [
          item.id,
          { name: item.name, email: item.email ?? "", role: item.role, status: item.status ?? "active" }
        ])
      )
    );
  }, [state.users]);

  const applyDraftToForm = (next: SettingsDraft) => {
    setDraft(next);
    setReminderDays(next.flowRules.reminderDays.join(", "));
    setNotProceedReasons(next.flowRules.notProceedReasons.join("\n"));
    setReleaseReasons(next.flowRules.releaseReasons.join("\n"));
    setSaved(false);
  };

  const resetDraft = () => {
    void loadSettingsDraft()
      .then((next) => {
        applyDraftToForm(next);
        setError(undefined);
      })
      .catch((loadError: Error) => setError(loadError.message));
  };

  const saveSettings = () => {
    const nextDraft: SettingsDraft = {
      ...draft,
      flowRules: {
        ...draft.flowRules,
        reminderDays: normalizeReminderDays(reminderDays.split(",").map((item) => Number(item.trim()))),
        notProceedReasons: parseReasonList(notProceedReasons),
        releaseReasons: parseReasonList(releaseReasons)
      }
    };
    void updateCaredeskSettingsDraft(nextDraft)
      .then(() => onRefresh())
      .then(() => loadSettingsDraft())
      .then((freshDraft) => {
        applyDraftToForm(freshDraft);
        setSaved(true);
        setError(undefined);
      })
      .catch((saveError: Error) => setError(saveError.message));
  };

  const createUser = () => {
    setUserNotice(undefined);
    setError(undefined);
    const passwordCheck = validateCaredeskPassword(newUser.password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }
    void createCaredeskUser(newUser)
      .then(() => onRefresh())
      .then(() => {
        setNewUser({ name: "", email: "", role: "technician", password: "" });
        setUserNotice("User account created.");
      })
      .catch((createError: Error) => setError(createError.message));
  };

  const saveUser = (userId: string) => {
    const next = userDrafts[userId];
    if (!next) {
      return;
    }
    setUserNotice(undefined);
    setError(undefined);
    void updateCaredeskUser(userId, next)
      .then(() => onRefresh())
      .then(() => setUserNotice("User account updated."))
      .catch((updateError: Error) => setError(updateError.message));
  };

  const setUserStatus = (userId: string, status: string) => {
    setUserNotice(undefined);
    setError(undefined);
    void updateCaredeskUser(userId, { status })
      .then(() => onRefresh())
      .then(() => setUserNotice(status === "active" ? "User account reactivated." : "User account disabled."))
      .catch((updateError: Error) => setError(updateError.message));
  };

  const testScanner = () => {
    setScannerNotice(undefined);
    setError(undefined);
    void testCaredeskScannerSettings({ model: draft.scannerSettings.model, apiKey: draft.scannerSettings.apiKey })
      .then((result) => setScannerNotice(`Scanner config OK for ${result.model}.`))
      .catch((testError: Error) => setError(testError.message));
  };

  const resetPassword = (userId: string) => {
    const password = resetPasswords[userId] ?? "";
    const passwordCheck = validateCaredeskPassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }
    setUserNotice(undefined);
    setError(undefined);
    void resetCaredeskUserPassword(userId, password)
      .then(() => onRefresh())
      .then(() => {
        setResetPasswords({ ...resetPasswords, [userId]: "" });
        setUserNotice("Password reset saved.");
      })
      .catch((resetError: Error) => setError(resetError.message));
  };

  return (
    <div className="stack settings-center">
      <section className="panel settings-hero-panel">
        <div className="jobs-section-header">
          <PanelHeading title="Settings Center" caption="Owner-only operating settings and locked flow rules." />
          <div className="button-row">
            <button className="primary-button" type="button" onClick={saveSettings}>Save Settings</button>
            <button className="secondary-button" type="button" onClick={resetDraft}>Reset Draft</button>
          </div>
        </div>
        {saved ? <p className="notice">Settings saved to CareDesk API.</p> : null}
        {error ? <p className="notice recovery-notice">{error}</p> : null}
      </section>

      <div className="settings-stacked-layout">
        <section className="panel settings-card">
          <PanelHeading title="Shop & Identity" caption="Display information for prototype documents and UI." />
          <div className="settings-form-grid">
            <Field label="Shop name" value={draft.shopInfo.name} onChange={(value) => setDraft({ ...draft, shopInfo: { ...draft.shopInfo, name: value } })} />
            <Field label="Subtitle" value={draft.shopInfo.subtitle} onChange={(value) => setDraft({ ...draft, shopInfo: { ...draft.shopInfo, subtitle: value } })} />
            <Field label="Phone" value={draft.shopInfo.phone ?? ""} onChange={(value) => setDraft({ ...draft, shopInfo: { ...draft.shopInfo, phone: value } })} />
            <Field label="Address" value={draft.shopInfo.address ?? ""} onChange={(value) => setDraft({ ...draft, shopInfo: { ...draft.shopInfo, address: value } })} />
          </div>
        </section>

                <section className="panel settings-card">
          <PanelHeading title="Users & Roles" caption="Owner account management for CareDesk production auth." />
          {userNotice ? <p className="notice">{userNotice}</p> : null}

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600 }}>Add New User</h3>
            <div className="settings-form-grid">
              <Field label="Name" value={newUser.name} onChange={(value) => setNewUser({ ...newUser, name: value })} />
              <Field label="Email" value={newUser.email} onChange={(value) => setNewUser({ ...newUser, email: value })} />
              <label className="field">
                <span>Role</span>
                <select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as CareDeskRole })}>
                  <option value="technician">Technician</option>
                  <option value="owner">Owner/Fadhil</option>
                </select>
              </label>
              <Field label="Temporary password" value={newUser.password} onChange={(value) => setNewUser({ ...newUser, password: value })} />
            </div>
            <button className="secondary-button compact" type="button" onClick={createUser} style={{ marginTop: 8 }}>Create User</button>
          </div>

          <div>
            <h3 style={{ margin: "16px 0 10px", fontSize: 15, fontWeight: 600 }}>Existing Users</h3>
            <div className="settings-user-list">
              {state.users.map((item) => {
                const ownerCount = state.users.filter((u) => u.role === "owner").length;
                const isLastOwner = item.role === "owner" && ownerCount === 1;
                return (
                  <div className="settings-user-row" key={item.id}>
                    <div className="settings-form-grid">
                      <Field
                        label="Name"
                        value={userDrafts[item.id]?.name ?? item.name}
                        onChange={(value) => setUserDrafts({ ...userDrafts, [item.id]: { ...(userDrafts[item.id] ?? { email: "", role: item.role, status: "active" }), name: value } })}
                      />
                      <Field
                        label="Email"
                        value={userDrafts[item.id]?.email ?? item.email ?? ""}
                        onChange={(value) => setUserDrafts({ ...userDrafts, [item.id]: { ...(userDrafts[item.id] ?? { name: item.name, role: item.role, status: "active" }), email: value } })}
                      />
                      <label className="field">
                        <span>Role</span>
                        <select
                          value={userDrafts[item.id]?.role ?? item.role}
                          onChange={(event) => setUserDrafts({ ...userDrafts, [item.id]: { ...(userDrafts[item.id] ?? { name: item.name, email: item.email ?? "", status: "active" }), role: event.target.value as CareDeskRole } })}
                        >
                          <option value="owner">Owner/Fadhil</option>
                          <option value="technician">Technician</option>
                        </select>
                      </label>
                      <ReadOnlyValue label="Status" value={item.status ?? "active"} />
                    </div>
                    <div className="button-row">
                      <button className="secondary-button compact" type="button" onClick={() => saveUser(item.id)}>Save User</button>
                      <button className="secondary-button compact" type="button" onClick={() => setUserStatus(item.id, item.status === "disabled" ? "active" : "disabled")}>
                        {item.status === "disabled" ? "Reactivate" : "Disable"}
                      </button>
                    </div>
                    <div className="settings-form-grid">
                      <Field
                        label="New password"
                        value={resetPasswords[item.id] ?? ""}
                        onChange={(value) => setResetPasswords({ ...resetPasswords, [item.id]: value })}
                      />
                      <button className="secondary-button compact" type="button" onClick={() => resetPassword(item.id)}>Reset Password</button>
                    </div>
                  </div>
                );
              })}
              {state.users.length === 0 ? <EmptyState title="No users loaded" detail="User accounts will appear after the API session loads Owner settings." compact /> : null}
            </div>
          </div>
        </section><section className="panel settings-card">
          <PanelHeading title="Language & POS Reference" caption="Operation defaults; POS reference is only a label config." />
          <div className="settings-form-grid">
            <label className="field">
              <span>Default language</span>
              <select value={draft.defaultLanguage} onChange={(event) => setDraft({ ...draft, defaultLanguage: event.target.value as Language })}>
                <option value="bm">BM</option>
                <option value="en">EN</option>
              </select>
            </label>
            <Field label="POS reference label" value={draft.posReferenceLabel} onChange={(value) => setDraft({ ...draft, posReferenceLabel: value })} />
          </div>
        </section>

        <section className="panel settings-card">
          <PanelHeading title="Scanner AI" caption="Owner-controlled OpenAI scanner for service note images and PDFs." />
          <div className="settings-form-grid">
            <label className="check-row">
              <input
                type="checkbox"
                checked={draft.scannerSettings.enabled}
                onChange={(event) => setDraft({ ...draft, scannerSettings: { ...draft.scannerSettings, enabled: event.target.checked } })}
              />
              Enable service note scanner
            </label>
            <label className="field">
              <span>OpenAI model</span>
              <select
                value={draft.scannerSettings.model}
                onChange={(event) => setDraft({ ...draft, scannerSettings: { ...draft.scannerSettings, model: event.target.value } })}
              >
                <option value="gpt-5.5">gpt-5.5</option>
                <option value="gpt-5.4">gpt-5.4</option>
                <option value="gpt-5.4-mini">gpt-5.4-mini</option>
                <option value="gpt-5.4-nano">gpt-5.4-nano</option>
                <option value="gpt-5.1">gpt-5.1</option>
              </select>
            </label>
            <Field
              label={draft.scannerSettings.apiKeyConfigured ? `OpenAI API key (${draft.scannerSettings.apiKeyMasked ?? "configured"})` : "OpenAI API key"}
              value={draft.scannerSettings.apiKey ?? ""}
              onChange={(value) => setDraft({ ...draft, scannerSettings: { ...draft.scannerSettings, apiKey: value } })}
              hint={draft.scannerSettings.apiKeyConfigured ? "Leave blank to keep the saved key." : "Saved encrypted on the API server."}
              type="password"
            />
            <Field
              label="Max upload MB"
              value={String(Math.round(draft.scannerSettings.maxUploadBytes / 1024 / 1024))}
              onChange={(value) => setDraft({ ...draft, scannerSettings: { ...draft.scannerSettings, maxUploadBytes: (Number(value) || 10) * 1024 * 1024 } })}
            />
          </div>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button className="secondary-button compact" type="button" onClick={testScanner}>
              Test scanner config
            </button>
            {scannerNotice ? <span className="notice">{scannerNotice}</span> : null}
          </div>
        </section>

        <section className="panel settings-card">
          <PanelHeading title="Notification Templates" caption="Editable BM/EN templates for each pickup reminder stage." />
          {[0, 7, 14, 30, 60].map((day) => {
            const bm = draft.notificationTemplates.find((t) => t.stageDay === day && t.language === "bm");
            const en = draft.notificationTemplates.find((t) => t.stageDay === day && t.language === "en");
            const preview = (template?: string) =>
              (template ?? "")
                .replace(/{{customerName}}/g, "Ahmad")
                .replace(/{{jobIdDisplay}}/g, "NO.0001")
                .replace(/{{stageDay}}/g, String(day));
            const updateTemplate = (
              stageDay: PickupReminderDay,
              language: "bm" | "en",
              messageTemplate: string
            ) => {
              const next = [...draft.notificationTemplates];
              const idx = next.findIndex((t) => t.stageDay === stageDay && t.language === language);
              if (idx >= 0) {
                next[idx] = { ...next[idx], messageTemplate };
              } else {
                next.push({ stageDay, channel: "WhatsApp", messageTemplate, language });
              }
              setDraft({ ...draft, notificationTemplates: next });
            };
            return (
              <div key={day} className="settings-template-card" style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 6 }}>
                <h4 style={{ margin: "0 0 8px" }}>Day {day}</h4>
                <Field label="BM template" value={bm?.messageTemplate ?? ""} onChange={(value) => updateTemplate(day as PickupReminderDay, "bm", value)} multiline />
                <Field label="EN template" value={en?.messageTemplate ?? ""} onChange={(value) => updateTemplate(day as PickupReminderDay, "en", value)} multiline />
                <div className="template-preview" style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                  <div><strong>Preview BM:</strong> {preview(bm?.messageTemplate)}</div>
                  <div><strong>Preview EN:</strong> {preview(en?.messageTemplate)}</div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="panel settings-card">
          <PanelHeading title="Upload Rules" caption="Prototype upload constraints for evidence and checklist report." />
          <Field label="Evidence max images" value={String(draft.uploadRules.evidenceMaxImages)} onChange={(value) => setDraft({ ...draft, uploadRules: { ...draft.uploadRules, evidenceMaxImages: Number(value) || 1 } })} />
          <label className="check-row"><input type="checkbox" checked={draft.uploadRules.allowImageUpload} onChange={(event) => setDraft({ ...draft, uploadRules: { ...draft.uploadRules, allowImageUpload: event.target.checked } })} /> Allow image upload</label>
          <label className="check-row"><input type="checkbox" checked={draft.uploadRules.allowPdfUpload} onChange={(event) => setDraft({ ...draft, uploadRules: { ...draft.uploadRules, allowPdfUpload: event.target.checked } })} /> Allow PDF upload</label>
        </section>

        <section className="panel settings-card settings-flow-card">
          <PanelHeading title="Flow Rules" caption="Editable operational rules; core sequence remains locked." />
          <div className="settings-form-grid">
            <Field label="Reminder days" value={reminderDays} onChange={setReminderDays} error={reminderDays.split(",").map((item) => Number(item.trim())).filter((n) => !isNaN(n)).some((d) => ![0, 7, 14, 30, 60].includes(d)) ? "Reminder days must be from: 0, 7, 14, 30, 60" : undefined} hint="Comma-separated reminder days: 0, 7, 14, 30, 60" />
            <Field label="Day 90 unclaimed" value={String(draft.flowRules.unclaimedDay)} onChange={(value) => setDraft({ ...draft, flowRules: { ...draft.flowRules, unclaimedDay: Number(value) || 90 } })} />
            <Field label="Retention days (0 = disabled)" value={String(draft.flowRules.retentionDays)} onChange={(value) => setDraft({ ...draft, flowRules: { ...draft.flowRules, retentionDays: Number(value) || 365 } })} />
            {Object.entries(draft.flowRules.stuckThresholds).map(([status, value]) => (
              <Field
                label={`Stuck threshold: ${status}`}
                value={value}
                onChange={(nextValue) => setDraft({
                  ...draft,
                  flowRules: {
                    ...draft.flowRules,
                    stuckThresholds: {
                      ...draft.flowRules.stuckThresholds,
                      [status as keyof SettingsDraft["flowRules"]["stuckThresholds"]]: nextValue
                    }
                  }
                })}
                key={status}
              />
            ))}
          </div>
          <div className="settings-form-grid">
            <label className="field">
              <span>Diagnosis evidence</span>
              <select value={draft.flowRules.requiredEvidence.diagnosis} onChange={(event) => setDraft({ ...draft, flowRules: { ...draft.flowRules, requiredEvidence: { ...draft.flowRules.requiredEvidence, diagnosis: event.target.value as SettingsDraft["flowRules"]["requiredEvidence"]["diagnosis"] } } })}>
                <option value="note">Note only</option>
                <option value="note_and_photo">Note + photo</option>
              </select>
            </label>
            <label className="field">
              <span>Ready pickup evidence</span>
              <select value={draft.flowRules.requiredEvidence.readyPickup} onChange={(event) => setDraft({ ...draft, flowRules: { ...draft.flowRules, requiredEvidence: { ...draft.flowRules.requiredEvidence, readyPickup: event.target.value as SettingsDraft["flowRules"]["requiredEvidence"]["readyPickup"] } } })}>
                <option value="testing_note_optional">Testing note optional</option>
                <option value="testing_note_required">Testing note required</option>
              </select>
            </label>
            <label className="field">
              <span>Complete pickup evidence</span>
              <select value={draft.flowRules.requiredEvidence.completePickup} onChange={(event) => setDraft({ ...draft, flowRules: { ...draft.flowRules, requiredEvidence: { ...draft.flowRules.requiredEvidence, completePickup: event.target.value as SettingsDraft["flowRules"]["requiredEvidence"]["completePickup"] } } })}>
                <option value="pickup_note_optional">Pickup note optional</option>
                <option value="pickup_note_required">Pickup note required</option>
              </select>
            </label>
          </div>
          <Field label="Not Proceed reasons" value={notProceedReasons} onChange={setNotProceedReasons} multiline />
          <Field label="Release Job reasons" value={releaseReasons} onChange={setReleaseReasons} multiline />
        </section>

        <section className="panel settings-card settings-locked-card">
          <PanelHeading title="Locked Rules" caption="Read-only rules that protect the repair workflow." />
          <div className="settings-status-sequence">
            {careDeskStatuses.map((status) => <span className="small-badge" key={status}>{status}</span>)}
          </div>
          {draft.flowRules.lockedRules.map((rule) => (
            <div className="locked-rule" key={rule}><Lock size={15} aria-hidden /> {rule}</div>
          ))}
        </section>
      </div>
    </div>
  );
}
