"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { CheckCircle2, Copy, FileSearch, PanelRightOpen, Printer, Search, Upload, TrendingUp, Clock, Package, AlertTriangle, ClipboardList, PlusCircle, ScanLine, ArrowUpRight, LayoutGrid, List } from "lucide-react";
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart";
import { StaggerContainer } from "@/components/motion/StaggerContainer";
import { StaggerItem } from "@/components/motion/StaggerItem";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { downloadCustomerReportPdf, type ScanCaredeskServiceNoteResult } from "../api/caredesk-api";
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
import { copyText, EmptyState, Field, JobMiniList, MetricCard, PanelHeading, statusTone, TimelineList } from "./shared";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

type CustomerDecisionMethod = NonNullable<Job["customerDecision"]>["method"];

export function GlobalSearch({ state, onSelect }: { state: PrototypeState; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return [];
    }
    return state.jobs
      .filter((job) => {
        const customer = getCustomer(state, job.customerId);
        const device = getDevice(state, job.deviceId);
        return [job.jobIdDisplay, customer.name, customer.phone, device.brand, device.model, device.serialNumber, job.posReference].join(" ").toLowerCase().includes(term);
      })
      .slice(0, 4);
  }, [query, state]);
  return (
    <div className="global-search">
      <Search size={16} aria-hidden />
      <input aria-label="Global search" placeholder="Search Job ID, customer, phone..." value={query} onChange={(event) => setQuery(event.target.value)} />
      {matches.length > 0 ? (
        <div className="search-results">
          {matches.map((job) => (
            <button type="button" key={job.id} onClick={() => onSelect(job.id)}>
              <strong>{job.jobIdDisplay}</strong>
              <span>{getCustomer(state, job.customerId).name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OwnerDashboard({ state, onOpenJob }: { state: PrototypeState; language: Language; onOpenJob: (id: string) => void }) {
  const ownerReviewJobs = state.jobs.filter((job) => job.status === "WAITING FADHIL REVIEW");
  const customerDecisionJobs = state.jobs.filter((job) => job.status === "WAITING CUSTOMER CONFIRMATION");
  const readyPickupJobs = state.jobs.filter((job) => job.status === "READY PICKUP");

  const statusColors: Record<string, string> = {
    "NEW JOB": "status-new",
    "WAITING FADHIL REVIEW": "status-review",
    "WAITING CUSTOMER CONFIRMATION": "status-customer",
    "IN PROGRESS": "status-progress",
    "NOT PROCEED": "status-muted",
    "READY PICKUP": "status-pickup",
    UNCLAIMED: "status-danger",
    COMPLETE: "status-complete"
  };

  return (
    <div className="stack">
      {/* Top Metric Row */}
      <div className="summary-row">
        <MetricCard label="Active jobs" value={activeJobs(state.jobs).length} />
        <MetricCard label="Owner review" value={ownerReviewJobs.length} />
        <MetricCard label="Ready pickup" value={readyPickupJobs.length} />
        <MetricCard label="Customer decision" value={customerDecisionJobs.length} />
      </div>

      {/* Status Overview */}
      <section className="panel">
        <PanelHeading title="Status Overview" caption="Job counts by repair status." />
        <div className="status-grid">
          {careDeskStatuses.map((status) => (
            <div key={status} className={`status-card ${statusColors[status] || "status-muted"}`}>
              <div className="status-card-count">{state.jobs.filter((job) => job.status === status).length}</div>
              <div className="status-card-label">{status}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Action Queues */}
      <section className="panel">
        <div className="jobs-section-header">
          <PanelHeading title="Action Queues" caption="Jobs waiting for owner, customer confirmation, or pickup handling." />
          <span className="small-badge">{ownerReviewJobs.length + customerDecisionJobs.length + readyPickupJobs.length} open</span>
        </div>
        <div className="dashboard-grid">
          <div className="panel-subtle">
            <PanelHeading title="Owner review" caption={`${ownerReviewJobs.length} waiting`} />
            {ownerReviewJobs.length ? <JobMiniList state={state} jobs={ownerReviewJobs} onOpen={onOpenJob} /> : <p className="subtle" style={{ padding: 12 }}>None</p>}
          </div>
          <div className="panel-subtle">
            <PanelHeading title="Customer confirmation" caption={`${customerDecisionJobs.length} waiting`} />
            {customerDecisionJobs.length ? <JobMiniList state={state} jobs={customerDecisionJobs} onOpen={onOpenJob} /> : <p className="subtle" style={{ padding: 12 }}>None</p>}
          </div>
          <div className="panel-subtle">
            <PanelHeading title="Ready pickup" caption={`${readyPickupJobs.length} waiting`} />
            {readyPickupJobs.length ? <JobMiniList state={state} jobs={readyPickupJobs} onOpen={onOpenJob} /> : <p className="subtle" style={{ padding: 12 }}>None</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
export function ScanJobWizard({
  onScan,
  onCreate,
  onOpen
}: {
  language: Language;
  onScan?: (file: File) => Promise<{ serviceReportNumber: string; customer: { name: string; phone: string }; device: { brand: string; model?: string; type: string }; reportedIssue: string; confidence?: number; warnings?: string[]; sourceFileName?: string }>;
  onCreate: (input: { serviceNumber: string; customerName: string; phone: string; device: string; issue: string }) => Promise<Job | undefined>;
  onOpen: (id: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [createdJob, setCreatedJob] = useState<Job | undefined>();
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanMeta, setScanMeta] = useState<{ confidence?: number; warnings?: string[]; sourceFileName?: string } | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({ serviceNumber: "NO.0015", customerName: "Siti Hajar", phone: "014-552 1100", device: "MacBook Air M1", issue: "Tidak boleh charge" });
  const steps = ["Scan / Upload", "Extract Data", "Review & Correct", "Create Job", "Success"];
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    runScan(file);
  }
  function runScan(file: File) {
    setScanError(null);
    setScanMeta(undefined);
    if (!onScan) {
      setStep(2);
      return;
    }
    setIsScanning(true);
    void onScan(file)
      .then((result) => {
        setDraft({
          serviceNumber: result.serviceReportNumber,
          customerName: result.customer.name,
          phone: result.customer.phone,
          device: [result.device.brand, result.device.model ?? result.device.type].filter(Boolean).join(" "),
          issue: result.reportedIssue
        });
        setScanMeta({ confidence: result.confidence, warnings: result.warnings, sourceFileName: result.sourceFileName });
        setStep(2);
      })
      .catch((err) => {
        setScanError(err instanceof Error ? err.message : "Failed to scan service note");
      })
      .finally(() => setIsScanning(false));
  }
  return (
    <section className="panel scan-wizard">
      <div className="stepper">
        {steps.map((item, index) => (
          <span className={step === index + 1 ? "step active" : "step"} key={item}>
            {index + 1}. {item}
          </span>
        ))}
      </div>
      {step === 1 ? (
        <div
          className={"scan-drop" + (isScanning ? " scan-loading" : "")}
          onClick={() => { if (!isScanning) fileInputRef.current?.click(); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*,.pdf"
            onChange={handleFileChange}
          />
          {isScanning ? (
            <>
              <Upload size={30} aria-hidden />
              <h2>Membaca service note...</h2>
              <p className="subtle">CareDesk API sedang extract maklumat daripada service note.</p>
            </>
          ) : (
            <>
              <Upload size={30} aria-hidden />
              <h2>Scan / Upload Service Note</h2>
              <p className="subtle">CareDesk API akan extract maklumat awal daripada service note.</p>
              <button className="primary-button" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Pilih fail service note
              </button>
            </>
          )}
          {scanError ? <p className="notice recovery-notice" style={{ marginTop: 8 }}>{scanError}</p> : null}
        </div>
      ) : step === 2 ? (
        <div className="panel-subtle">
          <h2>Extract Data</h2>
          <p>Service report number, customer, phone, device, dan reported issue telah dibaca melalui CareDesk API.</p>
          {scanMeta ? (
            <div className="detail-list" style={{ margin: "12px 0" }}>
              <span>Source</span>
              <strong>{scanMeta.sourceFileName ?? "Uploaded service note"}</strong>
              <span>Confidence</span>
              <strong>{scanMeta.confidence !== undefined ? `${Math.round(scanMeta.confidence * 100)}%` : "Review required"}</strong>
            </div>
          ) : null}
          {scanMeta?.warnings?.length ? (
            <div className="notice recovery-notice" role="status">
              <span>{scanMeta.warnings.join(" ")}</span>
            </div>
          ) : null}
          <button className="primary-button" type="button" onClick={() => setStep(3)}>
            Review extracted fields
          </button>
        </div>
      ) : step === 3 || step === 4 ? (
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void onCreate(draft).then((job) => {
              if (job) {
                setCreatedJob(job);
                setStep(5);
              }
            });
          }}
        >
          <h2>Review & Correct</h2>
          <Field label="Service Report Number" value={draft.serviceNumber} onChange={(value) => setDraft({ ...draft, serviceNumber: value })} />
          <Field label="Customer Name" value={draft.customerName} onChange={(value) => setDraft({ ...draft, customerName: value })} />
          <Field label="Customer Phone" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} />
          <Field label="Device" value={draft.device} onChange={(value) => setDraft({ ...draft, device: value })} />
          <Field label="Reported Issue" value={draft.issue} onChange={(value) => setDraft({ ...draft, issue: value })} multiline />
          <button className="primary-button" type="submit">
            Create repair job
          </button>
        </form>
      ) : (
        <div className="scan-drop success">
          <CheckCircle2 size={34} aria-hidden />
          <h2>{createdJob?.jobIdDisplay} created</h2>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => createdJob && onOpen(createdJob.id)}>
              Open Job
            </button>
            <button className="secondary-button" type="button" onClick={() => setStep(1)}>
              Create Another Job
            </button>
            <Link className="secondary-button" href="/jobs">
              Go to Jobs Board
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

export function JobsBoard({ state, selectedJob, onSelect, onOpen }: { state: PrototypeState; role: CareDeskRole; language: Language; selectedJob?: Job; onSelect: (id: string) => void; onOpen: (id: string) => void }) {
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | undefined>("NEW JOB");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const visibleJobs = selectedStatus ? state.jobs.filter((job) => job.status === selectedStatus) : state.jobs;
  return (
    <div className="jobs-layout">
      <section className="panel jobs-board-panel" style={{ flex: 1, minWidth: 0 }}>
        <div className="jobs-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h2>{viewMode === "kanban" ? "Kanban Papan" : "Jobs by Status"}</h2>
            <p className="eyebrow">{viewMode === "kanban" ? "Seret job antara lajur untuk tukar status." : "Pilih status untuk lihat job yang perlu tindakan."}</p>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={viewMode === "list" ? "status-tab active" : "status-tab"}
              type="button"
              onClick={() => setViewMode("list")}
              aria-label="List view"
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              className={viewMode === "kanban" ? "status-tab active" : "status-tab"}
              type="button"
              onClick={() => setViewMode("kanban")}
              aria-label="Kanban view"
              title="Kanban view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {viewMode === "kanban" ? (
          <KanbanBoard state={state} onOpen={onOpen} />
        ) : (
          <>
            <div className="status-filter-row">
              {careDeskStatuses.map((status) => (
                <button className={selectedStatus === status ? "status-tab active" : "status-tab"} type="button" key={status} onClick={() => setSelectedStatus(status)}>
                  {status}
                </button>
              ))}
              {selectedStatus ? (
                <button className="text-button" type="button" onClick={() => setSelectedStatus(undefined)}>
                  Clear filter
                </button>
              ) : null}
            </div>

            <div className="selected-status-header">
              <div>
                <h2>{selectedStatus}</h2>
                <p className="eyebrow">{visibleJobs.length} job dalam status ini</p>
              </div>
            </div>

            {visibleJobs.length === 0 ? (
              <EmptyState title="No jobs in this status" detail="Try another status filter or create a new repair job from Scan Job." compact />
            ) : (
              <div className="selected-status-jobs">
                {visibleJobs.map((job) => (
                  <JobCard state={state} job={job} key={job.id} selected={selectedJob?.id === job.id} onSelect={() => onSelect(job.id)} onOpen={() => onOpen(job.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
      {selectedJob ? <JobSidePanel state={state} job={selectedJob} onOpen={onOpen} /> : null}
    </div>
  );
}

export function JobCard({ state, job, selected, onSelect, onOpen }: { state: PrototypeState; job: Job; selected?: boolean; onSelect: () => void; onOpen: () => void }) {
  const customer = getCustomer(state, job.customerId);
  const device = getDevice(state, job.deviceId);
  const tech = getAssignedTechnician(state, job);
  return (
    <article className={selected ? "job-card selected" : "job-card"} onClick={onSelect}>
      <div className="job-card-header">
        <div>
          <div className="job-number">{job.jobIdDisplay}</div>
          <div className="job-meta">
            {customer.name} - {deviceLabel(device)}
          </div>
        </div>
        <span className={`status ${statusTone[job.status]}`}>{job.status}</span>
      </div>
      <div className="job-card-body">
        <div>
          <span>Status age</span>
          <strong>{job.statusAge}</strong>
        </div>
        <div>
          <span>Technician</span>
          <strong>{tech?.name ?? "Unassigned"}</strong>
        </div>
      </div>
      <p className="job-next-action">{job.nextAction}</p>
      <div className="badge-row">
        {job.badges.slice(0, 3).map((badge) => (
          <span className="small-badge" key={badge}>{badge}</span>
        ))}
      </div>
      <div className="job-card-actions">
        <button className="secondary-button compact" type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }}>
          Open detail
        </button>
      </div>
    </article>
  );
}

export function JobSidePanel({ state, job, onOpen }: { state: PrototypeState; job?: Job; onOpen: (id: string) => void }) {
  if (!job) {
    return null;
  }
  const customer = getCustomer(state, job.customerId);
  const device = getDevice(state, job.deviceId);
  const events = state.timeline.filter((event) => event.jobId === job.id).slice(0, 5);
  return (
    <aside className="side-panel">
      <div className="side-panel-header">
        <div>
          <p className="eyebrow">{job.status}</p>
          <h2>{job.jobIdDisplay}</h2>
        </div>
        <PanelRightOpen size={20} aria-hidden />
      </div>
      <div className="detail-list">
        <span>Customer</span><strong>{customer.name}</strong>
        <span>Phone</span><strong>{customer.phone}</strong>
        <span>Device</span><strong>{deviceLabel(device)}</strong>
        <span>Next action</span><strong>{job.nextAction}</strong>
      </div>
      <TimelineList events={events} compact />
      <button className="primary-button" type="button" onClick={() => onOpen(job.id)}>Open Job Detail</button>
    </aside>
  );
}

export function MyJobs({ state, userId, onOpen }: { state: PrototypeState; userId: string; language: Language; onOpen: (id: string) => void }) {
  const mine = state.jobs.filter((job) => job.assignedTechnicianId === userId || (!job.assignedTechnicianId && job.status === "NEW JOB"));
  const groups = {
    "Need Diagnosis": mine.filter((job) => job.status === "NEW JOB"),
    "Waiting Owner / Customer": mine.filter((job) => job.status === "WAITING FADHIL REVIEW" || job.status === "WAITING CUSTOMER CONFIRMATION"),
    "Ready to Repair": mine.filter((job) => job.status === "IN PROGRESS"),
    "Ready Pickup": mine.filter((job) => job.status === "READY PICKUP"),
    "Stuck / Overdue": mine.filter((job) => job.status === "UNCLAIMED")
  };
  return (
    <div className="stack">
      {Object.entries(groups).map(([title, jobs]) => (
        <section className="panel" key={title}>
          <PanelHeading title={title} caption={`${jobs.length} job`} />
          <JobMiniList state={state} jobs={jobs} onOpen={onOpen} />
        </section>
      ))}
    </div>
  );
}

export function ReviewPage({ state, onOpen }: { state: PrototypeState; language: Language; onOpen: (id: string) => void }) {
  return (
    <div className="dashboard-grid two">
      <section className="panel">
        <PanelHeading title="Waiting Fadhil Review" caption="Diagnosis submitted by technician." />
        <JobMiniList state={state} jobs={state.jobs.filter((job) => job.status === "WAITING FADHIL REVIEW")} onOpen={onOpen} />
      </section>
      <section className="panel">
        <PanelHeading title="Waiting Customer Decision" caption="Owner instruction approved; customer decision pending." />
        <JobMiniList state={state} jobs={state.jobs.filter((job) => job.status === "WAITING CUSTOMER CONFIRMATION")} onOpen={onOpen} />
      </section>
    </div>
  );
}

type PickupFilter = "All" | "Due Today" | "Need Follow-Up" | "Day 60" | "Unclaimed";

export function JobDetailPage({
  state,
  job,
  role,
  userId,
  onTake,
  onRelease,
  onDiagnosis,
  onOwnerApprove,
  onDecision,
  onRepairUpdate,
  onReadyPickup,
  onComplete
}: {
  state: PrototypeState;
  job?: Job;
  role: CareDeskRole;
  userId: string;
  language: Language;
  onTake: (job: Job) => void;
  onRelease: (job: Job) => void;
  onDiagnosis: (job: Job, diagnosis: string) => void;
  onOwnerApprove: (job: Job, instruction: string, posReference: string) => void;
  onDecision: (job: Job, proceed: boolean, method: CustomerDecisionMethod, note: string, reason: string) => void;
  onRepairUpdate: (job: Job, note: string) => void;
  onReadyPickup: (job: Job) => void;
  onComplete: (job: Job, note: string) => void;
}) {
  const [tab, setTab] = useState("Overview");
  const [note, setNote] = useState("");
  const [ownerInstruction, setOwnerInstruction] = useState("Approve repair selepas customer setuju. Rujuk POS untuk harga rasmi.");
  const [posRef, setPosRef] = useState("Q-1044");
  const [decisionNote, setDecisionNote] = useState("");
  const [reason, setReason] = useState("Harga mahal");
  if (!job) {
    return <EmptyState title="Job not found" detail="The selected Job ID is not available in CareDesk API data." panel />;
  }
  const customer = getCustomer(state, job.customerId);
  const device = getDevice(state, job.deviceId);
  const events = state.timeline.filter((event) => event.jobId === job.id);
  const evidenceCount = state.evidence.filter((item) => item.jobId === job.id).length;
  const report = buildCustomerReport(state, job);
  const tabs = role === "owner"
    ? ["Overview", "Diagnosis & Evidence", "Owner Review", "Customer Report", "Customer Decision", "Pickup", "Timeline"]
    : ["Overview", "Diagnosis & Evidence", "Owner Review", "Customer Decision", "Pickup", "Timeline"];
  return (
    <div className="stack">
      <section className="panel">
        <div className="job-detail-hero">
          <div>
            <p className="eyebrow">{job.status}</p>
            <h2>{job.jobIdDisplay}</h2>
            <p>{customer.name} - {deviceLabel(device)}</p>
            <button className="text-button" type="button" onClick={() => void copyText(job.jobIdDisplay)} title="Copy job ID">
              <Copy size={14} aria-hidden /> Copy ID
            </button>
          </div>
          <span className={`status ${statusTone[job.status]}`}>{job.status}</span>
        </div>
        <div className="tab-row">
          {tabs.map((item) => <button className={tab === item ? "tab active" : "tab"} type="button" onClick={() => setTab(item)} key={item}>{item}</button>)}
        </div>
      </section>
      {tab === "Overview" ? (
        <section className="panel">
          <div className="detail-list">
            <span>Customer</span><strong>{customer.name} - {customer.phone}</strong>
            <span>Device</span><strong>{device.type} {deviceLabel(device)} {device.serialNumber ? `(${device.serialNumber})` : ""}</strong>
            <span>Reported issue</span><strong>{job.reportedIssue}</strong>
            <span>Assigned technician</span><strong>{getAssignedTechnician(state, job)?.name ?? "Unassigned"}</strong>
            <span>Next action</span><strong>{job.nextAction}</strong>
            <span>POS Reference</span><strong>{job.posReference ?? "Optional / none"}</strong>
          </div>
        </section>
      ) : tab === "Diagnosis & Evidence" ? (
        <section className="panel">
          <PanelHeading title="Diagnosis & Evidence" caption={`${evidenceCount} evidence file(s) from CareDesk API.`} />
          <p>{job.diagnosisNotes ?? "No diagnosis note yet."}</p>
          <Field label="Diagnosis note" value={note} onChange={setNote} multiline />
          <div className="button-row">
            {canApplyJobAction(job, role, "take_job", userId) ? <button className="primary-button" type="button" onClick={() => onTake(job)}>Take Job</button> : null}
            {canApplyJobAction(job, role, "release_job", userId) ? <button className="secondary-button" type="button" onClick={() => onRelease(job)}>Release Job</button> : null}
            {canApplyJobAction(job, role, "submit_owner_review", userId) ? <button className="primary-button" type="button" onClick={() => onDiagnosis(job, note || "Diagnosis awal: hardware test diperlukan.")}>Submit to Owner</button> : null}
          </div>
        </section>
      ) : tab === "Owner Review" ? (
        <section className="panel">
          <PanelHeading title="Owner Review" caption="Technician can view status, Owner/Fadhil can approve." />
          <p>{job.diagnosisNotes ?? "Diagnosis belum dihantar."}</p>
          <Field label="Owner instruction" value={ownerInstruction} onChange={setOwnerInstruction} multiline />
          <Field label="POS Reference (optional)" value={posRef} onChange={setPosRef} />
          {role === "owner" && job.status === "WAITING FADHIL REVIEW" ? <button className="primary-button" type="button" onClick={() => onOwnerApprove(job, ownerInstruction, posRef)}>Approve for Customer Confirmation</button> : <div className="notice muted">Only Owner/Fadhil can approve this step.</div>}
        </section>
      ) : tab === "Customer Report" ? (
        <CustomerReportTab report={report} />
      ) : tab === "Customer Decision" ? (
        <section className="panel">
          <PanelHeading title="Customer Decision" caption="Record decision after WhatsApp, phone, or in-shop confirmation." />
          <Field label="Decision note" value={decisionNote} onChange={setDecisionNote} multiline />
          <label className="field">
            <span>Reason if Not Proceed</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              {state.flowRules.notProceedReasons.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="button-row">
            {canApplyJobAction(job, role, "record_customer_decision", userId) ? (
              <>
                <button className="primary-button" type="button" onClick={() => onDecision(job, true, "WhatsApp", decisionNote || "Customer setuju repair.", "")}>Proceed Repair</button>
                <button className="secondary-button danger" type="button" onClick={() => onDecision(job, false, "WhatsApp", decisionNote, reason)}>Not Proceed</button>
              </>
            ) : <div className="notice muted">Customer decision only applies after Owner review approval.</div>}
          </div>
        </section>
      ) : tab === "Pickup" ? (
        <section className="panel">
          <PanelHeading title="Pickup" caption="Notify, reminder, unclaimed, and complete pickup." />
          <p>Reminder stage: {job.pickupReminderStage ?? "Not ready pickup yet"}</p>
          <Field label="Pickup / repair note" value={note} onChange={setNote} multiline />
          <div className="button-row">
            {canApplyJobAction(job, role, "update_repair", userId) ? <button className="secondary-button" type="button" onClick={() => onRepairUpdate(job, note || "Repair progress updated.")}>Update Repair</button> : null}
            {canApplyJobAction(job, role, "mark_ready_pickup", userId) ? <button className="primary-button" type="button" onClick={() => onReadyPickup(job)}>Mark Ready Pickup</button> : null}
            {canApplyJobAction(job, role, "complete_pickup", userId) || (role === "owner" && job.status === "READY PICKUP") ? <button className="primary-button" type="button" onClick={() => onComplete(job, note)}>Complete Pickup</button> : null}
          </div>
        </section>
      ) : (
        <section className="panel">
          <TimelineList events={events} />
        </section>
      )}
    </div>
  );
}

export function CustomerReportTab({ report }: { report: CustomerReport }) {
  const [previewVisible, setPreviewVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const whatsAppSummary = buildWhatsAppReportSummary(report);

  async function copySummary() {
    await copyText(whatsAppSummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function printOrDownloadPdf() {
    const blob = await downloadCustomerReportPdf(report.jobIdDisplay);
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
  }

  return (
    <section className="panel customer-report-panel">
      <div className="panel-heading report-panel-heading">
        <div>
          <h2>Customer Report</h2>
          <p className="eyebrow">Service note style PDF untuk dihantar kepada customer melalui WhatsApp.</p>
        </div>
        <div className="report-actions">
          <button className="secondary-button" type="button" onClick={() => setPreviewVisible(true)}>
            <FileSearch size={16} aria-hidden /> Preview Report
          </button>
          <button className="secondary-button" type="button" onClick={() => void printOrDownloadPdf()}>
            <Printer size={16} aria-hidden /> Download PDF
          </button>
          <button className="primary-button" type="button" onClick={() => void copySummary()}>
            <Copy size={16} aria-hidden /> {copied ? "Copied" : "Copy WhatsApp Summary"}
          </button>
        </div>
      </div>
      {previewVisible ? <ReportPreview report={report} /> : null}
    </section>
  );
}

export function ReportPreview({ report }: { report: CustomerReport }) {
  const generatedDate = new Date(report.generatedAt).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <article className="customer-report-print-area">
      <header className="report-header">
        <div>
          <div className="report-brand">Fadhil CareDesk</div>
          <p>Operasi Servis & Repair</p>
        </div>
        <div className="report-job-id">
          <span>Job ID</span>
          <strong>{report.jobIdDisplay}</strong>
        </div>
      </header>

      <section className="report-section">
        <div className="report-section-heading">
          <h3>Customer & Device</h3>
          <span>Generated {generatedDate}</span>
        </div>
        <div className="report-table-grid">
          <table className="report-table">
            <tbody>
              <tr><th>Customer</th><td>{report.customerName}</td></tr>
              <tr><th>Phone</th><td>{report.customerPhone}</td></tr>
              <tr><th>Preferred contact</th><td>{report.preferredChannel}</td></tr>
            </tbody>
          </table>
          <table className="report-table">
            <tbody>
              <tr><th>Device</th><td>{report.deviceLabel}</td></tr>
              <tr><th>Serial No.</th><td>{report.serialNumber ?? "-"}</td></tr>
              <tr><th>Accessories</th><td>{report.accessories ?? "-"}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <h3>Job Info</h3>
        <table className="report-table report-table-full">
          <tbody>
            <tr><th>Status</th><td>{report.status}</td></tr>
            <tr><th>Status age</th><td>{report.statusAge}</td></tr>
            <tr><th>Technician</th><td>{report.assignedTechnician}</td></tr>
            <tr><th>Reported issue</th><td>{report.reportedIssue}</td></tr>
            <tr><th>POS reference</th><td>{report.posReference ?? "-"}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h3>Technician Diagnosis</h3>
        <p className="report-copy">{report.diagnosisSummary}</p>
      </section>

      <section className="report-section">
        <h3>Evidence & Test Result</h3>
        <EvidenceImageGrid evidence={report.evidence} />
      </section>

      <section className="report-section">
        <h3>Owner Recommendation</h3>
        <p className="report-copy">{report.ownerRecommendation}</p>
      </section>

      <footer className="report-footer-note">
        {report.customerNote}
      </footer>
    </article>
  );
}

export function EvidenceImageGrid({ evidence }: { evidence: CustomerReport["evidence"] }) {
  if (evidence.length === 0) {
    return <EmptyState title="No customer-visible evidence yet" detail="Technician evidence will appear here when it is available for the customer report." compact />;
  }

  return (
    <div className="evidence-image-grid">
      {evidence.map((item) => (
        <figure className="evidence-image-card" key={item.id}>
          <div className="evidence-image-frame">
            {item.imageUrl ? <img src={item.imageUrl} alt={item.label} /> : <span>No image</span>}
          </div>
          <figcaption>
            <strong>{item.label}</strong>
            <span>{item.caption}</span>
            {item.testResult ? <em>{item.testResult}</em> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
