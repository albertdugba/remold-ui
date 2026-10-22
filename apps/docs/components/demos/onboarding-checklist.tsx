"use client";
/**
 * An onboarding checklist over the app it sets up. Each step you finish changes the app behind
 * it too: the workspace gets its name, the data source appears in the sidebar, teammates join the
 * header, the dashboard fills in, and the weekly report gets its chip. One `Remold.Layout`
 * moves the checklist and the app together, `Remold.Connectors` keeps the steps joined by a
 * line, `Remold.Icon` turns each step's icon into a tick, and `Remold.Text` keeps the
 * counts and button labels in place.
 *
 * It plays a short scene while on screen; touch it and it's yours. "Ridgeway", "Northwind Co."
 * and the people are made up.
 */
import { Remold, useAutoplay } from "@remold-ui/react";
import {
  BarChart3,
  Check,
  ChevronsUpDown,
  Database,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Minus,
  Plus,
  Settings,
  Sparkles,
  Table2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface Step {
  id: StepId;
  title: string;
  body: string;
  action: string;
  busy: string;
  icon: LucideIcon;
}
type StepId = "workspace" | "connect" | "invite" | "dashboard" | "reports";
type Status = "todo" | "busy" | "done" | "skipped";
type Statuses = Record<StepId, Status>;

const STEPS: Step[] = [
  {
    id: "workspace",
    title: "Name your workspace",
    body: "It’s what your team will see when they sign in.",
    action: "Save name",
    busy: "Saving…",
    icon: Sparkles,
  },
  {
    id: "connect",
    title: "Connect a data source",
    body: "Bring in a database or a spreadsheet. You can add more later.",
    action: "Connect Postgres",
    busy: "Connecting…",
    icon: Database,
  },
  {
    id: "invite",
    title: "Invite your team",
    body: "Dashboards are better with the people who use them.",
    action: "Send 3 invites",
    busy: "Sending…",
    icon: UserPlus,
  },
  {
    id: "dashboard",
    title: "Build your first dashboard",
    body: "Start from the sales template; change anything later.",
    action: "Use template",
    busy: "Building…",
    icon: LayoutDashboard,
  },
  {
    id: "reports",
    title: "Turn on weekly reports",
    body: "A summary in everyone’s inbox every Monday at 9.",
    action: "Turn on",
    busy: "Turning on…",
    icon: Mail,
  },
];

const START: Statuses = { workspace: "done", connect: "todo", invite: "todo", dashboard: "todo", reports: "todo" };

/** The scene it plays: every beat is the whole state, so it can start anywhere and loop cleanly. */
type Beat = { status: Statuses; docked?: boolean };
const with_ = (base: Statuses, change: Partial<Statuses>): Statuses => ({ ...base, ...change });
const SCENE: Beat[] = (() => {
  const beats: Beat[] = [{ status: START }];
  let s = START;
  const push = (change: Partial<Statuses>, docked = false) => {
    s = with_(s, change);
    beats.push({ status: s, docked });
  };
  push({ connect: "busy" });
  push({ connect: "done" });
  push({ invite: "busy" });
  push({ invite: "done" });
  push({ dashboard: "skipped" });
  push({}, true);
  push({});
  push({ reports: "busy" });
  push({ reports: "done" });
  push({ dashboard: "todo" });
  push({ dashboard: "busy" });
  push({ dashboard: "done" });
  return beats;
})();

const TEAM = ["Ama Mensah", "Jonas Berg", "Priya Shah"];
const avatar = (name: string) => `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=f4f4f5`;

const TILES = [
  { label: "Revenue", value: "£48,210", change: "+12%" },
  { label: "Orders", value: "1,284", change: "+8%" },
  { label: "Conversion", value: "3.4%", change: "+0.3" },
  { label: "Returning", value: "41%", change: "+2%" },
];

export interface OnboardingChecklistProps {
  /** The colour of the progress, the ticks and the main button. */
  accent?: string;
  /** Play the scene while on screen, until someone takes over. */
  autoplay?: boolean;
  /** Milliseconds per beat of the scene (busy moments take half as long). */
  every?: number;
  /** How much the springs overshoot, from 0 to 0.4. */
  bounce?: number;
  /** Show the app behind the checklist, which fills in as steps are done. */
  showApp?: boolean;
  /** The height of the whole thing in pixels. */
  height?: number;
}

export function OnboardingChecklist({
  accent = "#4f46e5",
  autoplay: play = true,
  every = 1800,
  bounce = 0.15,
  showApp = true,
  height = 560,
}: OnboardingChecklistProps) {
  const [status, setStatus] = useState<Statuses>(START);
  const [docked, setDocked] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const autoplay = useAutoplay(SCENE.length, {
    every: (step) => (Object.values(SCENE[step]!.status).includes("busy") ? every * 0.5 : every),
    autoStart: play,
  });
  const { setPlaying } = autoplay;
  useEffect(() => setPlaying(play), [play, setPlaying]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const beat = SCENE[autoplay.step]!;
    setStatus(beat.status);
    setDocked(!!beat.docked);
  }, [autoplay.step]);

  const set = (id: StepId, to: Status) => setStatus((s) => ({ ...s, [id]: to }));
  /** Do a step: a moment of "Connecting…", then it's ticked off and the next one opens. */
  const complete = (id: StepId) => {
    set(id, "busy");
    timers.current.push(setTimeout(() => set(id, "done"), 750));
  };

  const done = (id: StepId) => status[id] === "done";
  const main = STEPS.filter((s) => status[s.id] !== "skipped");
  const skipped = STEPS.filter((s) => status[s.id] === "skipped");
  const current = main.find((s) => status[s.id] !== "done") ?? null;
  const count = STEPS.filter((s) => done(s.id)).length;
  const allDone = count === STEPS.length;
  const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ob-accent)] focus-visible:ring-offset-2";

  return (
    <div
      ref={autoplay.ref}
      style={{ "--ob-accent": accent, height } as CSSProperties}
      className="not-prose @container relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 font-sans text-zinc-900"
    >
      <Remold.Connectors end="top" gap={3} className="h-full [&_.rm-connector]:stroke-zinc-200">
        <Remold.Layout
          trigger={[docked, ...STEPS.map((s) => status[s.id])]}
          spring={{ duration: 0.5, bounce }}
          className="absolute inset-0"
        >
          {showApp && <App status={status} />}

          <div className="absolute right-4 bottom-4 left-4 flex justify-end @lg:left-auto">
            {docked ? (
              <button
                type="button"
                onClick={() => setDocked(false)}
                aria-label={`Open setup, ${count} of ${STEPS.length} done`}
                className={`flex items-center gap-3 rounded-full border border-zinc-200 bg-white py-2 pr-4 pl-2 text-left shadow-lg shadow-zinc-900/[0.06] ${focus}`}
              >
                <Ring value={count / STEPS.length} size={30}>
                  <Remold.Text className="text-[10.5px] font-semibold tabular-nums">{`${count}/${STEPS.length}`}</Remold.Text>
                </Ring>
                <span className="grid">
                  <span className="text-[13px] font-semibold">Set up Ridgeway</span>
                  <span className="text-[12px] text-zinc-500">{current ? `Next: ${current.title}` : "Almost there"}</span>
                </span>
              </button>
            ) : allDone ? (
              <section
                aria-label="Setup complete"
                className="grid w-full justify-items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xl shadow-zinc-900/[0.07] @lg:w-[340px]"
              >
                <span className="grid size-11 place-items-center rounded-full bg-[var(--ob-accent)] text-white">
                  <Check className="size-5" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <div>
                  <h4 className="m-0 text-[16px] font-semibold tracking-[-0.01em]">You’re all set</h4>
                  <p className="m-0 mt-1 text-[13px] text-zinc-500">Ridgeway is ready for your team.</p>
                </div>
                <span className="flex gap-1.5" aria-hidden="true">
                  {STEPS.map((s) => (
                    <Marker key={s.id} step={s} status="done" />
                  ))}
                </span>
                <button
                  type="button"
                  onClick={() => setStatus(START)}
                  className={`mt-1 rounded-lg px-3 py-1.5 text-[13px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 ${focus}`}
                >
                  Start over
                </button>
              </section>
            ) : (
              <section
                aria-label="Set up Ridgeway"
                className="w-full rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/[0.07] @lg:w-[340px]"
              >
                <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5">
                  <Ring value={count / STEPS.length} size={34} />
                  <div className="min-w-0 flex-1">
                    <h4 className="m-0 text-[14px] font-semibold tracking-[-0.01em]">Set up Ridgeway</h4>
                    <Remold.Text className="block text-[12.5px] text-zinc-500 tabular-nums">{`${count} of ${STEPS.length} done`}</Remold.Text>
                  </div>
                  <button
                    type="button"
                    aria-label="Minimise"
                    onClick={() => setDocked(true)}
                    className={`grid size-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 ${focus}`}
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </button>
                </header>

                <ol className="m-0 grid list-none gap-0.5 p-2">
                  {main.map((s, i) => {
                    const st = status[s.id];
                    const open = current?.id === s.id;
                    return (
                      <li key={s.id} className={`flex gap-3 rounded-xl px-2 py-2 ${open ? "bg-zinc-50" : ""}`}>
                        <Remold.Anchor name={s.id} linkTo={i > 0 ? main[i - 1]!.id : undefined} className="shrink-0">
                          <Marker step={s} status={st} />
                        </Remold.Anchor>
                        <div className="min-w-0 flex-1 pt-[3px]">
                          <p
                            className={`m-0 text-[13.5px] ${
                              st === "done" ? "text-zinc-400 line-through decoration-zinc-300" : open ? "font-semibold" : "text-zinc-700"
                            }`}
                          >
                            {s.title}
                          </p>
                          {open && (
                            <>
                              <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-zinc-500">{s.body}</p>
                              <span className="mt-2.5 flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={st === "busy"}
                                  onClick={() => complete(s.id)}
                                  className={`rounded-lg bg-[var(--ob-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-80 ${focus}`}
                                >
                                  <Remold.Text>{st === "busy" ? s.busy : s.action}</Remold.Text>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => set(s.id, "skipped")}
                                  className={`rounded-lg px-2.5 py-1.5 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 ${focus}`}
                                >
                                  Skip for now
                                </button>
                              </span>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {skipped.length > 0 && (
                  <div className="border-t border-zinc-100 px-4 py-3">
                    <p className="m-0 mb-2 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">Skipped</p>
                    {skipped.map((s) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <Marker step={s} status="skipped" />
                        <p className="m-0 flex-1 text-[13px] text-zinc-500">{s.title}</p>
                        <button
                          type="button"
                          onClick={() => set(s.id, "todo")}
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-zinc-600 hover:bg-zinc-100 ${focus}`}
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          Do it now
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </Remold.Layout>
      </Remold.Connectors>
    </div>
  );
}

/** A step's mark: its own icon until it's done, then a tick in the accent colour. */
function Marker({ step, status }: { step: Step; status: Status }) {
  const done = status === "done";
  return (
    <span
      aria-hidden="true"
      className={`grid size-7 place-items-center rounded-lg border transition-colors duration-300 ${
        done
          ? "border-transparent bg-[var(--ob-accent)] text-white"
          : status === "skipped"
          ? "border-dashed border-zinc-300 bg-white text-zinc-400"
          : "border-zinc-200 bg-white text-zinc-600"
      } ${status === "busy" ? "animate-pulse" : ""}`}
    >
      <Remold.Icon icon={done ? Check : step.icon} className="size-3.5" strokeWidth={done ? 2.6 : 2} />
    </span>
  );
}

/** The progress ring. The arc's length moves with a short ease; the count beside it is a Text. */
function Ring({ value, size, children }: { value: number; size: number; children?: ReactNode }) {
  const r = size / 2 - 3;
  const length = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e4e4e7" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ob-accent)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - value)}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      {children}
    </span>
  );
}

const NAV: [string, LucideIcon][] = [
  ["Overview", BarChart3],
  ["Dashboards", LayoutDashboard],
  ["Data", Table2],
  ["Team", Users],
  ["Settings", Settings],
];

/** The app being set up. Every finished step leaves something behind in it. */
function App({ status }: { status: Statuses }) {
  const done = (id: StepId) => status[id] === "done";
  return (
    <div aria-hidden="true" className="absolute inset-0 flex">
      <aside className="hidden w-[188px] shrink-0 flex-col gap-5 border-r border-zinc-200 bg-white px-3 py-4 @2xl:flex">
        <span className="flex items-center gap-2 px-1.5">
          <span className="grid size-6 place-items-center rounded-md bg-zinc-900 text-[11px] font-bold text-white">R</span>
          {done("workspace") ? (
            <span className="grid flex-1 leading-tight">
              <span className="text-[12.5px] font-semibold">Northwind Co.</span>
              <span className="text-[11px] text-zinc-400">Ridgeway</span>
            </span>
          ) : (
            <span className="h-2.5 flex-1 rounded bg-zinc-100" />
          )}
          <ChevronsUpDown className="size-3.5 text-zinc-300" />
        </span>
        <nav className="grid gap-0.5">
          {NAV.map(([name, Icon], i) => (
            <span
              key={name}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] ${
                i === 0 ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-500"
              }`}
            >
              <Icon className="size-3.5" />
              {name}
            </span>
          ))}
        </nav>
        <div className="mt-auto grid gap-1.5 px-1.5">
          <span className="text-[10.5px] font-medium tracking-wide text-zinc-400 uppercase">Sources</span>
          {done("connect") ? (
            <span className="flex items-center gap-2 text-[12px] text-zinc-700">
              <Database className="size-3.5 text-zinc-400" />
              Postgres
              <span className="ml-auto size-1.5 rounded-full bg-emerald-500" />
            </span>
          ) : (
            <span className="text-[12px] text-zinc-400">None yet</span>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4 p-5">
        <header className="flex items-center gap-3">
          <h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em]">Overview</h3>
          {done("reports") && (
            <span className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11.5px] text-zinc-600">
              <Mail className="size-3" />
              Weekly report · Mon 9:00
            </span>
          )}
          <span className="ml-auto flex items-center">
            {done("invite") &&
              TEAM.map((name) => (
                <img
                  key={name}
                  src={avatar(name)}
                  alt=""
                  width={26}
                  height={26}
                  className="-ml-1.5 size-[26px] rounded-full border-2 border-zinc-50 bg-zinc-100"
                />
              ))}
            <span className="ml-2 flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11.5px] text-zinc-600">
              <UserPlus className="size-3" />
              Invite
            </span>
          </span>
        </header>

        {done("dashboard") ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {TILES.map((t) => (
              <div key={t.label} className="rounded-xl border border-zinc-200 bg-white p-3.5">
                <span className="text-[11.5px] text-zinc-500">{t.label}</span>
                <span className="mt-1 block text-[18px] font-semibold tracking-[-0.02em] tabular-nums">{t.value}</span>
                <span className="text-[11px] font-medium text-emerald-600">{t.change}</span>
              </div>
            ))}
          </div>
        ) : done("connect") ? (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Database className="size-4" />
            </span>
            <span className="grid">
              <span className="text-[13px] font-medium">Postgres connected</span>
              <span className="text-[12px] text-zinc-500">3 tables · 48,210 rows · ready for a dashboard</span>
            </span>
          </div>
        ) : (
          <div className="grid place-items-center gap-1 rounded-xl border border-dashed border-zinc-300 p-8 text-center">
            <Database className="size-5 text-zinc-300" />
            <span className="text-[13px] font-medium text-zinc-600">No data yet</span>
            <span className="text-[12px] text-zinc-400">Connect a source and your numbers show up here.</span>
          </div>
        )}
      </main>
    </div>
  );
}

/** The name the docs pages use. */
export const OnboardingChecklistDemo = OnboardingChecklist;
