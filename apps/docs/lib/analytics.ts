export const EVENTS = ["Copy install", "Copy code", "Copy markdown", "Copy dependencies"] as const;

export type UsageEvent = (typeof EVENTS)[number];

export type EventProps = {
  component?: string;
  source?: string;
  detail?: string;
};

const ENDPOINT = "/api/event";
const enabled = process.env.NODE_ENV === "production";

export function track(event: UsageEvent, props: EventProps = {}) {
  if (!enabled || typeof navigator === "undefined") return;
  const body = JSON.stringify({ event, ...props });
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
}
