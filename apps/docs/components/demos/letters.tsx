"use client";

import {
  createMorph,
  parsePath,
  subdivide,
  toCubics,
  value,
  type Morph,
  type Subpath,
} from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { springs } from "@remold-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Segmented } from "./frame";
import { GLYPHS } from "./glyphs-data";
import "./letters.css";

interface Laid {
  subpaths: Subpath[];
  width: number;
  ascent: number;
  descent: number;
}

const glyphs = GLYPHS.glyphs as Record<string, { d: string; adv: number }>;
const kerning = GLYPHS.kern as Record<string, number>;
const outlines = new Map<string, Subpath[]>();
const outline = (ch: string) => {
  let cached = outlines.get(ch);
  if (!cached) {
    const d = glyphs[ch]?.d ?? "";
    cached = d ? toCubics(parsePath(d)) : [];
    outlines.set(ch, cached);
  }
  return cached;
};

function layout(text: string, size: number): Laid {
  const k = size / GLYPHS.upm;
  const subpaths: Subpath[] = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = glyphs[text[i]!] ? text[i]! : "?";
    const dx = x;
    for (const sp of outline(ch)) {
      const at = (p: { x: number; y: number }) => ({
        x: p.x * k + dx,
        y: p.y * k,
      });
      subpaths.push({
        closed: sp.closed,
        segments: sp.segments.map((c) => ({
          p0: at(c.p0),
          p1: at(c.p1),
          p2: at(c.p2),
          p3: at(c.p3),
        })),
      });
    }
    x += glyphs[ch]!.adv * k;
    if (i < text.length - 1) x += (kerning[ch + text[i + 1]] ?? 0) * k;
  }
  return {
    subpaths,
    width: x,
    ascent: GLYPHS.asc * k,
    descent: -GLYPHS.desc * k,
  };
}

function densify(subpaths: Subpath[], step: number): Float32Array[] {
  return subpaths.map((sp) => {
    const length = sp.segments.reduce(
      (sum, c) => sum + Math.hypot(c.p3.x - c.p0.x, c.p3.y - c.p0.y),
      0,
    );
    const fine = subdivide(
      sp,
      Math.max(sp.segments.length, Math.round(length / step)),
    );
    const buf = new Float32Array(2 + fine.segments.length * 6);
    buf[0] = fine.segments[0]!.p0.x;
    buf[1] = fine.segments[0]!.p0.y;
    fine.segments.forEach((c, i) =>
      buf.set([c.p1.x, c.p1.y, c.p2.x, c.p2.y, c.p3.x, c.p3.y], 2 + i * 6),
    );
    return buf;
  });
}

const toD = (bufs: Float32Array[]) => {
  let d = "";
  for (const b of bufs) {
    d += `M${b[0]!.toFixed(1)} ${b[1]!.toFixed(1)}`;
    for (let i = 2; i < b.length; i += 6) {
      d += `C${b[i]!.toFixed(1)} ${b[i + 1]!.toFixed(1)} ${b[i + 2]!.toFixed(
        1,
      )} ${b[i + 3]!.toFixed(1)} ${b[i + 4]!.toFixed(1)} ${b[i + 5]!.toFixed(
        1,
      )}`;
    }
    d += "Z";
  }
  return d;
};

type Field = "Push" | "Magnify" | "Melt";
const SIZE = 200;

function deform(
  base: Float32Array[],
  out: Float32Array[],
  cx: number,
  cy: number,
  r: number,
  amount: number,
  field: Field,
  time: number,
) {
  const r2 = r * r;
  for (let p = 0; p < base.length; p++) {
    const b = base[p]!;
    const o = out[p]!;
    for (let i = 0; i < b.length; i += 2) {
      const x = b[i]!;
      const y = b[i + 1]!;
      const dx = x - cx;
      const dy = y - cy;

      const f = Math.exp(-(dx * dx + dy * dy) / r2) * amount;
      if (field === "Push") {
        const d = Math.hypot(dx, dy) + 1e-3;
        o[i] = x + (dx / d) * f * r * 0.36;
        o[i + 1] = y + (dy / d) * f * r * 0.36;
      } else if (field === "Magnify") {
        o[i] = x + dx * f * 0.6;
        o[i + 1] = y + dy * f * 0.6;
      } else {
        o[i] = x + Math.sin(y * 0.06 + time * 3) * f * 10;
        o[i + 1] = y + f * r * 0.5 * (1 + Math.sin(x * 0.05 + time * 2) * 0.3);
      }
    }
  }
}

