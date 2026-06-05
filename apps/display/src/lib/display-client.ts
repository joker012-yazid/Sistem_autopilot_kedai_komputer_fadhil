import type { CaredeskDisplaySnapshot } from "@repair-ops/domain";

function isLocalHostname(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    if (window.location.port === "3001" && isLocalHostname(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return window.location.origin;
  }
  return "http://127.0.0.1:4000";
}

export async function fetchDisplaySnapshot() {
  const response = await fetch(`${apiBaseUrl()}/caredesk/display/snapshot`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Display snapshot failed with ${response.status}`);
  }
  return response.json() as Promise<CaredeskDisplaySnapshot>;
}

export function createDisplayEventSource() {
  return new EventSource(`${apiBaseUrl()}/caredesk/display/stream`);
}
