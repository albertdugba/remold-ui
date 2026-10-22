/**
 * Year in money: a bank's year-in-review. Every dot is one card payment. They start as a pile,
 * then sort themselves into where the money went, month by month, every day of the year, and
 * finally into the year's total. No ids: each step is just a new set of points with tones, and
 * the dots find their own way (and colour) there. The bank and the numbers are made up.
 */
import { particles, sampleTextPoints, type Particles } from "@remold-ui/canvas";
import type { CloudPoint } from "@remold-ui/core";
import { Remold } from "@remold-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotion } from "../motion";

const CATEGORIES = [
  { name: "Groceries", colour: "#34d399", share: 0.3, mean: 18 },
  { name: "Eating out", colour: "#60a5fa", share: 0.2, mean: 24 },
  { name: "Transport", colour: "#a78bfa", share: 0.15, mean: 9 },
  { name: "Bills", colour: "#f472b6", share: 0.1, mean: 62 },
  { name: "Shopping", colour: "#fb923c", share: 0.15, mean: 38 },
  { name: "Travel", colour: "#facc15", share: 0.1, mean: 71 },
] as const;
const PALETTE = CATEGORIES.map((c) => c.colour);
const toneOf = (category: number) => category / (CATEGORIES.length - 1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COUNT = 1200;

interface Payment {
  category: number;
  day: number;
  amount: number;
}

/** A year of made-up payments, the same every time. */
function makeYear(): Payment[] {
  let seed = 2026;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const payments: Payment[] = [];
  CATEGORIES.forEach((c, category) => {
    const n = Math.round(COUNT * c.share);
    for (let k = 0; k < n; k++) {
      // Travel bunches up in summer and at Christmas; everything else is spread through the year.
      const day = category === 5 && random() < 0.7 ? (random() < 0.75 ? 150 + random() * 90 : 340 + random() * 24) : random() * 365;
      payments.push({ category, day: Math.floor(day), amount: Math.round(c.mean * (0.3 + random() * 1.4) * 100) / 100 });
    }
  });
  return payments.slice(0, COUNT);
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** `n` points packed evenly in a disc round (cx, cy): a sunflower head. */
const disc = (n: number, cx: number, cy: number, gap = 1): { x: number; y: number }[] =>
  Array.from({ length: n }, (_, i) => ({
    x: cx + gap * Math.sqrt(i + 0.5) * Math.cos(i * GOLDEN),
    y: cy + gap * Math.sqrt(i + 0.5) * Math.sin(i * GOLDEN),
  }));

type Step = "pile" | "categories" | "months" | "days" | "total";
const STEPS: { id: Step; label: string }[] = [
  { id: "pile", label: "The year" },
  { id: "categories", label: "Where it went" },
  { id: "months", label: "Month by month" },
  { id: "days", label: "Every day" },
  { id: "total", label: "The total" },
];

function layouts(payments: Payment[], total: string): Record<Step, CloudPoint[]> {
  const byCategory = CATEGORIES.map((_, c) => payments.filter((p) => p.category === c));

  // A pile: every payment in one disc, colours mixed.
  const shuffled = [...payments].sort((a, b) => ((a.day * 7919 + a.amount * 13) % 101) - ((b.day * 7919 + b.amount * 13) % 101));
  const pile = disc(shuffled.length, 0, 0).map((p, i) => ({ ...p, tone: toneOf(shuffled[i]!.category) }));

  // Where it went: one disc per category, sized by how many payments it has.
  const categories: CloudPoint[] = [];
  let x = 0;
  byCategory.forEach((list, c) => {
    const r = Math.sqrt(list.length);
    categories.push(...disc(list.length, x + r, 0).map((p) => ({ ...p, tone: toneOf(c) })));
    x += 2 * r + 6;
  });

  // Month by month: a column of dots per month, stacked by category so colours band.
  const months: CloudPoint[] = [];
  for (let m = 0; m < 12; m++) {
    const list = payments.filter((p) => Math.min(11, Math.floor(p.day / 30.42)) === m).sort((a, b) => a.category - b.category);
    list.forEach((p, k) => months.push({ x: m * 7 + (k % 5), y: -Math.floor(k / 5), tone: toneOf(p.category) }));
  }

  // Every day: a wall calendar, six months to a row, each payment a dot in its day's square.
  const perDay = new Map<number, number>();
  const days: CloudPoint[] = payments.map((p) => {
    const nth = perDay.get(p.day) ?? 0;
    perDay.set(p.day, nth + 1);
    const month = Math.min(11, Math.floor(p.day / 30.42));
    const date = p.day - Math.round(month * 30.42);
    const cell = 1.7;
    const left = (month % 6) * (7 * cell + 2.4) + (date % 7) * cell;
    const top = Math.floor(month / 6) * (5 * cell + 2.4) + Math.floor(date / 7) * cell;
    const offset = disc(nth + 1, 0, 0, 0.24)[nth]!;
    return { x: left + offset.x, y: top + offset.y, tone: toneOf(p.category) };
  });

  // The total: the number itself, coloured left to right in bands as wide as each category's
  // share of the money spent.
  const shape = sampleTextPoints(total, {
    count: payments.length,
    font: `800 220px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif`,
  });
  const order = shape.map((_, i) => i).sort((a, b) => shape[a]!.x - shape[b]!.x);
  const spentOn = byCategory.map((list) => list.reduce((sum, p) => sum + p.amount, 0));
  const spent = spentOn.reduce((sum, v) => sum + v, 0);
  const totalPoints: CloudPoint[] = new Array(shape.length);
  let before = 0;
  let c = 0;
  order.forEach((index, k) => {
    // Move to the next category once this point is past the running share.
    while (c < CATEGORIES.length - 1 && (k + 0.5) / order.length > (before + spentOn[c]!) / spent) before += spentOn[c++]!;
    totalPoints[index] = { ...shape[index]!, tone: toneOf(c) };
  });

  return { pile, categories, months, days, total: totalPoints };
}

const RADIUS: Record<Step, number> = { pile: 2.4, categories: 2.4, months: 2.3, days: 1.8, total: 1.9 };

/** What each step says, worked out from the payments so it's always true. */
function captions(payments: Payment[], total: string): Record<Step, string> {
  const spentOn = CATEGORIES.map((_, c) => payments.filter((p) => p.category === c).reduce((sum, p) => sum + p.amount, 0));
  const top = CATEGORIES[spentOn.indexOf(Math.max(...spentOn))]!.name;
  const perMonth = MONTHS.map((_, m) => payments.filter((p) => Math.min(11, Math.floor(p.day / 30.42)) === m).length);
  const busiest = MONTHS[perMonth.indexOf(Math.max(...perMonth))]!;
  const quietDays = 365 - new Set(payments.map((p) => p.day)).size;
  return {
    pile: `${payments.length.toLocaleString("en-US")} card payments in 2026.`,
    categories: `${top} took the most.`,
    months: `${busiest} was your busiest month.`,
    days: `Only ${quietDays} days without spending.`,
    total: `In total, you spent ${total}.`,
  };
}

export function YearInMoney() {
  const { loop, reducedMotion } = useMotion();
  const payments = useMemo(makeYear, []);
  const spent = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const total = `$${Math.round(spent).toLocaleString("en-US")}`;
  const CAPTION = useMemo(() => captions(payments, total), [payments, total]);
  const [step, setStep] = useState<Step>("pile");
  const [driving, setDriving] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dots = useRef<Particles | null>(null);
  const shapes = useRef<Record<Step, CloudPoint[]> | null>(null);

  useEffect(() => {
    shapes.current ??= layouts(payments, total);
    dots.current = particles(canvas.current!, {
      points: shapes.current[step],
      palette: PALETTE,
      radius: RADIUS[step],
      padding: 32,
      spring: { duration: 1.1, bounce: 0.18 },
      label: CAPTION[step],
      reducedMotion,
      loop,
    });
    return () => dots.current?.destroy();
    // Created once; steps morph the same dots.
  }, [loop, reducedMotion, payments, total, CAPTION]);

  useEffect(() => {
    if (shapes.current) dots.current?.to(shapes.current[step], { radius: RADIUS[step], label: CAPTION[step] });
  }, [step, CAPTION]);

  // Plays itself until someone picks a step.
  useEffect(() => {
    if (driving) return;
    const timer = setInterval(() => setStep((s) => STEPS[(STEPS.findIndex((x) => x.id === s) + 1) % STEPS.length]!.id), 3400);
    return () => clearInterval(timer);
  }, [driving]);

  const byCategory = CATEGORIES.map((c, i) => ({
    ...c,
    spent: payments.filter((p) => p.category === i).reduce((sum, p) => sum + p.amount, 0),
  }));

  return (
    <div className="pro-stage dark year">
      <div className="year-head">
        <p className="pro-eyebrow">Northwind · Your 2026</p>
        <Remold.Text className="year-caption" loop={loop} reducedMotion={reducedMotion}>
          {CAPTION[step]}
        </Remold.Text>
      </div>
      <canvas ref={canvas} className="year-canvas" />
      <ul className="year-legend" aria-label="Spending by category">
        {byCategory.map((c) => (
          <li key={c.name}>
            <span className="year-swatch" style={{ background: c.colour }} />
            {c.name}
            <span className="year-amount">${Math.round(c.spent).toLocaleString("en-US")}</span>
          </li>
        ))}
      </ul>
      <div className="segmented dark year-steps" role="group" aria-label="Show">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={step === s.id}
            onClick={() => {
              setDriving(true);
              setStep(s.id);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