function BendPanel({ text, field }: { text: string; field: Field }) {
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const shape = useMemo(() => layout(text, SIZE), [text]);
  const fieldRef = useRef(field);
  fieldRef.current = field;

  useEffect(() => {
    const base = densify(shape.subpaths, 6);
    const out = base.map((b) => new Float32Array(b));
    const still = prefersReducedMotion();
    const px = value(shape.width / 2, {
      spring: springs.smooth,
      precision: 0.2,
    });
    const py = value(-shape.ascent / 2, {
      spring: springs.smooth,
      precision: 0.2,
    });
    const amount = value(0, {
      spring: { duration: 0.5, bounce: 0.2 },
      precision: 0.002,
    });
    let time = 0;
    let stop: (() => void) | null = null;

    const draw = () => {
      deform(
        base,
        out,
        px.current,
        py.current,
        SIZE * 0.42,
        Math.max(0, amount.current),
        fieldRef.current,
        time,
      );
      path.current?.setAttribute("d", toD(out));
    };
    const start = () => {
      if (stop || still) return;
      stop = frames((dt) => {
        time += dt;
        const moving = [px.step(dt), py.step(dt), amount.step(dt)].some(
          Boolean,
        );
        draw();

        const go =
          moving || (fieldRef.current === "Melt" && amount.current > 0.01);
        if (!go) stop = null;
        return go;
      });
    };

    const local = (e: PointerEvent) => {
      const m = svg.current!.getScreenCTM();
      if (!m) return null;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      return p;
    };
    const move = (e: PointerEvent) => {
      const p = local(e);
      if (!p) return;
      if (amount.target === 0) {
        px.set(p.x);
        py.set(p.y);
      } else {
        px.to(p.x);
        py.to(p.y);
      }
      amount.to(1);
      start();
    };
    const leave = () => {
      amount.to(0);
      start();
    };
    const el = svg.current!;
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    draw();
    return () => {
      stop?.();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointercancel", leave);
    };
  }, [shape]);

  const pad = 24;
  return (
    <svg
      ref={svg}
      className="lx-svg bend"
      viewBox={`${-pad} ${-shape.ascent - pad} ${shape.width + pad * 2} ${
        shape.ascent + shape.descent + pad * 2
      }`}
      aria-hidden="true"
    >
      <path ref={path} />
    </svg>
  );
}

function logo(shape: Laid): string {
  const cx = shape.width / 2;
  const cy = -shape.ascent * 0.42;
  const R = Math.min(shape.ascent * 0.3, shape.width / 11);
  const r = R * 0.62;
  const gap = R * 3;
  const ring = (x: number) =>
    `M${x - R} ${cy}A${R} ${R} 0 1 1 ${x + R} ${cy}A${R} ${R} 0 1 1 ${
      x - R
    } ${cy}Z` +
    `M${x - r} ${cy}A${r} ${r} 0 1 0 ${x + r} ${cy}A${r} ${r} 0 1 0 ${
      x - r
    } ${cy}Z`;

  const thickness = R * 0.24;
  const sag = R * 0.85;
  const band = (x0: number, x1: number, y: (u: number) => number) => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const x = (x0 + (x1 - x0) * u).toFixed(1);
      top.push(`${x} ${(y(u) - thickness / 2).toFixed(1)}`);
      bottom.unshift(`${x} ${(y(u) + thickness / 2).toFixed(1)}`);
    }
    return `M${top.join("L")}L${bottom.join("L")}Z`;
  };
  const rim = R * 0.82;
  const centres = [cx - gap, cx, cx + gap];
  const tails =
    band(
      centres[0]! - rim - R * 1.4,
      centres[0]! - rim,
      (u) => cy + sag * Math.cos((u * Math.PI) / 2),
    ) +
    band(
      centres[2]! + rim,
      centres[2]! + rim + R * 1.4,
      (u) => cy + sag * Math.sin((u * Math.PI) / 2),
    );
  const swoops = [0, 1]
    .map((i) =>
      band(
        centres[i]! + rim,
        centres[i + 1]! - rim,
        (u) => cy + (i % 2 ? -1 : 1) * sag * 0.7 * Math.sin(u * Math.PI),
      ),
    )
    .join("");
  return centres.map(ring).join("") + swoops + tails;
}

