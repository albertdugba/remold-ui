"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { parsePath } from "@remold-ui/core";
import { Remold } from "@remold-ui/react";
import { arc, pie } from "d3-shape";
import { useMemo, type Ref } from "react";
import { useControllableState } from "./use-controllable-state";

export interface ChartSegment {
  name: string;
  value: number;
}

export type ChartKind = "donut" | "bars";

const SPENDING: ChartSegment[] = [
  { name: "Rent", value: 980 },
  { name: "Food", value: 620 },
  { name: "Travel", value: 410 },
  { name: "Bills", value: 300 },
  { name: "Fun", value: 170 },
];

const COLORS = ["#4338ca", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];
const KINDS: ChartKind[] = ["donut", "bars"];
const RESHAPE = { duration: 0.7, bounce: 0.15 };

const VIEW = { width: 240, height: 160 };
const MIDDLE = { x: VIEW.width / 2, y: VIEW.height / 2 };
const RING = { inner: 44, outer: 72, corner: 6, gap: 0.04 };
const BAR = { width: 30, gap: 12, corner: 6, tallest: 144 };

const pounds = (amount: number) => `£${amount.toLocaleString("en-GB")}`;

function centred(path: string): string {
  return parsePath(path)
    .map((command) => {
      if (command.type === "Z") return "Z";

      const end = `${command.x + MIDDLE.x} ${command.y + MIDDLE.y}`;

      if (command.type === "A") {
        return `A${command.rx} ${command.ry} ${command.rotation} ${command.largeArc ? 1 : 0} ${command.sweep ? 1 : 0} ${end}`;
      }

      if (command.type === "C") {
        return `C${command.x1 + MIDDLE.x} ${command.y1 + MIDDLE.y} ${command.x2 + MIDDLE.x} ${command.y2 + MIDDLE.y} ${end}`;
      }

      if (command.type === "Q") return `Q${command.x1 + MIDDLE.x} ${command.y1 + MIDDLE.y} ${end}`;

      return `${command.type}${end}`;
    })
    .join("");
}

function donutPaths(segments: readonly ChartSegment[]): string[] {
  const slices = pie<ChartSegment>()
    .sort(null)
    .padAngle(RING.gap)
    .value((segment) => segment.value)([...segments]);
  const ring = arc<(typeof slices)[number]>().innerRadius(RING.inner).outerRadius(RING.outer).cornerRadius(RING.corner);

  return slices.map((slice) => centred(ring(slice) ?? ""));
}

function barPaths(segments: readonly ChartSegment[]): string[] {
  const largest = Math.max(...segments.map((segment) => segment.value));
  const span = segments.length * BAR.width + (segments.length - 1) * BAR.gap;
  const floor = MIDDLE.y + BAR.tallest / 2;
  const { width, corner } = BAR;

  return segments.map((segment, index) => {
    const height = Math.max(corner * 2, (segment.value / largest) * BAR.tallest);
    const left = MIDDLE.x - span / 2 + index * (width + BAR.gap);
    const top = floor - height;
    const flat = width - corner * 2;
    const side = height - corner * 2;

    return `M${left} ${top + corner}a${corner} ${corner} 0 0 1 ${corner} ${-corner}h${flat}a${corner} ${corner} 0 0 1 ${corner} ${corner}v${side}a${corner} ${corner} 0 0 1 ${-corner} ${corner}h${-flat}a${corner} ${corner} 0 0 1 ${-corner} ${-corner}Z`;
  });
}

export interface ChartSwitchProps {
  title: string;
  period?: string;
  segments: readonly ChartSegment[];
  value?: ChartKind;
  defaultValue?: ChartKind;
  onValueChange?: (kind: ChartKind) => void;
  ref?: Ref<HTMLElement>;
}

export function ChartSwitch({ title, period, segments, value, defaultValue = "donut", onValueChange, ref }: ChartSwitchProps) {
  const [kind, setKind] = useControllableState({ value, defaultValue, onValueChange });
  const shapes = useMemo(() => ({ donut: donutPaths(segments), bars: barPaths(segments) }), [segments]);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <section
      ref={ref}
      className="not-prose grid w-[340px] max-w-full gap-5 rounded-[24px] bg-(--cs-surface) p-5 font-sans text-(--cs-ink) antialiased [--cs-ink:#0a0a0b] [--cs-muted:#71717a] [--cs-surface:#ffffff] [--cs-well:#f4f4f5] dark:[--cs-ink:#fafafa] dark:[--cs-muted:#a1a1aa] dark:[--cs-surface:#18181b] dark:[--cs-well:#26262b]"
      aria-label={title}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="grid gap-px">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">{title}</span>
          {period && <span className="text-[13px] text-(--cs-muted)">{period}</span>}
        </div>
        <ToggleGroup
          aria-label="Chart type"
          className="flex rounded-full bg-(--cs-well) p-[3px]"
          value={[kind]}
          onValueChange={([picked]) => picked && setKind(picked as ChartKind)}
        >
          {KINDS.map((option) => (
            <Toggle
              key={option}
              value={option}
              className="h-7 cursor-pointer rounded-full border-0 bg-transparent px-3 text-[13px] font-medium text-(--cs-muted) capitalize outline-none transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:shadow-[0_0_0_2px_var(--cs-ink)] data-pressed:bg-(--cs-surface) data-pressed:text-(--cs-ink) data-pressed:shadow-[0_1px_2px_rgb(0_0_0/0.08)] motion-reduce:transition-none"
            >
              {option}
            </Toggle>
          ))}
        </ToggleGroup>
      </header>

      <div className="relative">
        <Remold.PathGroup
          className="block w-full"
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          role="img"
          aria-label={`${title} by category, as ${kind === "donut" ? "a donut chart" : "bars"}`}
          spring={RESHAPE}
          paths={segments.map((segment, index) => ({
            id: segment.name,
            path: shapes[kind][index]!,
            fill: COLORS[index % COLORS.length],
          }))}
        />
        <div
          data-shown={kind === "donut" || undefined}
          className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center text-center opacity-0 transition-opacity duration-200 ease-out data-shown:opacity-100 data-shown:delay-200 motion-reduce:transition-none"
        >
          <span className="text-[17px] font-semibold tracking-[-0.02em] tabular-nums">{pounds(total)}</span>
          <span className="text-[12px] text-(--cs-muted)">spent</span>
        </div>
      </div>

      <ul className="m-0 grid list-none gap-2 p-0 text-[13.5px]">
        {segments.map((segment, index) => (
          <li key={segment.name} className="flex items-center gap-2.5">
            <span className="size-2.5 flex-none rounded-full" style={{ background: COLORS[index % COLORS.length] }} aria-hidden="true" />
            <span className="flex-1">{segment.name}</span>
            <span className="text-(--cs-muted) tabular-nums">{pounds(segment.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ChartSwitchDemo() {
  return (
    <div className="grid w-full place-items-center">
      <ChartSwitch title="Spending" period="October" segments={SPENDING} />
    </div>
  );
}
