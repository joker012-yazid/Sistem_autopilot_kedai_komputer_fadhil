import { describe, expect, it } from "vitest";
import { buildDisplaySnapshot, type CaredeskDisplayRow } from "./caredesk-display";

describe("buildDisplaySnapshot", () => {
  it("maps statuses into the Action-First lanes and footer summary", () => {
    const rows: CaredeskDisplayRow[] = [
      { jobIdDisplay: "NO.0001", status: "READY PICKUP", updatedAt: "2026-06-05T08:00:00.000Z", readyPickupDate: "2026-06-01" },
      { jobIdDisplay: "NO.0002", status: "WAITING FADHIL REVIEW", updatedAt: "2026-06-05T06:00:00.000Z" },
      { jobIdDisplay: "NO.0003", status: "NEW JOB", updatedAt: "2026-06-05T05:00:00.000Z" },
      { jobIdDisplay: "NO.0004", status: "IN PROGRESS", updatedAt: "2026-06-04T12:00:00.000Z" },
      { jobIdDisplay: "NO.0005", status: "WAITING CUSTOMER CONFIRMATION", updatedAt: "2026-06-05T07:00:00.000Z" },
      { jobIdDisplay: "NO.0006", status: "UNCLAIMED", updatedAt: "2026-06-03T08:00:00.000Z", readyPickupDate: "2026-05-01" },
      { jobIdDisplay: "NO.0007", status: "NOT PROCEED", updatedAt: "2026-06-05T03:00:00.000Z" },
      { jobIdDisplay: "NO.0008", status: "COMPLETE", updatedAt: "2026-06-05T09:00:00.000Z" }
    ];

    const snapshot = buildDisplaySnapshot(rows, {
      revision: 7,
      now: new Date("2026-06-05T12:00:00.000Z")
    });

    expect(snapshot.revision).toBe(7);
    expect(snapshot.counts["NEW JOB"]).toBe(1);
    expect(snapshot.counts["UNCLAIMED"]).toBe(1);
    expect(snapshot.lanes.map((lane) => lane.key)).toEqual(["action_required", "in_flight", "ready_backlog"]);
    expect(snapshot.lanes[0].sections[0].items.map((item) => item.jobIdDisplay)).toEqual(["NO.0003"]);
    expect(snapshot.lanes[0].sections[1].items.map((item) => item.jobIdDisplay)).toEqual(["NO.0002"]);
    expect(snapshot.lanes[1].sections[0].items.map((item) => item.jobIdDisplay)).toEqual(["NO.0004"]);
    expect(snapshot.lanes[1].sections[1].items.map((item) => item.jobIdDisplay)).toEqual(["NO.0005"]);
    expect(snapshot.lanes[2].sections[0].items.map((item) => item.jobIdDisplay)).toEqual(["NO.0001"]);
    expect(snapshot.lanes[2].sections[1].items.map((item) => item.jobIdDisplay)).toEqual(["NO.0006"]);
    expect(snapshot.footerSummary).toEqual([
      { key: "not_proceed", label: "Not Proceed", count: 1 },
      { key: "complete_today", label: "Complete Hari Ini", count: 1 }
    ]);
  });

  it("only returns display-safe fields for each card and sorts oldest items first", () => {
    const rows = [
      {
        jobIdDisplay: "NO.1002",
        status: "READY PICKUP",
        updatedAt: "2026-06-05T11:00:00.000Z",
        readyPickupDate: "2026-06-05",
        customerName: "Should not leak"
      },
      {
        jobIdDisplay: "NO.1001",
        status: "READY PICKUP",
        updatedAt: "2026-06-05T10:00:00.000Z",
        readyPickupDate: "2026-06-01",
        customerPhone: "Should not leak"
      }
    ] as Array<CaredeskDisplayRow & Record<string, unknown>>;

    const snapshot = buildDisplaySnapshot(rows, { revision: 2, now: new Date("2026-06-05T12:00:00.000Z") });
    const readyPickupItems = snapshot.lanes[2].sections[0].items;

    expect(readyPickupItems.map((item) => item.jobIdDisplay)).toEqual(["NO.1001", "NO.1002"]);
    expect(readyPickupItems[0]).toEqual({
      jobIdDisplay: "NO.1001",
      status: "READY PICKUP",
      updatedAt: "2026-06-05T10:00:00.000Z",
      readyPickupDate: "2026-06-01"
    });
    expect(Object.keys(readyPickupItems[0]).sort()).toEqual(["jobIdDisplay", "readyPickupDate", "status", "updatedAt"]);
  });
});
