"use client";

import { Globe2, LogOut, Moon, RotateCcw, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentLanguage, setCurrentLanguage } from "../../../lib/session";
import {
  approveCaredeskOwnerReview,
  CaredeskApiError,
  completeCaredeskPickup,
  createCaredeskJob,
  deleteCaredeskChecklistImage,
  getCaredeskMe,
  loadCaredeskAppState,
  logoutCaredesk,
  mapCaredeskUser,
  markCaredeskReadyPickup,
  markCaredeskUnclaimed,
  recordCaredeskCustomerDecision,
  recordCaredeskNotificationResult,
  recordCaredeskReportExport,
  releaseCaredeskJob,
  saveCaredeskChecklistReport,
  scanCaredeskServiceNote,
  submitCaredeskDiagnosis,
  takeCaredeskJob,
  updateCaredeskChecklistImageCaption,
  updateCaredeskRepairProgress,
  uploadCaredeskChecklistImage
} from "../api/caredesk-api";
import { ChecklistReportsPage } from "./checklist-reports";
import { CustomersPage, ReportsPage, SettingsPage } from "./customers-reports-settings";
import { JobsBoard, JobDetailPage, MyJobs, OwnerDashboard, ReviewPage, ScanJobWizard } from "./jobs";
import { NotificationsPage, PickupPage } from "./pickup-notifications";
import {
  AccessRestricted,
  ApiErrorShell,
  Brand,
  PrototypeLoadingShell,
  icons,
  isRestricted,
  pageTitleFor,
  type PrototypePage
} from "./shell";
import { showToast } from "@/hooks/use-toast";
import {
  createEmptyCareDeskState,
  getNavigationForRole,
  getText,
  type ChecklistImageSection,
  type ChecklistReport,
  type Job,
  type Language,
  type NotificationRecord,
  type PrototypeState,
  type User
} from "../domain/domain";

type ApiStatus = "loading" | "ready" | "error";
type CustomerDecisionMethod = NonNullable<Job["customerDecision"]>["method"];

