import { springs, springToCss, value, type SpringConfig } from "@remold-ui/core";
import type { CSSProperties, ReactNode } from "react";

const HANDLE = "absolute size-[9px] border-[1.5px] border-solid border-(--hm-select) bg-fd-background";
const CORNERS = ["top-0 left-0 -translate-1/2", "top-0 right-0 translate-x-1/2 -translate-y-1/2", "bottom-0 left-0 -translate-x-1/2 translate-y-1/2", "right-0 bottom-0 translate-1/2"];

function Handles() {
  return CORNERS.map((corner) => <span key={corner} aria-hidden="true" className={`${HANDLE} ${corner}`} />);
}

export function Selected({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <span className="relative inline-block px-[0.1em] whitespace-nowrap">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 inset-y-[0.06em] border-[1.5px] border-solid border-(--hm-select) bg-[color-mix(in_oklab,var(--hm-select)_7%,transparent)]"
      >
        <Handles />
      </span>
      <span className="relative">{children}</span>
      {label && (
        <span
          aria-hidden="true"
          className="absolute top-full left-1/2 mt-2.5 -translate-x-1/2 rounded-[5px] bg-(--hm-select) px-1.5 font-mono text-[11px] leading-[18px] font-medium tracking-normal whitespace-nowrap text-white"
        >
          {label}
        </span>
      )}
    </span>
  );
}

export function Kicker({ children, className = "mb-5" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[12px] tracking-[0.08em] text-(--hm-muted) uppercase ${className}`}>
      <span aria-hidden="true" className="size-[7px] border-[1.5px] border-solid border-(--hm-select) bg-fd-background" />
      {children}
    </p>
  );
}

function Ruler() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-3 [background-image:linear-gradient(to_right,var(--hm-line)_1px,transparent_1px),linear-gradient(to_right,var(--hm-line)_1px,transparent_1px)] [background-repeat:repeat-x] [background-size:10px_5px,100px_12px]"
    />
  );
}

export function Rails({ children }: { children: ReactNode }) {
  return (
    <div className="relative border-x border-b border-solid border-(--hm-line)">
      {children}
      <span aria-hidden="true" className={`${HANDLE} bottom-0 left-0 -translate-x-1/2 translate-y-1/2`} />
      <span aria-hidden="true" className={`${HANDLE} right-0 bottom-0 translate-1/2`} />
    </div>
  );
}

export function Rail({
  id,
  as: Tag = "section",
  className = "",
  children,
}: {
  id?: string;
  as?: "section" | "footer";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      id={id}
      className={`relative scroll-mt-20 border-t border-solid border-(--hm-line) px-[clamp(20px,4vw,72px)] py-[clamp(72px,9vw,120px)] ${className}`}
    >
      <Ruler />
      <span aria-hidden="true" className={`${HANDLE} top-0 left-0 -translate-1/2`} />
      <span aria-hidden="true" className={`${HANDLE} top-0 right-0 translate-x-1/2 -translate-y-1/2`} />
      {children}
    </Tag>
  );
}

const PLOT = { left: 44, right: 332, floor: 178, unit: 112, top: 20 };
const SAMPLES_PER_SECOND = 120;
const SECONDS_SHOWN = 0.9;

function springCurve(spring: SpringConfig) {
  const position = value(0, { spring, precision: 0.0005 });
  const samples = [0];

  position.to(1);

  for (let frame = 1; frame <= SECONDS_SHOWN * SAMPLES_PER_SECOND; frame++) {
    position.step(1 / SAMPLES_PER_SECOND);
    samples.push(position.current);
  }

  const x = (index: number) => PLOT.left + (index / (samples.length - 1)) * (PLOT.right - PLOT.left);
  const y = (amount: number) => PLOT.floor - amount * PLOT.unit;
  const peak = samples.indexOf(Math.max(...samples));

  return {
    path: samples.map((amount, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(amount).toFixed(1)}`).join(""),
    peak: { x: x(peak), y: y(samples[peak]!) },
    target: y(1),
    at: (seconds: number) => PLOT.left + (seconds / SECONDS_SHOWN) * (PLOT.right - PLOT.left),
  };
}

