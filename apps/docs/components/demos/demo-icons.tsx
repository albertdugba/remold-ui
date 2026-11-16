import type { ComponentProps } from "react";

type SvgProps = ComponentProps<"svg">;

export function AuroraMark(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M4 17 12 4l8 13h-5l-3-5-3 5Z" />
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

export function GoogleLogo(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

export function GitHubLogo(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

export function RemoldLogo(props: SvgProps) {
  return (
    <svg viewBox="6 6 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z" />
    </svg>
  );
}
