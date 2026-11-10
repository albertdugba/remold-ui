import type { ComponentProps } from "react";

type SvgProps = ComponentProps<"svg">;

export function AuroraMark(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M4 17 12 4l8 13h-5l-3-5-3 5Z" />
    </svg>
  );
}

export function NorthwindMark(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M5 18V6l7 7 7-7v12h-4v-4l-3 3-3-3v4Z" />
    </svg>
  );
}

export function MeridianMark(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
    </svg>
  );
}

export function FlightArc(props: SvgProps) {
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" {...props}>
      <path d="M3 26 Q50 -8 97 26" />
    </svg>
  );
}

export function ProductShirtIcon(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <path d="M24 10l8 5 8-5 10 5 6 16-7 3v20H15V34l-7-3 6-16Z" />
      <path d="M32 15v39M26 30h-4M42 30h-4" />
    </svg>
  );
}

export function ArrowUpIcon(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function TaskStatusIcon({ status, ...props }: SvgProps & { status: "done" | "progress" | "todo" }) {
  return (
    <svg
      className="size-3.5 flex-none text-(--tl-todo) data-[status=done]:text-(--tl-done) data-[status=progress]:text-(--tl-progress)"
      data-status={status}
      viewBox="0 0 14 14"
      aria-hidden="true"
      {...props}
    >
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {status === "progress" ? (
        <path d="M7 3.5a3.5 3.5 0 0 1 0 7Z" fill="currentColor" />
      ) : status === "done" ? (
        <>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path
            d="m4.6 7.1 1.6 1.6 3.2-3.3"
            fill="none"
            stroke="var(--tl-surface)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
    </svg>
  );
}
