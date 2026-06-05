"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { MessageCircle } from "lucide-react";
import { useState } from "react";
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
import { copyText, EmptyState, MetricCard, PanelHeading, statusTone } from "./shared";

type PickupFilter = "All" | "Due Today" | "Need Follow-Up" | "Day 60" | "Unclaimed";
type NotificationFilter = "Pending" | "Sent" | "Failed" | "Need follow-up";

export function PickupPage({
  state,
  role,
  userId,
  onOpen,
  onMarkUnclaimed,
  onContact,
  onComplete
}: {
  state: PrototypeState;
  role: CareDeskRole;
  userId: string;
  language: Language;
  onOpen: (id: string) => void;
  onMarkUnclaimed: (job: Job) => void;
  onContact: (job: Job, result: NonNullable<NotificationRecord["result"]>, method?: string, note?: string) => void;
  onComplete: (job: Job, note: string) => void;
}) {
  const [filter, setFilter] = useState<PickupFilter>("All");
  const queue = getPickupQueueForRole(state, role, userId, new Date());
  const filtered = queue.filter((item) => {
    if (filter === "Due Today") {
      return item.nextReminder.dueToday && !item.stage.unclaimedEligible;
    }
    if (filter === "Need Follow-Up") {
      return item.nextReminder.needsFollowUp;
    }
    if (filter === "Day 60") {
      return item.stage.stageDay === 60 && !item.stage.unclaimedEligible;
    }
    if (filter === "Unclaimed") {
      return item.stage.unclaimedEligible || item.job.status === "UNCLAIMED";
    }
    return true;
  });
  const summary = {
    readyPickup: queue.filter((item) => item.job.status === "READY PICKUP").length,
    dueToday: queue.filter((item) => item.nextReminder.dueToday && !item.stage.unclaimedEligible).length,
    needFollowUp: queue.filter((item) => item.nextReminder.needsFollowUp).length,
    day60: queue.filter((item) => item.stage.stageDay === 60 && !item.stage.unclaimedEligible).length,
    unclaimedEligible: queue.filter((item) => item.stage.unclaimedEligible || item.job.status === "UNCLAIMED").length
  };
  return (
    <div className="stack pickup-command-center">
      <div className="summary-row pickup-summary">
        <MetricCard label="Ready pickup" value={summary.readyPickup} />
        <MetricCard label="Due today" value={summary.dueToday} />
        <MetricCard label="Need follow-up" value={summary.needFollowUp} />
        <MetricCard label="Day 60" value={summary.day60} />
        <MetricCard label="Unclaimed eligible" value={summary.unclaimedEligible} />
      </div>
      <section className="panel">
        <div className="jobs-section-header">
          <PanelHeading title="Pickup Command Center" caption="Auto stage from ready pickup date. WhatsApp remains manual copy/send." />
        </div>
        <div className="status-filter-row">
          {(["All", "Due Today", "Need Follow-Up", "Day 60", "Unclaimed"] as PickupFilter[]).map((item) => (
            <button className={filter === item ? "status-tab active" : "status-tab"} type="button" onClick={() => setFilter(item)} key={item}>
              {item}
            </button>
          ))}
        </div>
        <div className="pickup-card-grid">
          {filtered.map((item) => (
            <PickupQueueCard
              item={item}
              role={role}
              state={state}
              onOpen={onOpen}
              onContact={onContact}
              onComplete={onComplete}
              onMarkUnclaimed={onMarkUnclaimed}
              key={item.job.id}
            />
          ))}
          {filtered.length === 0 ? <EmptyState title="No pickup jobs in this filter" detail="Pickup reminders will appear here once a job is marked ready pickup." compact /> : null}
        </div>
      </section>
    </div>
  );
}

