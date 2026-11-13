"use client";

import { bounds, parsePath, samplePath, toCubics } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { useMemo, type Ref } from "react";
import { encode } from "uqr";
import { useControllableState } from "./use-controllable-state";

const REMOLD_MARK =
  "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";

const CODE_SIZE = 200;
const DETAIL = 2;
const LOGO_INSET = 2;
const INK = "#0a0a0b";
const SPRING = { duration: 0.8, bounce: 0.1 };

interface Module {
  x: number;
  y: number;
}

const CELLS = Array.from({ length: DETAIL * DETAIL }, (_, index) => ({ x: index % DETAIL, y: Math.floor(index / DETAIL) }));

function codeModules(value: string) {
  const { size, data } = encode(value, { ecc: "M", border: 0 });
  const modules: Module[] = data.flatMap((row, y) =>
    row.flatMap((dark, x) => (dark ? CELLS.map((cell) => ({ x: x * DETAIL + cell.x + 0.5, y: y * DETAIL + cell.y + 0.5 })) : [])),
  );

  return { size: size * DETAIL, modules };
}

function logoModules(path: string, size: number): Module[] {
  const box = bounds(toCubics(parsePath(path)));

  if (!box) return [];

  const spacing = Math.max(box.width, box.height) / (size - LOGO_INSET * 2);
  const sampled = samplePath(path, { spacing, pattern: "grid" });
  const left = Math.min(...sampled.map((point) => point.x));
  const top = Math.min(...sampled.map((point) => point.y));
  const cells = sampled.map((point) => ({
    column: Math.round((point.x - left) / spacing),
    row: Math.round((point.y - top) / spacing),
  }));
  const columns = Math.max(...cells.map((cell) => cell.column)) + 1;
  const rows = Math.max(...cells.map((cell) => cell.row)) + 1;
  const inset = { x: Math.floor((size - columns) / 2), y: Math.floor((size - rows) / 2) };

  return cells.map((cell) => ({ x: inset.x + cell.column + 0.5, y: inset.y + cell.row + 0.5 }));
}

export interface QrCodeProps {
  value: string;
  title: string;
  logo?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLElement>;
}

export function QrCode({ value, title, logo = REMOLD_MARK, open, defaultOpen = false, onOpenChange, ref }: QrCodeProps) {
  const [shown, setShown] = useControllableState({ value: open, defaultValue: defaultOpen, onValueChange: onOpenChange });
  const code = useMemo(() => codeModules(value), [value]);
  const mark = useMemo(() => logoModules(logo, code.size), [logo, code.size]);
  const address = value.replace(/^https?:\/\//, "");

  return (
    <section
      ref={ref}
      className="not-prose grid w-[296px] max-w-full gap-4 rounded-[28px] bg-(--qr-surface) p-4 font-sans text-(--qr-ink) antialiased [--qr-ink:#0a0a0b] [--qr-muted:#71717a] [--qr-paper:#f4f4f5] [--qr-surface:#ffffff] [--qr-well:#f4f4f5] dark:[--qr-ink:#fafafa] dark:[--qr-muted:#a1a1aa] dark:[--qr-paper:#ffffff] dark:[--qr-surface:#18181b] dark:[--qr-well:#26262b]"
      aria-label={title}
    >
      <div className="grid place-items-center rounded-[20px] bg-(--qr-paper) p-8">
        <Remold.Particles
          className="block"
          style={{ width: CODE_SIZE, height: CODE_SIZE }}
          shape={{ points: shown ? code.modules : mark }}
          fit={{ width: code.size, height: code.size }}
          padding={0}
          radius={CODE_SIZE / code.size / 2}
          dot="square"
          color={INK}
          pointer={false}
          spring={SPRING}
          label={shown ? `QR code for ${address}` : `${title} logo`}
        />
      </div>
      <div className="grid justify-items-center gap-0.5 text-center">
        <span className="text-[15px] font-semibold tracking-[-0.01em]">{title}</span>
        <span className="text-[13px] text-(--qr-muted)">{address}</span>
      </div>
      <button
        type="button"
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
        className={`h-10 cursor-pointer rounded-full border-0 text-[14px] font-semibold outline-none transition-[background-color,color,scale] duration-150 ease-out focus-visible:shadow-[0_0_0_2px_var(--qr-surface),0_0_0_4px_var(--qr-ink)] active:scale-[0.97] motion-reduce:transition-none ${
          shown ? "bg-(--qr-well) text-(--qr-ink)" : "bg-(--qr-ink) text-(--qr-surface)"
        }`}
      >
        <Remold.Text>{shown ? "Hide QR code" : "Show QR code"}</Remold.Text>
      </button>
    </section>
  );
}

export function QrCodeDemo() {
  return (
    <div className="grid w-full place-items-center">
      <QrCode value="https://remoldui.xyz" title="Remold UI" />
    </div>
  );
}
