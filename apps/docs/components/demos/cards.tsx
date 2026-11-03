"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";

const shell = "w-full max-w-md rounded-2xl border border-[var(--color-fd-border)] bg-[var(--color-fd-card)] p-4 text-[var(--color-fd-foreground)] shadow-sm";

export function SelectableOptionCardDemo() {
  const [selected, setSelected] = useState("team");
  const options = [["solo", "Just me", "One workspace member", "$0"], ["team", "Small team", "Up to five workspace members", "$18"]];
  return <Remold.Layout trigger={selected} className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">{options.map(([id, title, copy, price]) => { const active = selected === id; return <button key={id} type="button" onClick={() => setSelected(id)} aria-pressed={active} className="relative rounded-2xl border border-[var(--color-fd-border)] bg-[var(--color-fd-card)] p-4 text-left transition-colors hover:border-[var(--color-fd-ring)] aria-pressed:border-[var(--color-fd-foreground)]"><span className="flex items-start justify-between gap-3"><span><b>{title}</b><span className="mt-1 block text-sm text-[var(--color-fd-muted-foreground)]">{copy}</span></span><span className="text-lg font-semibold">{price}</span></span>{active && <span className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-xs text-white">✓</span>Selected</span>}</button>; })}</Remold.Layout>;
}

const initial = [
  { id: "review", title: "Review requested", copy: "Maya asked for feedback on the project brief.", tone: "bg-violet-100 text-violet-700" },
  { id: "mention", title: "You were mentioned", copy: "Sam tagged you in the launch checklist.", tone: "bg-sky-100 text-sky-700" },
  { id: "payment", title: "Payment received", copy: "Invoice #2048 was paid in full.", tone: "bg-emerald-100 text-emerald-700" },
];

export function NotificationStackCardDemo() {
  const [items, setItems] = useState(initial);
  const reset = () => setItems(initial);
  return <section className={shell}><div className="mb-3 flex items-center justify-between"><span><b>Notifications</b><span className="ml-2 rounded-full bg-[var(--color-fd-accent)] px-2 py-0.5 text-xs text-[var(--color-fd-muted-foreground)]">{items.length}</span></span><button type="button" onClick={reset} className="text-sm text-[var(--color-fd-muted-foreground)] hover:text-[var(--color-fd-foreground)]">Reset</button></div><Remold.Layout trigger={items.map((item) => item.id).join(":")} className="grid gap-2">{items.map((item) => <article key={item.id} className="flex items-start gap-3 rounded-xl border border-[var(--color-fd-border)] bg-[var(--color-fd-background)] p-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm ${item.tone}`}>●</span><span className="min-w-0 flex-1"><b className="text-sm">{item.title}</b><span className="mt-0.5 block text-sm text-[var(--color-fd-muted-foreground)]">{item.copy}</span></span><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Dismiss ${item.title}`} className="rounded-md px-1 text-lg leading-none text-[var(--color-fd-muted-foreground)] hover:bg-[var(--color-fd-accent)]">×</button></article>)}{items.length === 0 && <button type="button" onClick={reset} className="rounded-xl border border-dashed border-[var(--color-fd-border)] p-5 text-sm text-[var(--color-fd-muted-foreground)] hover:bg-[var(--color-fd-accent)]">All caught up · Restore notifications</button>}</Remold.Layout></section>;
}

export function PermissionCardDemo() {
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("editor");
  const descriptions = { viewer: "Can view and comment", editor: "Can edit and publish", admin: "Can manage people and billing" };
  return <section className={shell}><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-orange-100 font-semibold text-orange-700">MO</span><span className="min-w-0 flex-1"><b>Maria Owusu</b><span className="block text-sm text-[var(--color-fd-muted-foreground)]">maria@example.com</span></span></div><Remold.Layout trigger={role} className="mt-4"><div className="grid grid-cols-3 rounded-xl bg-[var(--color-fd-muted)] p-1">{(["viewer", "editor", "admin"] as const).map((item) => <button key={item} type="button" onClick={() => setRole(item)} aria-pressed={role === item} className="rounded-lg px-2 py-2 text-sm capitalize text-[var(--color-fd-muted-foreground)] aria-pressed:bg-[var(--color-fd-background)] aria-pressed:font-medium aria-pressed:text-[var(--color-fd-foreground)] aria-pressed:shadow-sm">{item}</button>)}</div><div className="mt-3 rounded-xl border border-[var(--color-fd-border)] bg-[var(--color-fd-background)] p-3"><b className="text-sm capitalize">{role}</b><span className="mt-1 block text-sm text-[var(--color-fd-muted-foreground)]">{descriptions[role]}</span>{role === "admin" && <span className="mt-3 block border-t border-[var(--color-fd-border)] pt-3 text-sm text-amber-700">Includes billing access and member management.</span>}</div></Remold.Layout></section>;
}
