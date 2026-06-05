"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Copy, FileSearch, Printer, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadChecklistReportPdf } from "../api/caredesk-api";
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
import { copyText, EmptyState, Field, PanelHeading, ReadOnlyValue, ReportBox } from "./shared";

export const checklistSteps = ["Maklumat Peranti", "Pemeriksaan Awal", "Drive Health", "Battery Report", "RAM Specification", "Diagnosis Summary", "Preview"];

export function ChecklistReportsPage({
  state,
  role,
  userId,
  onSave,
  onImageUpload,
  onImageCaption,
  onImageRemove
}: {
  state: PrototypeState;
  role: CareDeskRole;
  userId: string;
  onSave: (report: ChecklistReport, status: ChecklistReport["status"]) => void;
  onImageUpload: (report: ChecklistReport, section: ChecklistImageSection, file: File) => Promise<void>;
  onImageCaption: (report: ChecklistReport, section: ChecklistImageSection, imageId: string, caption: string) => Promise<void>;
  onImageRemove: (report: ChecklistReport, section: ChecklistImageSection, imageId: string) => Promise<void>;
}) {
  const reports = getChecklistReportsForRole(state, role, userId);
  const [selectedJobId, setSelectedJobId] = useState(reports[0]?.jobId);
  const activeReport = reports.find((report) => report.jobId === selectedJobId) ?? reports[0];

  useEffect(() => {
    if (!activeReport && reports[0]) {
      setSelectedJobId(reports[0].jobId);
    }
  }, [activeReport, reports]);

  if (reports.length === 0) {
    return <EmptyState title="No checklist reports available" detail="Reports appear here for jobs assigned to this technician or all jobs for Owner/Fadhil." panel />;
  }

  return (
    <div className="module-grid checklist-page">
      <section className="panel checklist-queue-panel">
        <PanelHeading title="Checklist Report Queue" caption={role === "owner" ? "Owner read-only view for all technical checklist reports." : "Technician queue for assigned Laptop/PC checklist reports."} />
        <div className="job-list">
          {reports.map((report) => (
            <article className={activeReport?.jobId === report.jobId ? "mini-job selected" : "mini-job"} key={report.jobId}>
              <div>
                <strong>{report.jobIdDisplay}</strong>
                <p className="job-meta">{report.customerName} - {report.deviceModel}</p>
                <div className="badge-row">
                  <span className="small-badge">{checklistStatusLabel(report.status)}</span>
                  <span className="small-badge">{report.checkedBy}</span>
                </div>
              </div>
              <button className="secondary-button compact" type="button" onClick={() => setSelectedJobId(report.jobId)}>Open Report</button>
            </article>
          ))}
        </div>
      </section>
      {activeReport ? (
        <ChecklistReportEditor
          report={activeReport}
          role={role}
          userId={userId}
          onSave={onSave}
          onImageUpload={onImageUpload}
          onImageCaption={onImageCaption}
          onImageRemove={onImageRemove}
        />
      ) : null}
    </div>
  );
}