export function PickupQueueCard({
  item,
  role,
  state,
  onOpen,
  onContact,
  onComplete,
  onMarkUnclaimed
}: {
  item: PickupQueueItem;
  role: CareDeskRole;
  state: PrototypeState;
  onOpen: (id: string) => void;
  onContact: (job: Job, result: NonNullable<NotificationRecord["result"]>, method?: string, note?: string) => void;
  onComplete: (job: Job, note: string) => void;
  onMarkUnclaimed: (job: Job) => void;
}) {
  const message = buildPickupWhatsAppMessage(state, item.job, item.nextReminder.stageDay);
  return (
    <article className={item.stage.unclaimedEligible ? "job-card pickup-card urgent" : "job-card pickup-card"}>
      <div className="job-card-header">
        <div>
          <strong>{item.job.jobIdDisplay}</strong>
          <p className="job-meta">{item.customer.name} - {item.customer.phone}</p>
        </div>
        <span className={`status ${statusTone[item.job.status]}`}>{item.job.status}</span>
      </div>
      <div className="job-card-body">
        <div><span>Device</span><strong>{deviceLabel(item.device)}</strong></div>
        <div><span>Technician</span><strong>{item.technician?.name ?? "Unassigned"}</strong></div>
        <div><span>Ready date</span><strong>{item.job.readyPickupDate ?? "-"}</strong></div>
        <div><span>Current stage</span><strong>{item.stage.label} ({item.stage.ageDays} days)</strong></div>
      </div>
      <p className="job-next-action">{item.nextReminder.nextAction}</p>
      <div className="badge-row">
        <span className="small-badge">{item.nextReminder.status}</span>
        {item.nextReminder.needsFollowUp ? <span className="small-badge danger-badge">Need follow-up</span> : null}
        {item.stage.unclaimedEligible ? <span className="small-badge danger-badge">Day 90 eligible</span> : null}
      </div>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={() => copyText(message)}>
          <MessageCircle size={16} aria-hidden /> Copy WhatsApp Message
        </button>
        <button className="secondary-button" type="button" onClick={() => onContact(item.job, "sent successfully")}>Mark Contacted</button>
        <button className="secondary-button" type="button" onClick={() => onContact(item.job, "no response")}>No Response</button>
        <button className="secondary-button" type="button" onClick={() => onOpen(item.job.id)}>Open Job</button>
        {item.job.status === "READY PICKUP" ? <button className="primary-button" type="button" onClick={() => onComplete(item.job, "Pickup completed from Pickup Command Center.")}>Complete Pickup</button> : null}
        {role === "owner" && item.stage.unclaimedEligible && item.job.status !== "UNCLAIMED" ? (
          <button className="secondary-button danger" type="button" onClick={() => onMarkUnclaimed(item.job)}>Mark Unclaimed</button>
        ) : null}
      </div>
    </article>
  );
}


function PickupContactForm({
  item,
  message,
  role,
  onOpen,
  onContact,
  onComplete,
  onMarkUnclaimed
}: {
  item: PickupQueueItem;
  message: string;
  role: CareDeskRole;
  onOpen: (id: string) => void;
  onContact: (job: Job, result: NonNullable<NotificationRecord["result"]>, method?: string, note?: string) => void;
  onComplete: (job: Job, note: string) => void;
  onMarkUnclaimed: (job: Job) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<"sent successfully" | "no response">("sent successfully");
  const [method, setMethod] = useState("WhatsApp");
  const [note, setNote] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onContact(item.job, result, method, note);
    setShowForm(false);
    setNote("");
  };

  return (
    <div className="button-row">
      <button className="secondary-button" type="button" onClick={() => copyText(message)}>
        <MessageCircle size={16} aria-hidden /> Copy WhatsApp Message
      </button>
      <button className="secondary-button" type="button" onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancel" : "Record Contact"}
      </button>
      <button className="secondary-button" type="button" onClick={() => onOpen(item.job.id)}>Open Job</button>
      {item.job.status === "READY PICKUP" ? <button className="primary-button" type="button" onClick={() => onComplete(item.job, "Pickup completed from Pickup Command Center.")}>Complete Pickup</button> : null}
      {role === "owner" && item.stage.unclaimedEligible && item.job.status !== "UNCLAIMED" ? (
        <button className="secondary-button danger" type="button" onClick={() => onMarkUnclaimed(item.job)}>Mark Unclaimed</button>
      ) : null}
      {showForm ? (
        <form onSubmit={handleSubmit} className="record-contact-form" style={{ width: "100%", marginTop: 8 }}>
          <label className="field">
            <span>Result</span>
            <select value={result} onChange={(e) => setResult(e.target.value as "sent successfully" | "no response")}>
              <option value="sent successfully">Contacted</option>
              <option value="no response">No Response</option>
            </select>
          </label>
          <label className="field">
            <span>Method</span>
            <input type="text" value={method} onChange={(e) => setMethod(e.target.value)} />
          </label>
          <label className="field">
            <span>Note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </label>
          <button className="primary-button" type="submit">Save</button>
        </form>
      ) : null}
    </div>
  );
}