type Pairing = "Matched pairing" | "Drawing order";

function MorphPanel({ text, pairing }: { text: string; pairing: Pairing }) {
  const path = useRef<SVGPathElement>(null);
  const shape = useMemo(() => layout(text, SIZE), [text]);
  const morph = useMemo<Morph>(
    () =>
      createMorph(shape.subpaths, logo(shape), {
        pairing: pairing === "Matched pairing" ? "auto" : "order",
      }),
    [shape, pairing],
  );
  const [toLogo, setToLogo] = useState(true);
  const [driving, setDriving] = useState(false);
  const [scrub, setScrub] = useState(1);
  const engine = useRef<{ to(t: number): void; set(t: number): void } | null>(
    null,
  );

  useEffect(() => {
    const still = prefersReducedMotion();
    const t = value(0, { spring: springs.smooth, precision: 0.001 });
    let stop: (() => void) | null = null;
    const draw = () => {
      path.current?.setAttribute("d", morph.d(t.current, 1));
      setScrub(t.current);
    };
    const start = () => {
      if (stop) return;
      stop = frames((dt) => {
        const moving = t.step(dt);
        draw();
        if (!moving) stop = null;
        return moving;
      });
    };
    engine.current = {
      to(target) {
        if (still) t.set(target);
        else t.to(target);
        draw();
        start();
      },
      set(target) {
        t.set(target);
        draw();
      },
    };
    draw();
    return () => {
      stop?.();
      engine.current = null;
    };
  }, [morph]);

  useEffect(() => engine.current?.to(toLogo ? 1 : 0), [toLogo, morph]);

  useEffect(() => {
    if (driving) return;
    const timer = setInterval(() => setToLogo((v) => !v), 2600);
    return () => clearInterval(timer);
  }, [driving]);

  const pad = 24;
  return (
    <>
      <svg
        className="lx-svg"
        viewBox={`${-pad} ${-shape.ascent - pad} ${shape.width + pad * 2} ${
          shape.ascent + shape.descent + pad * 2
        }`}
        aria-hidden="true"
      >
        <path ref={path} />
      </svg>
      <div className="lx-controls">
        <button
          type="button"
          className="lx-primary"
          onClick={() => {
            setDriving(true);
            setToLogo((v) => !v);
          }}
        >
          {toLogo ? "Back to the word" : "Make it a logo"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={scrub}
          aria-label="Morph progress"
          onChange={(e) => {
            setDriving(true);
            const v = Number(e.target.value);
            setToLogo(v > 0.5);
            engine.current?.set(v);
          }}
        />
      </div>
    </>
  );
}

export function LettersDemo() {
  const [text, setText] = useState("Bend me");
  const [field, setField] = useState<Field>("Push");
  const [pairing, setPairing] = useState<Pairing>("Matched pairing");
  const shown = text.trim() || "Bend me";

  return (
    <div className="lx not-prose">
      <span className="lx-reader">{shown}</span>
      <div className="lx-panel">
        <div className="lx-bar">
          <Segmented
            label="Field"
            value={field}
            onChange={setField}
            options={["Push", "Magnify", "Melt"] as const}
          />
          <input
            className="lx-input"
            value={text}
            maxLength={12}
            onChange={(e) => setText(e.target.value)}
            aria-label="Text to bend"
          />
        </div>
        <div className="lx-stage">
          <BendPanel text={shown} field={field} />
        </div>
        <p className="lx-caption">
          Move the pointer (or drag a finger) over the letters. The outlines
          bend; the font file never changes.
        </p>
      </div>
      <div className="lx-panel">
        <div className="lx-bar">
          <Segmented
            label="Pairing"
            value={pairing}
            onChange={setPairing}
            options={["Matched pairing", "Drawing order"] as const}
          />
        </div>
        <div className="lx-stage">
          <MorphPanel text={shown} pairing={pairing} />
        </div>
        <p className="lx-caption">
          {pairing === "Matched pairing"
            ? "Each part of the logo takes the piece of a letter nearest to it, so the letters travel the shortest way."
            : "Pieces are paired in the order they were drawn, so letters fly across the word to reach their partner."}
        </p>
      </div>
    </div>
  );
}
