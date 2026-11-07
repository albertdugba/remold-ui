"use client";

import { Button } from "@base-ui/react/button";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useScript } from "./use-script";

type Upload = { id: number; name: string; size: string; kind: string; progress: number; state: "done" | "failed" | "uploading" };
const initial: Upload[] = [
  { id: 1, name: "Brand guidelines.pdf", size: "2.4 MB", kind: "PDF", progress: 100, state: "done" },
  { id: 2, name: "Homepage.fig", size: "8.1 MB", kind: "FIG", progress: 62, state: "failed" },
  { id: 3, name: "Product shots.zip", size: "12.6 MB", kind: "ZIP", progress: 38, state: "failed" },
];
const spring = { type: "spring" as const, duration: 0.45, bounce: 0.14 };
const button = "min-h-11 touch-manipulation rounded-xl px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-400";

export function UploadRecoveryDemo({ playing }: { playing?: boolean } = {}) {
  const [files, setFiles] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = files.some(f => f.state === "uploading");
  const failed = files.filter(f => f.state === "failed");
  const done = files.filter(f => f.state === "done");
  const retry = (id?: number) => setFiles(list => list.map(f => f.state === "failed" && (id === undefined || id === f.id) ? { ...f, state: "uploading" } : f));
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setFiles(list => list.map(f => {
      if (f.state !== "uploading") return f;
      const progress = Math.min(100, f.progress + 7);
      return { ...f, progress, state: progress === 100 ? "done" : "uploading" };
    })), 160);
    return () => clearInterval(timer);
  }, [active]);
  useScript(root, playing, [[2200, () => { setFiles(initial); setExpanded(false); }], [2600, () => retry(2)], [2800, () => retry(3)], [1800, () => setExpanded(true)]]);
  const allDone = files.length > 0 && done.length === files.length;
  return <MotionConfig transition={spring} reducedMotion="user"><div ref={root} className="not-prose w-full max-w-[420px] text-zinc-900 dark:text-zinc-100">
    <motion.section layout className="overflow-hidden rounded-[26px] border border-zinc-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900" aria-label="Upload recovery demo">
      <header className="flex items-start justify-between gap-3 px-6 pb-5 pt-6"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Client handoff</p><h3 className="m-0 text-lg font-semibold tracking-tight">The final files</h3><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Launch assets / November</p></div><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${allDone ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"}`} aria-hidden="true">{allDone ? "✓" : "↑"}</span></header>
      <div className="px-4 pb-4">
        <div role="status" className={`mb-3 rounded-xl px-3 py-3 text-xs leading-relaxed ${allDone ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-zinc-50 text-zinc-600 dark:bg-white/5 dark:text-zinc-300"}`}>{allDone ? "All files are ready. Nothing was uploaded twice." : active ? "Picking up where you left off…" : failed.length ? "Connection interrupted. Your completed files are safe." : "No files left in the queue."}</div>
        <AnimatePresence initial={false} mode="popLayout">
          {done.length > 0 && <motion.div layout key="completed" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 overflow-hidden rounded-xl border border-zinc-100 dark:border-white/10">
            <Button aria-expanded={expanded} onClick={() => setExpanded(v => !v)} className={`${button} flex w-full items-center gap-2 py-3 text-left`}><span className="grid size-6 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">✓</span><span className="flex-1">{done.length} {done.length === 1 ? "file" : "files"} completed</span><span className="text-zinc-400">{expanded ? "−" : "+"}</span></Button>
            {expanded && <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 pb-2">{done.map(f => <li key={f.id} className="flex justify-between gap-3 py-2 text-xs"><span className="truncate">{f.name}</span><span className="shrink-0 text-zinc-500 dark:text-zinc-400">{f.size}</span></li>)}</motion.ul>}
          </motion.div>}
          {files.filter(f => f.state !== "done").map(f => <motion.div layout key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16 } }} className="mb-2 rounded-2xl border border-zinc-200 p-3 dark:border-white/10">
            <div className="flex items-center gap-3"><span aria-hidden="true" className={`grid h-11 w-10 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${f.kind === "FIG" ? "bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300" : "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}`}>{f.kind}</span><div className="min-w-0 flex-1"><b className="block truncate text-xs font-medium">{f.name}</b><span className="text-[11px] text-zinc-500 dark:text-zinc-400">{f.size} · {f.progress}% transferred</span></div><Button aria-label={`Remove ${f.name}`} onClick={() => setFiles(list => list.filter(item => item.id !== f.id))} className={`${button} -mr-1 text-zinc-400`}>×</Button></div>
            <div role="progressbar" aria-label={`${f.name} transfer`} aria-valuenow={f.progress} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10"><motion.div animate={{ width: `${f.progress}%` }} transition={{ duration: 0.15 }} className={`h-full rounded-full ${f.state === "failed" ? "bg-amber-400" : "bg-indigo-500"}`} /></div>
            <div className="mt-1 flex min-h-11 items-center justify-between"><span className={`text-[11px] ${f.state === "failed" ? "text-amber-700 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400"}`}>{f.state === "failed" ? "Transfer paused · Connection lost" : "Resuming transfer…"}</span>{f.state === "failed" ? <Button onClick={() => retry(f.id)} className={`${button} -mr-1 text-indigo-600 dark:text-indigo-300`}>Retry ↻</Button> : <Button onClick={() => setFiles(list => list.map(item => item.id === f.id ? { ...item, state: "failed" } : item))} className={`${button} -mr-1 text-zinc-500 dark:text-zinc-400`}>Pause</Button>}</div>
          </motion.div>)}
        </AnimatePresence>
      </div>
      <footer className="border-t border-zinc-100 px-6 py-4 dark:border-white/10">{failed.length > 0 ? <Button onClick={() => retry()} className={`${button} w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`}>Retry {failed.length === 1 ? "remaining file" : `${failed.length} failed files`}</Button> : active ? <p className="py-3 text-center text-xs text-zinc-500 dark:text-zinc-400">Finishing your handoff…</p> : <Button onClick={() => { setFiles(initial); setExpanded(false); }} className={`${button} w-full bg-zinc-100 dark:bg-white/10`}>Replay recovery</Button>}<p className="mt-3 text-center text-[10px] text-zinc-400">Simulated transfers · No files leave your device</p></footer>
    </motion.section>
  </div></MotionConfig>;
}