export function NotificationsPage({ state, role, userId, onOpen, onContact }: { state: PrototypeState; role: CareDeskRole; userId: string; onOpen: (id: string) => void; onContact: (id: string, result: NotificationRecord["result"], method?: string, note?: string) => void }) {
  const [filter, setFilter] = useState<NotificationFilter>("Pending");
  const visible = state.notifications.filter((item) => role === "owner" || item.technicianId === userId);
  const filtered = visible.filter((item) => item.status === filter);
  const counts = {
    Pending: visible.filter((item) => item.status === "Pending").length,
    Sent: visible.filter((item) => item.status === "Sent").length,
    Failed: visible.filter((item) => item.status === "Failed").length,
    "Need follow-up": visible.filter((item) => item.status === "Need follow-up").length
  };
  return (
    <section className="panel notification-log-panel">
      <PanelHeading title="Notification Log" caption="Follow-up record only. WhatsApp/phone remains the real communication channel." />
      <div className="status-filter-row">
        {(["Pending", "Sent", "Failed", "Need follow-up"] as NotificationFilter[]).map((item) => (
          <button className={filter === item ? "status-tab active" : "status-tab"} type="button" onClick={() => setFilter(item)} key={item}>
            {item} <span>{counts[item]}</span>
          </button>
        ))}
      </div>
      <div className="notification-log-grid">
        {filtered.map((item) => {
          const job = state.jobs.find((entry) => entry.id === item.jobId);
          const customer = job ? getCustomer(state, job.customerId) : undefined;
          const device = job ? getDevice(state, job.deviceId) : undefined;
          const message = item.messagePreview || (job && item.stageDay !== undefined ? buildPickupWhatsAppMessage(state, job, item.stageDay) : "");
          return (
            <article className="job-card notification-card" key={item.id}>
              <div className="job-card-header">
                <div>
                  <strong>{job?.jobIdDisplay ?? item.jobId}</strong>
                  <p className="job-meta">{item.type} - {item.dueLabel}</p>
                </div>
                <span className={item.status === "Need follow-up" || item.status === "Failed" ? "status danger-badge" : "status"}>{item.status}</span>
              </div>
              <div className="job-card-body">
                <div><span>Customer</span><strong>{customer?.name ?? "-"}</strong></div>
                <div><span>Phone</span><strong>{customer?.phone ?? "-"}</strong></div>
                <div><span>Device</span><strong>{device ? deviceLabel(device) : "-"}</strong></div>
                <div><span>Contacted</span><strong>{item.contactedAt ? new Date(item.contactedAt).toLocaleString() : "Not yet"}</strong></div>
              </div>
              <p className="notification-message">{message || `${item.channel}: ${item.result ?? "Pending contact result"}`}</p>
              <p className="job-meta">Result: {item.result ?? "Pending contact result"}</p>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={() => copyText(message)}>
                  <MessageCircle size={16} aria-hidden /> Copy WhatsApp Message
                </button>
                <button className="secondary-button" type="button" onClick={() => onContact(item.id, "sent successfully")}>Mark Contacted</button>
                <button className="secondary-button" type="button" onClick={() => onContact(item.id, "no response")}>No Response</button>
                {job ? <button className="secondary-button" type="button" onClick={() => onOpen(job.id)}>Open Job</button> : null}
              </div>
            </article>
          );
        })}
        {filtered.length === 0 ? <EmptyState title="No notification records" detail="Contact attempts and pickup reminders will appear here." compact /> : null}
      </div>
    </section>
  );
}

type CustomerDetailTab = "Profile" | "Active Jobs" | "Job History" | "Device History" | "Contact History";


function NotificationContactForm({
  item,
  message,
  job,
  onOpen,
  onContact
}: {
  item: NotificationRecord;
  message: string;
  job?: Job;
  onOpen: (id: string) => void;
  onContact: (id: string, result: NotificationRecord["result"], method?: string, note?: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<"sent successfully" | "no response">("sent successfully");
  const [method, setMethod] = useState("WhatsApp");
  const [note, setNote] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onContact(item.id, result, method, note);
    setShowForm(false);
    setNote("");
  };

  return (
    <div className="button-row">
      <button className="secondary-button" type="button" onClick={() => copyText(message)}>
        <MessageCircle size={16} aria-hidden /> Copy WhatsApp Message
      </button>
      <button className="secondary-button" type="button" onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancel" : "Record Contact"}
      </button>
      {job ? <button className="secondary-button" type="button" onClick={() => onOpen(job.id)}>Open Job</button> : null}
      {showForm ? (
        <form onSubmit={handleSubmit} className="record-contact-form" style={{ width: "100%", marginTop: 8 }}>
          <label className="field">
            <span>Result</span>
            <select value={result} onChange={(e) => setResult(e.target.value as "sent successfully" | "no response")}>
              <option value="sent successfully">Contacted</option>
              <option value="no response">No Response</option>
            </select>
          </label>
          <label className="field">
            <span>Method</span>
            <input type="text" value={method} onChange={(e) => setMethod(e.target.value)} />
          </label>
          <label className="field">
            <span>Note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </label>
          <button className="primary-button" type="submit">Save</button>
        </form>
      ) : null}
    </div>
  );
}