export function SpringSpecimen({ spring = springs.snappy }: { spring?: SpringConfig }) {
  const curve = springCurve(spring);
  const css = springToCss(spring);
  const settles = curve.at(spring.duration);
  const travel = { "--hm-travel-ease": css.easing } as CSSProperties;

  return (
    <figure className="m-0 grid gap-5">
      <svg viewBox="0 0 360 214" className="block w-full text-(--hm-ink)" role="img" aria-label={`A spring that takes ${spring.duration} seconds and overshoots a little before it settles`}>
        <g fill="none" stroke="var(--hm-line)" strokeWidth="1">
          <path d={`M${PLOT.left} ${PLOT.top}V${PLOT.floor}H${PLOT.right}`} />
          <path d={`M${PLOT.left} ${curve.target}H${PLOT.right}`} strokeDasharray="3 4" />
        </g>
        <path d={curve.path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <g fill="none" stroke="var(--hm-select)" strokeWidth="1.2">
          <path d={`M${PLOT.left} ${PLOT.floor + 16}H${settles}M${PLOT.left} ${PLOT.floor + 12}v8M${settles} ${PLOT.floor + 12}v8`} />
          <path d={`M${curve.peak.x} ${curve.peak.y - 6}V${curve.target - 22}`} />
        </g>
        <rect x={curve.peak.x - 3.5} y={curve.peak.y - 3.5} width="7" height="7" fill="var(--color-fd-background)" stroke="var(--hm-select)" strokeWidth="1.5" />
        <g className="font-mono" fontSize="10.5" fill="var(--hm-muted)">
          <text x={PLOT.left - 10} y={curve.target + 3.5} textAnchor="end">1</text>
          <text x={PLOT.left - 10} y={PLOT.floor + 3.5} textAnchor="end">0</text>
          <text x={(PLOT.left + settles) / 2} y={PLOT.floor + 32} textAnchor="middle" fill="var(--hm-select)">{spring.duration}s</text>
          <text x={curve.peak.x + 8} y={curve.target - 16} fill="var(--hm-select)">bounce {spring.bounce}</text>
        </g>
      </svg>

      <div className="relative h-7 border-x border-solid border-(--hm-line)" style={travel} aria-hidden="true">
        <span className="absolute inset-x-0 top-1/2 h-px bg-(--hm-line)" />
        <span className="hm-travel absolute top-0 left-0 size-7 rounded-[8px] bg-(--hm-ink)" />
      </div>

      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[12px] text-(--hm-muted)">
        <span className="text-(--hm-ink)">springs.snappy</span>
        <span>
          duration {spring.duration} · bounce {spring.bounce} · settles in {css.duration}ms
        </span>
      </figcaption>
    </figure>
  );
}

const SPECS = [
  { name: "Matching", claim: "Nothing to label", detail: "Wrap the part that changes. Remold works out what stayed from what's on screen: text, images, shape and position." },
  { name: "Sources", claim: "Any markup, any source", detail: "The next view can be another component, a server response or content from a CMS, and it still animates." },
  { name: "Interruptions", claim: "Built to be interrupted", detail: "Every change springs from wherever things are, at the speed they were going. Nothing restarts or jumps." },
  { name: "Accessibility", claim: "Accessible by default", detail: "It follows reduced motion, keeps focus where it was, and can tell screen readers what changed." },
  { name: "Ownership", claim: "Yours to keep", detail: "Every component installs into your project with one command, as plain code you can restyle and change." },
  { name: "Runtime", claim: "React or plain JavaScript", detail: "Use the React components, or call it on any element from plain JavaScript, with any framework or none." },
];

export function SpecSheet() {
  return (
    <dl className="m-0 grid border-t border-solid border-(--hm-line)">
      {SPECS.map((spec, index) => (
        <div
          key={spec.name}
          className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-b border-solid border-(--hm-line) py-5 min-[900px]:grid-cols-[2.5rem_9rem_minmax(0,1fr)]"
        >
          <span aria-hidden="true" className="font-mono text-[12px] leading-6 text-(--hm-muted) tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[12px] leading-6 tracking-[0.04em] text-(--hm-muted) uppercase max-[899px]:hidden">{spec.name}</span>
          <div className="grid gap-1 max-[899px]:col-start-2">
            <dt className="text-[17px] leading-6 font-semibold tracking-[-0.015em]">{spec.claim}</dt>
            <dd className="m-0 max-w-[58ch] text-[15px] leading-[1.6] text-(--hm-muted)">{spec.detail}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
