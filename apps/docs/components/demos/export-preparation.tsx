"use client";

import { Button } from "@base-ui/react/button";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { useScript } from "./use-script";

const ROWS = [
  { project: "Brand refresh", client: "Orbit", amount: 2400, status: "Paid" },
  { project: "Website design", client: "Forma", amount: 3800, status: "Paid" },
  { project: "Product photography", client: "Sunday", amount: 950, status: "Pending" },
  { project: "Launch campaign", client: "Orbit", amount: 1800, status: "Paid" },
];
const spring = { type: "spring" as const, duration: 0.48, bounce: 0.16 };
const press = "min-h-11 touch-manipulation rounded-xl px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-40";
const fade = { initial: { opacity: 0, y: 7 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.18 } };

export function ExportPreparationDemo({ playing }: { playing?: boolean } = {}) {
  const instance = useId();
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [scope, setScope] = useState<"all" | "paid">("all");
  const [phase, setPhase] = useState<"configure" | "preparing" | "ready">("configure");
  const [progress, setProgress] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const rows = ROWS.filter(row => scope === "all" || row.status === "Paid");
  const payload = format === "json" ? JSON.stringify(rows, null, 2) : ["Project,Client,Amount GBP,Status", ...rows.map(r => `${r.project},${r.client},${r.amount},${r.status}`)].join("\r\n");
  const filename = `project-report.${format}`;
  useEffect(() => {
    if (phase !== "preparing") return;
    const timer = setInterval(() => setProgress(p => Math.min(100, p + 10)), 110);
    return () => clearInterval(timer);
  }, [phase]);
  useEffect(() => { if (phase === "preparing" && progress === 100) setPhase("ready"); }, [phase, progress]);
  const prepare = () => { setProgress(0); setPhase("preparing"); };
  useScript(root, playing, [[1900, () => setPhase("configure")], [1000, () => setScope("paid")], [2300, prepare], [2200, () => setPhase("configure")], [1000, () => { setFormat("json"); setScope("all"); }], [2500, prepare]]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([payload], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <MotionConfig transition={spring} reducedMotion="user"><div ref={root} className="not-prose w-full max-w-[400px] text-zinc-900 dark:text-zinc-100">
    <motion.section layout className="overflow-hidden rounded-[26px] border border-zinc-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900" aria-label="Export project report">
      <header className="flex items-center justify-between px-6 pb-4 pt-6"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Your data, to go</p><h3 className="m-0 text-lg font-semibold tracking-tight">Export report</h3></div><span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300" aria-hidden="true">↗</span></header>
      <AnimatePresence mode="popLayout" initial={false}>
        {phase === "configure" ? <motion.div key="configure" {...fade} className="px-6 pb-5">
          <fieldset><legend className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">File format</legend><div className="grid grid-cols-2 gap-2">{(["csv", "json"] as const).map(f => <Button key={f} aria-pressed={format === f} onClick={() => setFormat(f)} className={`${press} relative isolate border p-3 text-left ${format === f ? "border-indigo-300 dark:border-indigo-400/50" : "border-zinc-200 dark:border-white/10"}`}>{format === f && <motion.span layoutId={`${instance}-format`} className="absolute inset-0 -z-10 rounded-xl bg-indigo-50 dark:bg-indigo-400/10" />}<span className="block font-semibold uppercase">{f}</span><span className="mt-1 block text-xs font-normal text-zinc-500 dark:text-zinc-400">{f === "csv" ? "For spreadsheets" : "For developers"}</span></Button>)}</div></fieldset>
          <fieldset className="mt-5"><legend className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Include</legend><div className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">{(["all", "paid"] as const).map(s => <Button key={s} onClick={() => setScope(s)} aria-pressed={scope === s} className={`${press} relative isolate flex-1 text-xs`}>{scope === s && <motion.span layoutId={`${instance}-scope`} className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm dark:bg-zinc-700" />}{s === "all" ? "All projects" : "Paid only"}</Button>)}</div></fieldset>
          <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10"><div className="flex justify-between bg-zinc-50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-white/5 dark:text-zinc-400"><span>Preview</span><span>{rows.length} records</span></div><div className="px-3 py-1">{rows.slice(0, 2).map(r => <div key={r.project} className="flex justify-between gap-2 py-2 text-xs"><span className="truncate">{r.project}</span><span className="tabular-nums text-zinc-500 dark:text-zinc-400">£{r.amount.toLocaleString("en-GB")}</span></div>)}<p className="pb-2 text-[11px] text-zinc-400">+ {rows.length - 2} more · sample project data</p></div></div>
        </motion.div> : <motion.div key="result" {...fade} className="px-6 pb-6">
          <div className="relative my-3 flex h-32 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-white/[0.03]">
            <motion.div animate={{ rotate: phase === "ready" ? 0 : -5, y: phase === "ready" ? 0 : -3 }} className="relative flex h-24 w-20 flex-col justify-end rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-zinc-800"><span className="mb-auto h-1 w-8 rounded bg-zinc-200 dark:bg-zinc-600"/><span className="mb-1 h-1 w-10 rounded bg-zinc-100 dark:bg-zinc-700"/><span className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">.{format}</span>{phase === "ready" && <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute -right-3 -top-2 grid size-7 place-items-center rounded-full bg-emerald-500 text-sm text-white">✓</motion.span>}</motion.div>
          </div>
          <h4 className="mt-5 text-center text-base font-semibold">{phase === "ready" ? "Packed and ready." : "Preparing your report…"}</h4><p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">{filename} · {rows.length} records</p>
          <div role="progressbar" aria-label="Export preparation" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-5 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10"><motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.15 }} className="h-full rounded-full bg-indigo-500" /></div><p role="status" className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">{phase === "ready" ? "Generated locally. Your data stays here." : "Formatting sample records"}</p>
        </motion.div>}
      </AnimatePresence>
      <div className="border-t border-zinc-100 px-6 py-4 dark:border-white/10"><Button disabled={phase === "preparing"} onClick={phase === "ready" ? download : prepare} className={`${press} w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`}>{phase === "ready" ? "Download file ↓" : phase === "preparing" ? "Preparing…" : "Prepare export"}</Button>{phase !== "configure" && <Button className={`${press} mt-1 w-full text-zinc-500 dark:text-zinc-400`} onClick={() => setPhase("configure")}>{phase === "preparing" ? "Cancel" : "Back to settings"}</Button>}</div>
    </motion.section>
  </div></MotionConfig>;
}