export function ChecklistReportEditor({
  report,
  role,
  userId,
  onSave,
  onImageUpload,
  onImageCaption,
  onImageRemove
}: {
  report: ChecklistReport;
  role: CareDeskRole;
  userId: string;
  onSave: (report: ChecklistReport, status: ChecklistReport["status"]) => void;
  onImageUpload: (report: ChecklistReport, section: ChecklistImageSection, file: File) => Promise<void>;
  onImageCaption: (report: ChecklistReport, section: ChecklistImageSection, imageId: string, caption: string) => Promise<void>;
  onImageRemove: (report: ChecklistReport, section: ChecklistImageSection, imageId: string) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(report);
  const [copied, setCopied] = useState(false);
  const editable = canEditChecklistReport(draft, role, userId);

  useEffect(() => {
    setDraft(report);
  }, [report]);

  useEffect(() => {
    setStep(0);
  }, [report.jobId]);

  async function copySummary() {
    await copyText(buildChecklistCustomerSummary(draft));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function save(status: ChecklistReport["status"]) {
    onSave(draft, status);
  }

  async function printOrDownloadPdf() {
    const blob = await downloadChecklistReportPdf(draft.jobId);
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
  }

  async function addImages(section: ChecklistImageSection, files: FileList | null) {
    if (!files || !canAddChecklistImage(draft, section, role, userId)) {
      return;
    }
    await Promise.all(Array.from(files).map((file) => onImageUpload(draft, section, file)));
  }

  function removeImage(section: ChecklistImageSection, imageId: string) {
    void onImageRemove(draft, section, imageId);
  }

  function updateImageCaption(section: ChecklistImageSection, imageId: string, caption: string) {
    setDraft((current) => updateChecklistImageCaptionDraft(current, section, imageId, caption));
  }

  function commitImageCaption(section: ChecklistImageSection, imageId: string, caption: string) {
    void onImageCaption(draft, section, imageId, caption);
  }

  return (
    <section className="panel checklist-report-panel">
      <div className="panel-heading checklist-editor-header">
        <div>
          <h2>{draft.jobIdDisplay} Checklist Report</h2>
          <p className="eyebrow">{draft.customerName} - {draft.deviceModel} - {checklistStatusLabel(draft.status)}</p>
        </div>
        <div className="report-actions checklist-editor-actions">
          {editable ? <button className="secondary-button" type="button" onClick={() => save("draft")}>Save Draft</button> : null}
          {editable ? <button className="primary-button" type="button" onClick={() => save("submitted")}>Submit Report</button> : null}
          <button className="secondary-button" type="button" onClick={() => setStep(checklistSteps.length - 1)}>
            <FileSearch size={16} aria-hidden /> Preview PDF
          </button>
          <button className="secondary-button" type="button" onClick={() => void printOrDownloadPdf()}>
            <Printer size={16} aria-hidden /> Download PDF
          </button>
          {role === "owner" ? (
            <button className="primary-button" type="button" onClick={() => void copySummary()}>
              <Copy size={16} aria-hidden /> {copied ? "Copied" : "Copy Customer Summary"}
            </button>
          ) : null}
        </div>
      </div>

      {role === "owner" ? <div className="notice muted checklist-editor-intro">Owner/Fadhil read-only. Report ini hanya technician boleh edit.</div> : null}
      <div className="checklist-step-tabs" aria-label="Checklist wizard steps">
        {checklistSteps.map((item, index) => (
          <button className={step === index ? "step active" : "step"} type="button" onClick={() => setStep(index)} key={item}>
            {index + 1}. {item}
          </button>
        ))}
      </div>

      <fieldset className="checklist-fieldset" disabled={!editable}>
        {step === 0 ? (
          <div className="checklist-form-grid">
          <ReadOnlyValue label="No Job" value={draft.jobIdDisplay} />
          <ReadOnlyValue label="Checked By" value={draft.checkedBy} />
          <ReadOnlyValue label="Customer" value={`${draft.customerName} - ${draft.customerPhone}`} />
          <ReadOnlyValue label="Device" value={`${draft.deviceType} ${draft.deviceModel}`} />
          <ReadOnlyValue label="Serial Number" value={draft.serialNumber ?? "-"} />
          <Field label="Catatan" value={draft.catatan} onChange={(value) => setDraft({ ...draft, catatan: value })} multiline />
        </div>
      ) : step === 1 ? (
        <div className="stack">
          <label className="check-row"><input disabled={!editable} type="checkbox" checked={draft.initialCheck.problemVerified} onChange={(event) => setDraft({ ...draft, initialCheck: { ...draft.initialCheck, problemVerified: event.target.checked } })} /> Periksa peranti mengikut masalah yang diterima daripada pelanggan.</label>
          <Field label="Catatan Technician" value={draft.initialCheck.technicianNote} onChange={(value) => setDraft({ ...draft, initialCheck: { ...draft.initialCheck, technicianNote: value } })} multiline />
          <ChecklistImageUploader
            title="Gambar Pemeriksaan Awal"
            section="initialCheck"
            images={draft.initialCheck.images}
            canUpload={canAddChecklistImage(draft, "initialCheck", role, userId)}
            onAdd={addImages}
            onRemove={removeImage}
            onCaption={updateImageCaption}
            onCaptionCommit={commitImageCaption}
          />
        </div>
      ) : step === 2 ? (
        <div className="checklist-form-grid">
          <label className="field"><span>Jenis Drive</span><select disabled={!editable} value={draft.drive.driveType} onChange={(event) => setDraft({ ...draft, drive: { ...draft.drive, driveType: event.target.value as ChecklistReport["drive"]["driveType"] } })}><option>HDD</option><option>SSD SATA</option><option>SSD NVMe</option></select></label>
          <label className="field"><span>Status Drive</span><select disabled={!editable} value={draft.drive.healthStatus} onChange={(event) => setDraft({ ...draft, drive: { ...draft.drive, healthStatus: event.target.value as ChecklistReport["drive"]["healthStatus"] } })}><option>Good</option><option>Warning</option><option>Critical</option></select></label>
          <Field label="Health %" value={draft.drive.healthPercent} onChange={(value) => setDraft({ ...draft, drive: { ...draft.drive, healthPercent: value } })} />
          <Field label="Performance %" value={draft.drive.performancePercent} onChange={(value) => setDraft({ ...draft, drive: { ...draft.drive, performancePercent: value } })} />
          <Field label="Read Speed" value={draft.drive.readSpeed} onChange={(value) => setDraft({ ...draft, drive: { ...draft.drive, readSpeed: value } })} />
          <Field label="Write Speed" value={draft.drive.writeSpeed} onChange={(value) => setDraft({ ...draft, drive: { ...draft.drive, writeSpeed: value } })} />
          <label className="check-row"><input disabled={!editable} type="checkbox" checked={draft.drive.badSectorDetected} onChange={(event) => setDraft({ ...draft, drive: { ...draft.drive, badSectorDetected: event.target.checked } })} /> Bad Sector Detected</label>
          <label className="check-row"><input disabled={!editable} type="checkbox" checked={draft.drive.screenshotTaken} onChange={(event) => setDraft({ ...draft, drive: { ...draft.drive, screenshotTaken: event.target.checked } })} /> Screenshot laporan telah diambil</label>
          <Field label="Catatan Drive" value={draft.drive.note} onChange={(value) => setDraft({ ...draft, drive: { ...draft.drive, note: value } })} multiline />
          <ChecklistImageUploader
            title="Gambar Drive / SMART / Speed Test"
            section="drive"
            images={draft.drive.images}
            canUpload={canAddChecklistImage(draft, "drive", role, userId)}
            onAdd={addImages}
            onRemove={removeImage}
            onCaption={updateImageCaption}
            onCaptionCommit={commitImageCaption}
          />
        </div>
      ) : step === 3 ? (
        <div className="checklist-form-grid">
          <ReadOnlyValue label="Battery Applicable" value={draft.battery.applicable ? "Yes" : "N/A"} />
          <Field label="Design Capacity" value={draft.battery.designCapacity} onChange={(value) => setDraft({ ...draft, battery: { ...draft.battery, designCapacity: value } })} />
          <Field label="Full Charge Capacity" value={draft.battery.fullChargeCapacity} onChange={(value) => setDraft({ ...draft, battery: { ...draft.battery, fullChargeCapacity: value } })} />
          <Field label="Battery Health Anggaran" value={draft.battery.estimatedHealth} onChange={(value) => setDraft({ ...draft, battery: { ...draft.battery, estimatedHealth: value } })} />
          <label className="field"><span>Status</span><select disabled={!editable || !draft.battery.applicable} value={draft.battery.status} onChange={(event) => setDraft({ ...draft, battery: { ...draft.battery, status: event.target.value as ChecklistReport["battery"]["status"] } })}><option>Normal</option><option>Lemah</option><option>Perlu Tukar Battery</option><option>N/A</option></select></label>
          <label className="check-row"><input disabled={!editable || !draft.battery.applicable} type="checkbox" checked={draft.battery.screenshotTaken} onChange={(event) => setDraft({ ...draft, battery: { ...draft.battery, screenshotTaken: event.target.checked } })} /> Screenshot battery report telah diambil</label>
          <Field label="Catatan Battery" value={draft.battery.note} onChange={(value) => setDraft({ ...draft, battery: { ...draft.battery, note: value } })} multiline />
          {draft.battery.applicable ? (
            <ChecklistImageUploader
              title="Gambar Battery Report"
              section="battery"
              images={draft.battery.images}
              canUpload={canAddChecklistImage(draft, "battery", role, userId)}
              onAdd={addImages}
              onRemove={removeImage}
              onCaption={updateImageCaption}
              onCaptionCommit={commitImageCaption}
            />
          ) : (
            <div className="notice muted checklist-image-unavailable">Upload gambar battery tidak dipaparkan kerana section ini N/A untuk PC desktop.</div>
          )}
        </div>
      ) : step === 4 ? (
        <div className="stack">
          <div className="checklist-form-grid">
            <Field label="Jumlah Slot RAM" value={draft.ram.totalSlots} onChange={(value) => setDraft({ ...draft, ram: { ...draft.ram, totalSlots: value } })} />
            <Field label="Slot Digunakan" value={draft.ram.usedSlots} onChange={(value) => setDraft({ ...draft, ram: { ...draft.ram, usedSlots: value } })} />
            <Field label="Slot Kosong" value={draft.ram.emptySlots} onChange={(value) => setDraft({ ...draft, ram: { ...draft.ram, emptySlots: value } })} />
            <label className="field"><span>Jenis RAM</span><select disabled={!editable} value={draft.ram.ramType} onChange={(event) => setDraft({ ...draft, ram: { ...draft.ram, ramType: event.target.value as ChecklistReport["ram"]["ramType"] } })}><option>DDR3</option><option>DDR4</option><option>DDR5</option></select></label>
            <ReadOnlyValue label="Form Factor" value={draft.ram.formFactor} />
            <Field label="Voltage (V)" value={draft.ram.voltage} onChange={(value) => setDraft({ ...draft, ram: { ...draft.ram, voltage: value } })} />
          </div>
          <div className="ram-slot-grid">
            {draft.ram.slots.map((slot, index) => (
              <article className="panel-subtle" key={slot.slot}>
                <h3>Slot {slot.slot}</h3>
                <Field label="Size (GB)" value={slot.sizeGb} onChange={(value) => setDraft({ ...draft, ram: { ...draft.ram, slots: draft.ram.slots.map((item, slotIndex) => slotIndex === index ? { ...item, sizeGb: value } : item) } })} />
                <Field label="Speed (MHz)" value={slot.speedMhz} onChange={(value) => setDraft({ ...draft, ram: { ...draft.ram, slots: draft.ram.slots.map((item, slotIndex) => slotIndex === index ? { ...item, speedMhz: value } : item) } })} />
                <label className="field"><span>Status</span><select disabled={!editable} value={slot.status} onChange={(event) => setDraft({ ...draft, ram: { ...draft.ram, slots: draft.ram.slots.map((item, slotIndex) => slotIndex === index ? { ...item, status: event.target.value as ChecklistReport["ram"]["slots"][number]["status"] } : item) } })}><option>OK</option><option>Tidak Dikesan</option></select></label>
              </article>
            ))}
          </div>
          <Field label="Catatan Tambahan RAM" value={draft.ram.note} onChange={(value) => setDraft({ ...draft, ram: { ...draft.ram, note: value } })} multiline />
          <ChecklistImageUploader
            title="Gambar RAM / Slot / Spec"
            section="ram"
            images={draft.ram.images}
            canUpload={canAddChecklistImage(draft, "ram", role, userId)}
            onAdd={addImages}
            onRemove={removeImage}
            onCaption={updateImageCaption}
            onCaptionCommit={commitImageCaption}
          />
        </div>
      ) : step === 5 ? (
        <div className="stack">
          <Field label="Ringkasan Diagnosis Technician" value={draft.diagnosisSummary} onChange={(value) => setDraft({ ...draft, diagnosisSummary: value })} multiline />
          <ChecklistImageUploader
            title="Gambar Diagnosis Tambahan"
            section="diagnosis"
            images={draft.diagnosisImages}
            canUpload={canAddChecklistImage(draft, "diagnosis", role, userId)}
            onAdd={addImages}
            onRemove={removeImage}
            onCaption={updateImageCaption}
            onCaptionCommit={commitImageCaption}
          />
        </div>
        ) : (
          <ChecklistPdfPreview report={draft} />
        )}
      </fieldset>

      <div className="button-row checklist-wizard-nav">
        <button className="secondary-button" type="button" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Previous</button>
        <button className="secondary-button" type="button" disabled={step === checklistSteps.length - 1} onClick={() => setStep(Math.min(checklistSteps.length - 1, step + 1))}>Next</button>
      </div>
    </section>
  );
}

export function ChecklistImageUploader({
  title,
  section,
  images,
  canUpload,
  onAdd,
  onRemove,
  onCaption,
  onCaptionCommit
}: {
  title: string;
  section: ChecklistImageSection;
  images: ChecklistImage[];
  canUpload: boolean;
  onAdd: (section: ChecklistImageSection, files: FileList | null) => void;
  onRemove: (section: ChecklistImageSection, imageId: string) => void;
  onCaption: (section: ChecklistImageSection, imageId: string, caption: string) => void;
  onCaptionCommit: (section: ChecklistImageSection, imageId: string, caption: string) => void;
}) {
  return (
    <div className="checklist-image-uploader">
      <div className="checklist-image-uploader-header">
        <div>
          <h3>{title}</h3>
          <p className="job-meta">Caption optional. Gambar akan masuk dalam PDF section ini.</p>
        </div>
        {canUpload ? (
          <label className="secondary-button compact checklist-file-button">
            <Upload size={15} aria-hidden /> Add Image
            <input type="file" accept="image/*" multiple onChange={(event) => {
              void onAdd(section, event.currentTarget.files);
              event.currentTarget.value = "";
            }} />
          </label>
        ) : null}
      </div>
      {images.length === 0 ? (
        <EmptyState title="Belum ada gambar" detail="Technician boleh tambah gambar bukti untuk section ini bila perlu." compact />
      ) : (
        <div className="checklist-image-grid">
          {images.map((image) => (
            <figure className="checklist-image-card" key={image.id}>
              <div className="checklist-image-frame">
                <img src={image.dataUrl} alt={image.caption || image.fileName} />
              </div>
              <figcaption>
                <strong>{image.fileName}</strong>
                {canUpload ? (
                  <input
                    value={image.caption ?? ""}
                    placeholder="Caption optional"
                    onBlur={(event) => onCaptionCommit(section, image.id, event.target.value)}
                    onChange={(event) => onCaption(section, image.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                ) : (
                  <span>{image.caption || "No caption"}</span>
                )}
                {canUpload ? <button className="text-button danger" type="button" onClick={() => onRemove(section, image.id)}>Remove image</button> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChecklistPdfImages({ images }: { images: ChecklistImage[] }) {
  if (images.length === 0) {
    return null;
  }
  return (
    <div className="checklist-pdf-image-grid">
      {images.map((image) => (
        <figure className="checklist-pdf-image-card" key={image.id}>
          <div className="checklist-pdf-image-frame">
            <img src={image.dataUrl} alt={image.caption || image.fileName} />
          </div>
          <figcaption>
            <strong>{image.fileName}</strong>
            {image.caption ? <span>{image.caption}</span> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function updateChecklistImageCaptionDraft(report: ChecklistReport, section: ChecklistImageSection, imageId: string, caption: string): ChecklistReport {
  if (section === "diagnosis") {
    return {
      ...report,
      diagnosisImages: (report.diagnosisImages ?? []).map((image) => (image.id === imageId ? { ...image, caption } : image))
    };
  }
  return {
    ...report,
    [section]: {
      ...report[section],
      images: (report[section].images ?? []).map((image) => (image.id === imageId ? { ...image, caption } : image))
    }
  };
}

export function ChecklistPdfPreview({ report }: { report: ChecklistReport }) {
  return (
    <article className="checklist-report-print-area">
      <header className="checklist-pdf-header">
        <div>
          <div className="report-brand">Fadhil CareDesk</div>
          <p>Borang Checklist Laptop / PC</p>
        </div>
        <strong>{report.jobIdDisplay}</strong>
      </header>
      <section className="checklist-pdf-band">
        <strong>Kegunaan Dalaman Kedai</strong>
        <div className="report-table-grid">
          <table className="report-table"><tbody><tr><th>No Job</th><td>{report.jobIdDisplay}</td></tr><tr><th>Checked By</th><td>{report.checkedBy}</td></tr><tr><th>Date Completed</th><td>{report.dateCompleted}</td></tr></tbody></table>
          <table className="report-table"><tbody><tr><th>Catatan</th><td>{report.catatan || "-"}</td></tr></tbody></table>
        </div>
      </section>
      <section className="checklist-pdf-grid">
        <ReportBox title="Maklumat Pelanggan">
          <table className="report-table report-table-full"><tbody><tr><th>Nama Pelanggan</th><td>{report.customerName}</td></tr><tr><th>No Telefon</th><td>{report.customerPhone}</td></tr><tr><th>Jenis Peranti</th><td>{report.deviceType}</td></tr><tr><th>Jenama / Model</th><td>{report.deviceModel}</td></tr><tr><th>Serial Number</th><td>{report.serialNumber ?? "-"}</td></tr></tbody></table>
        </ReportBox>
        <ReportBox title="Pemeriksaan Awal Peranti" className={report.initialCheck.images.length ? "has-images" : undefined}>
          <p className="report-copy">{report.initialCheck.problemVerified ? "Masalah customer telah diperiksa." : "Belum diperiksa."}</p>
          <p className="report-copy">{report.initialCheck.technicianNote}</p>
          <ChecklistPdfImages images={report.initialCheck.images} />
        </ReportBox>
        <ReportBox title="Pemeriksaan Kondisi Drive" className={report.drive.images.length ? "has-images" : undefined}>
          <table className="report-table report-table-full"><tbody><tr><th>Jenis Drive</th><td>{report.drive.driveType}</td></tr><tr><th>Software</th><td>{report.drive.software}</td></tr><tr><th>Status Drive</th><td>{report.drive.healthStatus}</td></tr><tr><th>Bad Sector</th><td>{report.drive.badSectorDetected ? "Detected" : "Not detected"}</td></tr><tr><th>Health / Performance</th><td>{report.drive.healthPercent}% / {report.drive.performancePercent}%</td></tr><tr><th>Read / Write</th><td>{report.drive.readSpeed} / {report.drive.writeSpeed}</td></tr><tr><th>Catatan</th><td>{report.drive.note}</td></tr></tbody></table>
          <ChecklistPdfImages images={report.drive.images} />
        </ReportBox>
        <ReportBox title="Laporan Battery Laptop" className={report.battery.images.length ? "has-images" : undefined}>
          <table className="report-table report-table-full"><tbody><tr><th>Applicable</th><td>{report.battery.applicable ? "Yes" : "N/A"}</td></tr><tr><th>Design Capacity</th><td>{report.battery.designCapacity}</td></tr><tr><th>Full Charge Capacity</th><td>{report.battery.fullChargeCapacity}</td></tr><tr><th>Battery Health</th><td>{report.battery.estimatedHealth}</td></tr><tr><th>Status</th><td>{report.battery.status}</td></tr><tr><th>Catatan</th><td>{report.battery.note}</td></tr></tbody></table>
          <ChecklistPdfImages images={report.battery.images} />
        </ReportBox>
      </section>
      <section className="report-section">
        <h3>Rekod Spesifikasi RAM</h3>
        <table className="report-table report-table-full"><tbody><tr><th>Jumlah Slot</th><td>{report.ram.totalSlots}</td></tr><tr><th>Slot Digunakan</th><td>{report.ram.usedSlots}</td></tr><tr><th>Jenis / Form Factor</th><td>{report.ram.ramType} / {report.ram.formFactor}</td></tr><tr><th>Voltage</th><td>{report.ram.voltage}V</td></tr></tbody></table>
        <table className="report-table report-table-full ram-preview-table"><thead><tr><th>Slot</th><th>Saiz</th><th>Jenis</th><th>Speed</th><th>Status</th></tr></thead><tbody>{report.ram.slots.map((slot) => <tr key={slot.slot}><td>{slot.slot}</td><td>{slot.sizeGb || "-"}</td><td>{slot.ddrType || report.ram.ramType}</td><td>{slot.speedMhz || "-"}</td><td>{slot.status}</td></tr>)}</tbody></table>
        <p className="report-copy">{report.ram.note}</p>
        <ChecklistPdfImages images={report.ram.images} />
      </section>
      <section className="report-section">
        <h3>Ringkasan Diagnosis Technician</h3>
        <p className="report-copy">{report.diagnosisSummary}</p>
        <ChecklistPdfImages images={report.diagnosisImages} />
      </section>
    </article>
  );
}

export function checklistStatusLabel(status: ChecklistReport["status"]): string {
  if (status === "not_started") {
    return "Not Started";
  }
  return status === "draft" ? "Draft" : "Submitted";
}

type NotificationFilter = "Pending" | "Sent" | "Failed" | "Need follow-up";
