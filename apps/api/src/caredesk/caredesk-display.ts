import type {
  CaredeskDisplayJob,
  CaredeskDisplayLane,
  CaredeskDisplaySnapshot,
  CaredeskDisplaySection,
  CaredeskDisplaySectionTone,
  CaredeskJobStatus
} from "../../../../packages/domain/src";
import { caredeskJobStatuses } from "../../../../packages/domain/src";

export interface CaredeskDisplayRow {
  jobIdDisplay: string;
  status: CaredeskJobStatus;
  updatedAt: string;
  readyPickupDate?: string;
}

interface BuildSnapshotOptions {
  now?: Date;
  revision: number;
}

const displayLaneBlueprint: Array<{
  key: CaredeskDisplayLane["key"];
  label: string;
  sections: Array<{ key: string; label: string; tone: CaredeskDisplaySectionTone; statuses: CaredeskJobStatus[] }>;
}> = [
  {
    key: "action_required",
    label: "Perlu Buat Dulu",
    sections: [
      { key: "new_job", label: "New Job", tone: "neutral", statuses: ["NEW JOB"] },
      { key: "fadhil_review", label: "Waiting Fadhil Review", tone: "warning", statuses: ["WAITING FADHIL REVIEW"] }
    ]
  },
  {
    key: "in_flight",
    label: "Sedang Jalan",
    sections: [
      { key: "in_progress", label: "In Progress", tone: "progress", statuses: ["IN PROGRESS"] },
      { key: "customer_confirmation", label: "Waiting Customer Confirmation", tone: "muted", statuses: ["WAITING CUSTOMER CONFIRMATION"] }
    ]
  },
  {
    key: "ready_backlog",
    label: "Siap / Tertunggak",
    sections: [
      { key: "ready_pickup", label: "Ready Pickup", tone: "success", statuses: ["READY PICKUP"] },
      { key: "unclaimed", label: "Unclaimed", tone: "danger", statuses: ["UNCLAIMED"] }
    ]
  }
];

export function buildDisplaySnapshot(rows: CaredeskDisplayRow[], options: BuildSnapshotOptions): CaredeskDisplaySnapshot {
  const now = options.now ?? new Date();
  const counts = caredeskJobStatuses.reduce<Record<CaredeskJobStatus, number>>(
    (result, status) => ({ ...result, [status]: 0 }),
    {} as Record<CaredeskJobStatus, number>
  );

  for (const row of rows) {
    counts[row.status] += 1;
  }

  const lanes = displayLaneBlueprint.map((lane) => {
    const sections = lane.sections.map((section) => buildSection(section, rows));
    return {
      key: lane.key,
      label: lane.label,
      count: sections.reduce((total, section) => total + section.count, 0),
      sections
    } satisfies CaredeskDisplayLane;
  });

  const footerSummary = [
    { key: "not_proceed", label: "Not Proceed", count: counts["NOT PROCEED"] },
    { key: "complete_today", label: "Complete Hari Ini", count: rows.filter((row) => row.status === "COMPLETE" && isSameLocalDay(row.updatedAt, now)).length }
  ] satisfies CaredeskDisplaySnapshot["footerSummary"];

  return {
    generatedAt: now.toISOString(),
    revision: options.revision,
    counts,
    lanes,
    footerSummary
  };
}

function buildSection(
  section: { key: string; label: string; tone: CaredeskDisplaySectionTone; statuses: CaredeskJobStatus[] },
  rows: CaredeskDisplayRow[]
): CaredeskDisplaySection {
  const items = rows
    .filter((row) => section.statuses.includes(row.status))
    .map(sanitizeDisplayRow)
    .sort(compareDisplayRows);

  return {
    key: section.key,
    label: section.label,
    tone: section.tone,
    statuses: section.statuses,
    count: items.length,
    items
  };
}

function sanitizeDisplayRow(row: CaredeskDisplayRow): CaredeskDisplayJob {
  return {
    jobIdDisplay: row.jobIdDisplay,
    status: row.status,
    updatedAt: row.updatedAt,
    readyPickupDate: row.readyPickupDate
  };
}

function compareDisplayRows(left: CaredeskDisplayJob, right: CaredeskDisplayJob) {
  const leftReady = left.readyPickupDate ? Date.parse(left.readyPickupDate) : Number.NaN;
  const rightReady = right.readyPickupDate ? Date.parse(right.readyPickupDate) : Number.NaN;
  if (!Number.isNaN(leftReady) || !Number.isNaN(rightReady)) {
    if (!Number.isNaN(leftReady) && !Number.isNaN(rightReady) && leftReady !== rightReady) {
      return leftReady - rightReady;
    }
    if (!Number.isNaN(leftReady)) return -1;
    if (!Number.isNaN(rightReady)) return 1;
  }

  const updatedDelta = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  return left.jobIdDisplay.localeCompare(right.jobIdDisplay);
}

function isSameLocalDay(value: string, now: Date) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
