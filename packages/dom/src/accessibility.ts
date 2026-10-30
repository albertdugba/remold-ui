/**
 * Accessibility helpers: telling screen-reader users what changed, and honouring reduced motion.
 */

/** Whether to animate with movement. `"user"` follows the system setting. */
export type ReducedMotion = "user" | "always" | "never";

/** True when the user has asked the system for less motion. False outside the browser. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resolveReducedMotion(setting: ReducedMotion = "user"): boolean {
  return setting === "always" || (setting === "user" && prefersReducedMotion());
}

const LIVE_REGION_ATTRIBUTE = "data-rm-announcer";

/**
 * Say `message` to screen-reader users without moving focus, through a shared, visually hidden
 * polite live region. Repeating the same message is still announced.
 */
export function announce(message: string): void {
  if (typeof document === "undefined" || !message) return;

  let region = document.querySelector<HTMLElement>(`[${LIVE_REGION_ATTRIBUTE}]`);

  if (!region) {
    region = document.createElement("div");
    region.setAttribute(LIVE_REGION_ATTRIBUTE, "");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    Object.assign(region.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      margin: "-1px",
      padding: "0",
      overflow: "hidden",
      clip: "rect(0 0 0 0)",
      whiteSpace: "nowrap",
      border: "0",
    });
    document.body.append(region);
  }

  region.textContent = "";

  const target = region;

  setTimeout(() => {
    target.textContent = message;
  }, 50);
}
