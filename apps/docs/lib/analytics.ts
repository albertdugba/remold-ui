export const EVENTS = ["Copy install", "Copy code", "Copy markdown", "Copy dependencies", "Studio export"] as const;

export type UsageEvent = (typeof EVENTS)[number];

export type EventProps = {
  component?: string;
  source?: string;
  detail?: string;
};

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: EventProps) => void;
  }
}

const ENDPOINT = "/api/event";
const enabled = process.env.NODE_ENV === "production";

export function track(event: UsageEvent, props: EventProps = {}) {
  if (!enabled || typeof navigator === "undefined") return;
  // Google Analytics event names allow letters, digits and underscores only.
  window.gtag?.("event", event.toLowerCase().replaceAll(" ", "_"), props);
  const body = JSON.stringify({ event, ...props });
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
}