export function FadhilCareDeskApp({ page, jobId }: { page: PrototypePage; jobId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<PrototypeState>(() => createEmptyCareDeskState());
  const [user, setUser] = useState<User | undefined>();
  const [language, setLanguage] = useState<Language>("bm");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");
  const [apiError, setApiError] = useState<string | undefined>();
  const [recoveryNotice, setRecoveryNotice] = useState<string | undefined>();
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(jobId);
  const role = user?.role ?? "technician";

  async function refreshFromApi() {
    try {
      setApiStatus("loading");
      setApiError(undefined);
      const currentUser = mapCaredeskUser(await getCaredeskMe());
      setUser(currentUser);
      const next = await loadCaredeskAppState();
      setState(next);
      setApiStatus("ready");
      return next;
    } catch (error) {
      const message = error instanceof Error ? error.message : "CareDesk API tidak dapat dihubungi.";
      if (error instanceof CaredeskApiError && error.status === 401) {
        router.push("/login");
        return createEmptyCareDeskState();
      }
      setApiError(message);
      setApiStatus("error");
      showToast({ message: error instanceof Error ? error.message : "Action failed. Please retry.", type: "error" });
      throw error;
    }
  }

  useEffect(() => {
    setLanguage(getCurrentLanguage());
    const saved = typeof window !== "undefined" ? localStorage.getItem("caredesk-theme") : null;
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = saved === "dark" || (!saved && prefersDark) ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    void refreshFromApi().catch(() => undefined);
  }, []);

  useEffect(() => {
    setSelectedJobId(jobId);
  }, [jobId]);

  const currentJob = state.jobs.find((job) => job.id === selectedJobId || job.jobIdDisplay === selectedJobId);
  const nav = getNavigationForRole(role);
  const pageTitle = pageTitleFor(page, language);
  const restricted = isRestricted(page, role);

  function switchLanguage(nextLanguage: Language) {
    setCurrentLanguage(nextLanguage);
    setLanguage(nextLanguage);
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("caredesk-theme", next);
  }

  function refreshApiData() {
    setSelectedJobId(undefined);
    setRecoveryNotice(undefined);
    void refreshFromApi().catch(() => undefined);
  }

  function logout() {
    void logoutCaredesk()
      .catch(() => undefined)
      .finally(() => router.push("/login"));
  }

  async function createJob(input: { serviceNumber: string; customerName: string; phone: string; device: string; issue: string }) {
    try {
      const created = await createCaredeskJob(input);
      const next = await refreshFromApi();
      const job = next.jobs.find((item) => item.id === created.id);
      if (job) {
        setSelectedJobId(job.id);
        showToast({ message: "Job " + job.jobIdDisplay + " dibuat", type: "success" });
      }
      return job;
    } catch (error) {
      setRecoveryNotice(error instanceof Error ? error.message : "Job creation failed");
      return undefined;
    }
  }

  function takeJob(job: Job) {
    void takeCaredeskJob(job.id).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  function releaseJob(job: Job) {
    void releaseCaredeskJob(job.id).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  function submitDiagnosis(job: Job, diagnosis: string) {
    void submitCaredeskDiagnosis(job.id, diagnosis, true).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  function approveOwnerReview(job: Job, instruction: string, posReference: string) {
    void approveCaredeskOwnerReview(job.id, instruction, posReference).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  function recordCustomerDecision(job: Job, proceed: boolean, method: CustomerDecisionMethod, note: string, reason: string) {
    void recordCaredeskCustomerDecision(job.id, proceed ? "proceed" : "not_proceed", method, note, reason)
      .then(refreshFromApi)
      .catch((error: Error) => setRecoveryNotice(error.message));
  }

  function updateRepair(job: Job, note: string) {
    void updateCaredeskRepairProgress(job.id, note).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  function markReadyPickup(job: Job) {
    void markCaredeskReadyPickup(job.id, new Date().toISOString().slice(0, 10)).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  function notifyCustomer(notificationId: string, result: NotificationRecord["result"], method?: string, note?: string) {
    if (!result) {
      return;
    }
    void recordCaredeskNotificationResult(notificationId, result === "no response" ? "no response" : result === "wrong number" ? "failed" : "sent successfully", method, note)
      .then(refreshFromApi)
      .catch((error: Error) => setRecoveryNotice(error.message));
  }

  function recordPickupContact(job: Job, result: NonNullable<NotificationRecord["result"]>, method?: string, note?: string) {
    const notification = state.notifications.find((item) => item.jobId === job.id);
    if (notification) {
      void recordCaredeskNotificationResult(notification.id, result === "no response" ? "no response" : result === "wrong number" ? "failed" : "sent successfully", method, note)
        .then(refreshFromApi)
        .catch((error: Error) => setRecoveryNotice(error.message));
    }
  }

  function completePickup(job: Job) {
    void completeCaredeskPickup(job.id).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  function markUnclaimed(job: Job) {
    void markCaredeskUnclaimed(job.id).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  function saveChecklistReport(report: ChecklistReport, status: ChecklistReport["status"]) {
    void saveCaredeskChecklistReport(report, status).then(refreshFromApi).catch((error: Error) => setRecoveryNotice(error.message));
  }

  async function uploadChecklistImage(report: ChecklistReport, section: ChecklistImageSection, file: File) {
    try {
      await uploadCaredeskChecklistImage(report.jobId, section, file);
      await refreshFromApi();
    } catch (error) {
      setRecoveryNotice(error instanceof Error ? error.message : "Checklist image upload failed");
    }
  }

  async function updateChecklistImageCaption(report: ChecklistReport, _section: ChecklistImageSection, imageId: string, caption: string) {
    try {
      await updateCaredeskChecklistImageCaption(report.jobId, imageId, caption);
      await refreshFromApi();
    } catch (error) {
      setRecoveryNotice(error instanceof Error ? error.message : "Checklist image caption update failed");
    }
  }

  async function deleteChecklistImage(report: ChecklistReport, _section: ChecklistImageSection, imageId: string) {
    try {
      await deleteCaredeskChecklistImage(report.jobId, imageId);
      await refreshFromApi();
    } catch (error) {
      setRecoveryNotice(error instanceof Error ? error.message : "Checklist image delete failed");
    }
  }

  function recordReportAction(action: string, rangeLabel: string) {
    void recordCaredeskReportExport(`${rangeLabel} ${action}`).catch((error: Error) => setRecoveryNotice(error.message));
  }

  if (apiStatus === "loading") {
    return <PrototypeLoadingShell language={language} />;
  }

  if (apiStatus === "error") {
    return (
      <ApiErrorShell
        language={language}
        error={apiError}
        onRetry={() => void refreshFromApi().catch(() => undefined)}
      />
    );
  }

  if (!user) {
    return <PrototypeLoadingShell language={language} />;
  }

  return (
    <div className="caredesk-shell">
      <aside className="caredesk-sidebar">
        <Brand language={language} />
        <nav className="nav-list" aria-label="Main navigation">
          {nav.map((item) => {
            const Icon = icons[item.key];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link className={active ? "nav-item active" : "nav-item"} href={item.href} key={item.href}>
                <Icon size={18} aria-hidden />
                {getText(language, item.key)}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="caredesk-main">
        <header className="caredesk-topbar">
          <div>
            <p className="eyebrow">{role === "owner" ? "Owner/Fadhil" : "Technician"}</p>
            <h1>{pageTitle}</h1>
            <p className="subtle">Operasi Servis & Repair</p>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button compact" type="button" onClick={() => switchLanguage(language === "bm" ? "en" : "bm")} aria-label="Switch language">
              <Globe2 size={16} aria-hidden />
              {language === "bm" ? "BM" : "EN"}
            </button>
            <span className="small-badge">{user.name}</span>
            <button className="theme-toggle" type="button" aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} onClick={toggleTheme}>
              {theme === "light" ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
            </button>
            <button className="icon-button compact-icon" type="button" aria-label="Refresh API data" title="Refresh API data" onClick={refreshApiData}>
              <RotateCcw size={16} aria-hidden />
            </button>
            <button className="secondary-button compact" type="button" onClick={logout}>
              <LogOut size={16} aria-hidden />
              Logout
            </button>
          </div>
        </header>

        {recoveryNotice ? (
          <section className="notice recovery-notice" role="status">
            <span>{recoveryNotice}</span>
            <button className="text-button" type="button" onClick={() => setRecoveryNotice(undefined)}>Dismiss</button>
          </section>
        ) : null}

        {restricted ? (
          <AccessRestricted language={language} />
        ) : page === "dashboard" ? (
          <OwnerDashboard state={state} language={language} onOpenJob={(id) => router.push(`/jobs/${id}`)} />
        ) : page === "scan" ? (
          <ScanJobWizard
            language={language}
            onScan={(file) => scanCaredeskServiceNote(file)}
            onCreate={createJob}
            onOpen={(id) => router.push(`/jobs/${id}`)}
          />
        ) : page === "jobs" ? (
          <JobsBoard state={state} role={role} language={language} selectedJob={currentJob} onSelect={setSelectedJobId} onOpen={(id) => router.push(`/jobs/${id}`)} />
        ) : page === "my-jobs" ? (
          <MyJobs state={state} userId={user.id} language={language} onOpen={(id) => router.push(`/jobs/${id}`)} />
        ) : page === "review" ? (
          <ReviewPage state={state} language={language} onOpen={(id) => router.push(`/jobs/${id}`)} />
        ) : page === "checklist-reports" ? (
          <ChecklistReportsPage
            state={state}
            role={role}
            userId={user.id}
            onSave={saveChecklistReport}
            onImageUpload={uploadChecklistImage}
            onImageCaption={updateChecklistImageCaption}
            onImageRemove={deleteChecklistImage}
          />
        ) : page === "pickup" ? (
          <PickupPage
            state={state}
            role={role}
            userId={user.id}
            language={language}
            onOpen={(id) => router.push(`/jobs/${id}`)}
            onMarkUnclaimed={markUnclaimed}
            onContact={recordPickupContact}
            onComplete={completePickup}
          />
        ) : page === "notifications" ? (
          <NotificationsPage state={state} role={role} userId={user.id} onOpen={(id) => router.push(`/jobs/${id}`)} onContact={notifyCustomer} />
        ) : page === "customers" ? (
          role === "owner" ? (
            <CustomersPage state={state} role={role} userId={user.id} onOpen={(id) => router.push(`/jobs/${id}`)} />
          ) : (
            <AccessRestricted language={language} />
          )
        ) : page === "reports" ? (
          <ReportsPage state={state} role={role} onReportAction={recordReportAction} />
        ) : page === "settings" ? (
          <SettingsPage state={state} onRefresh={refreshFromApi} language={language} />
        ) : (
          <JobDetailPage
            state={state}
            job={currentJob}
            role={role}
            userId={user.id}
            language={language}
            onTake={takeJob}
            onRelease={releaseJob}
            onDiagnosis={submitDiagnosis}
            onOwnerApprove={approveOwnerReview}
            onDecision={recordCustomerDecision}
            onRepairUpdate={updateRepair}
            onReadyPickup={markReadyPickup}
            onComplete={completePickup}
          />
        )}
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {nav.slice(0, 5).map((item) => {
          const Icon = icons[item.key];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link className={active ? "mobile-nav-item active" : "mobile-nav-item"} href={item.href} key={item.href}>
              <Icon size={18} aria-hidden />
              <span>{getText(language, item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

