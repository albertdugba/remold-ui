/** An outline icon from `icons` that morphs whenever `name` changes, on the page's motion settings. */
import { Remold } from "@remold-ui/react";
import type { SpringConfig } from "@remold-ui/core";
import { icons, type IconName } from "../icons";
import { useMotion } from "../motion";

export function MorphIcon({
  name,
  className,
  label,
  spring,
}: {
  name: IconName;
  className?: string;
  label?: string;
  spring?: SpringConfig;
}) {
  const { loop, reducedMotion } = useMotion();
  return (
    <Remold.Icon
      className={className}
      d={icons[name]}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      spring={spring}
      loop={loop}
      reducedMotion={reducedMotion}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}

/** The same icons, drawn still. */
export function StaticIcon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name]} />
    </svg>
  );
}
