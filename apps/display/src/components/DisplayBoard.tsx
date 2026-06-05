"use client";

import { useEffect, useState, startTransition } from "react";
import type { CaredeskDisplayLane, CaredeskDisplaySnapshot, CaredeskDisplaySection } from "@repair-ops/domain";
import { createDisplayEventSource, fetchDisplaySnapshot } from "../lib/display-client";

type ConnectionState = "loading" | "live" | "reconnecting" | "error";

export function DisplayBoard({ kiosk = false }: { kiosk?: boolean }) {
  const [snapshot, setSnapshot] = useState<CaredeskDisplaySnapshot | undefined>();
  const [connectionState, setConnectionState] = useState<ConnectionState>("loading");
  const [error, setError] = useState<string | undefined>();
  const [clock, setClock] = useState<Date | undefined>();

  useEffect(() => {
    const applySnapshot = (next: CaredeskDisplaySnapshot) => {
      startTransition(() => {
        setSnapshot(next);
        setConnectionState("live");
        setError(undefined);
      });
    };

    const refreshSnapshot = async () => {
      try {
        const next = await fetchDisplaySnapshot();
        applySnapshot(next);
      } catch (refreshError) {
        setConnectionState((current) => (current === "live" ? "reconnecting" : "error"));
        setError(refreshError instanceof Error ? refreshError.message : "Display snapshot unavailable.");
      }
    };

    void refreshSnapshot();

    const source = createDisplayEventSource();
    source.addEventListener("snapshot", (event) => {
      try {
        applySnapshot(JSON.parse(event.data) as CaredeskDisplaySnapshot);
      } catch {
        setConnectionState("error");
        setError("Display stream returned invalid snapshot data.");
      }
    });
    source.addEventListener("heartbeat", () => {
      setConnectionState("live");
    });
    source.onerror = () => {
      setConnectionState("reconnecting");
    };

    const poll = window.setInterval(() => {
      void refreshSnapshot();
    }, 45_000);

    return () => {
      window.clearInterval(poll);
      source.close();
    };
  }, []);

  useEffect(() => {
    setClock(new Date());
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 1_000);
    return () => window.clearInterval(timer);
    }, []);

  const visibleLanes = snapshot ? snapshot.lanes.map(toVisibleLane).filter((lane) => lane.sections.length > 0) : [];
  const footerSummary = snapshot ? snapshot.footerSummary.filter((item) => item.count > 0) : [];
  const hasAnyActiveWork = visibleLanes.length > 0;
  const hasFooterContent = footerSummary.length > 0 || Boolean(error) || Boolean(snapshot);
  const boardClassName = laneGridClassName(visibleLanes.length);

  return (
    <div className={kiosk ? "display-shell kiosk" : "display-shell"}>
      <header className="display-header">
        <div>
          <p className="eyebrow">Fadhil CareDesk</p>
          <h1>Action-First Morning Board</h1>
          {kiosk ? null : <p className="subtle">Paparan operasi ringkas untuk TV, monitor, tablet, dan telefon.</p>}
        </div>
        <div className="status-stack">
          <div className={`connection-pill ${connectionState}`}>
            <span className="dot" />
            {labelForConnection(connectionState)}
          </div>
          <div className="clock-card">
            <strong>{clock ? clock.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: kiosk ? undefined : "2-digit" }) : "--:--"}</strong>
            <span>{clock ? clock.toLocaleDateString("en-MY", { weekday: "short", day: "2-digit", month: "short" }) : "-- ---"}</span>
          </div>
        </div>
      </header>

      {snapshot && !hasAnyActiveWork ? (
        <main className="empty-board" aria-live="polite">
          <p className="lane-label">Semua Queue Kosong</p>
          <h2>Tiada kerja aktif sekarang</h2>
          <p>Paparan ini akan dikemas kini secara langsung bila status berubah.</p>
        </main>
      ) : (
        <main className={boardClassName}>
          {visibleLanes.map((lane) => (
            <LaneColumn key={lane.key} lane={lane} />
          ))}
        </main>
      )}

      {hasFooterContent ? (
        <footer className={`board-footer${kiosk ? " compact" : ""}`}>
          {footerSummary.length ? (
            <section className="footer-summary">
              {footerSummary.map((item) => (
                <article className="footer-card" key={item.key}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </article>
              ))}
            </section>
          ) : null}
          <div className="footer-meta">
            <span>Last synced: {snapshot ? new Date(snapshot.generatedAt).toLocaleTimeString("en-MY") : "--:--"}</span>
            {error ? <span className="footer-error">{error}</span> : kiosk ? <span>Tiada data pelanggan dipaparkan.</span> : null}
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function LaneColumn({ lane }: { lane: CaredeskDisplayLane }) {
  return (
    <section className={`lane-column lane-${lane.key}`}>
      <div className="lane-heading">
        <div>
          <p className="lane-label">{lane.label}</p>
          <h2>{lane.count} item</h2>
        </div>
      </div>
      <div className="lane-sections">
        {lane.sections.map((section) => (
          <LaneSection key={section.key} section={section} />
        ))}
      </div>
    </section>
  );
}

function LaneSection({ section }: { section: CaredeskDisplaySection }) {
  return (
    <article className={`section-card tone-${section.tone}`}>
      <header className="section-heading">
        <div>
          <p>{section.label}</p>
          <span>{section.count} rujukan</span>
        </div>
        {section.key === "unclaimed" ? <span className="warning-badge">Perlu perhatian</span> : null}
      </header>
      <div className="ticket-grid">
        {section.items.map((item) => (
          <div className="ticket-card" key={`${item.status}-${item.jobIdDisplay}`}>
            <strong>{item.jobIdDisplay}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function toVisibleLane(lane: CaredeskDisplayLane): CaredeskDisplayLane {
  const sections = lane.sections.filter((section) => section.count > 0);
  const count = sections.reduce((total, section) => total + section.count, 0);
  return {
    ...lane,
    count,
    sections
  };
}

function laneGridClassName(count: number) {
  if (count <= 1) {
    return "board-grid lanes-1";
  }
  if (count === 2) {
    return "board-grid lanes-2";
  }
  return "board-grid lanes-3";
}

function labelForConnection(state: ConnectionState) {
  switch (state) {
    case "live":
      return "Live";
    case "reconnecting":
      return "Reconnecting";
    case "error":
      return "Error";
    default:
      return "Loading";
  }
}
