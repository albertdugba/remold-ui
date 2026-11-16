import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
  Cursor02Icon,
  Delete02Icon,
  Globe02Icon,
  Loading03Icon,
  Notification03Icon,
  SecurityCheckIcon,
  SparklesIcon,
  TextFontIcon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { answer, undoAll } from "../agent/bridge";
import { run } from "../agent/runner";
import { useAgentUi, type Approval, type Phase, type Step, type StepKind } from "../agent/store";

const FOLD_AFTER = 1400;

const ROW =
  "flex w-full min-w-0 items-center gap-2.5 rounded-[14px] border-0 bg-transparent text-left font-sans text-(--ink) outline-none transition-[background-color] duration-150 ease-out focus-visible:shadow-[inset_0_0_0_2px_var(--ink)] motion-reduce:transition-none";
const PILL =
  "h-8 flex-none cursor-pointer rounded-full border-0 px-3 font-sans text-[13px] font-semibold whitespace-nowrap outline-none transition-[background-color,scale] duration-150 ease-out focus-visible:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)] active:scale-[0.97] motion-reduce:transition-none";

const GLYPH: Record<StepKind, typeof Globe02Icon> = {
  rename: TextFontIcon,
  region: Globe02Icon,
  role: UserIcon,
  switch: Notification03Icon,
  delete: Delete02Icon,
};

const SIGN: Record<Phase, typeof Globe02Icon> = {
  idle: SparklesIcon,
  working: Cursor02Icon,
  waiting: SecurityCheckIcon,
  done: Tick02Icon,
  lost: Alert02Icon,
};

const IDEAS = [
  { label: "Rename and move", prompt: "Rename the project to Atlas, move it to West Africa and make Ama an admin" },
  { label: "Quieter alerts", prompt: "Turn off email alerts and turn on the weekly digest" },
  { label: "Delete project", prompt: "Delete the project" },
] as const;

const count = (amount: number, one: string, many: string) => `${amount} ${amount === 1 ? one : many}`;

function Shimmer({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span data-sweeping={active || undefined} className="sweep inline-block">
      {children}
    </span>
  );
}

function Trail({ step, approval, deny }: { step: Step; approval: Approval | null; deny: RefObject<HTMLButtonElement | null> }) {
  const running = step.status === "running";
  const waiting = step.status === "waiting";
  const refused = step.status === "denied" || step.status === "failed";

  return (
    <li className="grid grid-cols-[minmax(0,1fr)]">
      <div className={`${ROW} h-10 pr-2.5 pl-9`}>
        <Remold.Anchor
          name={step.id}
          linkTo="root"
          render={<span className="grid size-6 flex-none place-items-center text-(--muted) [&_svg]:size-[17px]" />}
        >
          <HugeiconsIcon icon={GLYPH[step.kind]} strokeWidth={1.9} aria-hidden="true" />
        </Remold.Anchor>
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="flex-none text-[13.5px] font-medium whitespace-nowrap">
            <Shimmer active={running}>
              <Remold.Text className="inline-block whitespace-nowrap">{refused ? step.denied : running || waiting ? step.running : step.done}</Remold.Text>
            </Shimmer>
          </span>
          {step.detail && <span className="truncate font-mono text-[12px] text-(--muted)">{step.detail}</span>}
        </span>
        <span className="grid min-w-4 flex-none justify-items-end text-[12.5px] whitespace-nowrap text-(--muted)">
          {running ? (
            <span data-rm-ignore className="grid size-4 place-items-center">
              <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            </span>
          ) : waiting ? (
            "Waiting for you"
          ) : step.status === "done" ? (
            <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} className="size-4 text-(--ink)" aria-hidden="true" />
          ) : step.status === "denied" ? (
            "Denied"
          ) : (
            "Couldn’t"
          )}
        </span>
      </div>
      {waiting && approval && (
        <div className="grid gap-2.5 pt-0.5 pr-2.5 pb-2.5 pl-[70px]">
          <p className="m-0 text-[13px] leading-[1.45] text-(--muted)">{approval.reason}</p>
          <div className="flex gap-1.5">
            <button ref={deny} type="button" onClick={() => answer(false)} className={`${PILL} bg-(--well) text-(--ink) hover:bg-(--rule)`}>
              Deny
            </button>
            <button type="button" onClick={() => answer(true)} className={`${PILL} bg-(--ink) text-white hover:bg-[#2a2a2e]`}>
              Approve
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function Island() {
  const phase = useAgentUi((current) => current.phase);
  const steps = useAgentUi((current) => current.steps);
  const approval = useAgentUi((current) => current.approval);
  const total = useAgentUi((current) => current.total);
  const prompt = useAgentUi((current) => current.prompt);
  const undone = useAgentUi((current) => current.undone);
  const marked = useAgentUi((current) => Object.keys(current.marks).length > 0);
  const [text, setText] = useState("");
  const [shown, setShown] = useState(true);
  const trail = useId();
  const field = useRef<HTMLInputElement>(null);
  const deny = useRef<HTMLButtonElement>(null);
  const busy = phase === "working" || phase === "waiting";
  const active = phase !== "idle";
  const changed = steps.filter((step) => step.status === "done").length;
  const refused = steps.length - changed;
  const current = steps.at(-1);
  const canUndo = phase === "done" && !undone && marked && steps.some((step) => step.status === "done" && step.kind !== "delete");
  const asking = approval?.step ?? null;

  useEffect(() => {
    if (phase === "working") setShown(true);
    if (phase !== "done") return;

    const timer = setTimeout(() => setShown(false), FOLD_AFTER);

    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (asking) deny.current?.focus({ preventScroll: true });
    else if (document.activeElement === document.body) field.current?.focus({ preventScroll: true });
  }, [asking]);

  const send = (value: string) => {
    if (busy || !value.trim()) return;

    setText("");
    field.current?.focus({ preventScroll: true });
    void run(value.trim());
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(text);
  };

  const title =
    phase === "working"
      ? "Working"
      : phase === "waiting"
        ? "Needs your approval"
        : phase === "lost"
          ? "I can only change what’s on this page"
          : undone
            ? "Undone"
            : changed
              ? "Done"
              : "Nothing changed";

  const detail = busy
    ? `${Math.max(1, steps.length)} of ${total}`
    : phase === "done"
      ? undone
        ? `${count(changed, "change", "changes")} put back`
        : [changed && count(changed, "change", "changes"), refused && `${refused} denied`].filter(Boolean).join(" · ")
      : "";

  const shape = steps.map((step) => `${step.id}:${step.status}`).join("|");

  return (
    <Remold.Connectors
      radius={10}
      gap={5}
      className="sticky bottom-3 z-10 min-[1000px]:static [&_.rm-connector]:stroke-(--rule) [&_.rm-connector]:[stroke-width:1.4]"
    >
      <Remold.Morph trigger={[phase, shown, shape, asking, canUndo]} choreography>
        <section className="overflow-clip rounded-[24px] bg-(--surface) p-2 text-(--ink) shadow-[0_0_0_1px_rgb(10_10_11/0.05)]" aria-label="Agent">
          <p className="sr-only" role="status">
            {phase === "working" && current ? current.running : phase === "waiting" && approval ? `${title}. ${approval.reason}` : active ? `${title}. ${detail}` : ""}
          </p>

          {active && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-expanded={shown}
                aria-controls={trail}
                disabled={busy || !steps.length}
                onClick={() => setShown(!shown)}
                className={`${ROW} h-11 px-2.5 enabled:cursor-pointer enabled:hover:bg-(--well)`}
              >
                <Remold.Anchor name="root" render={<span data-agent-home="" className="grid size-6 flex-none place-items-center [&_svg]:size-[18px]" />}>
                  <Remold.Icon icon={<HugeiconsIcon icon={SIGN[phase]} />} strokeWidth={1.9} spring={{ duration: 0.4, bounce: 0.1 }} aria-hidden="true" />
                </Remold.Anchor>
                <span className="text-[14px] font-medium tracking-[-0.005em] whitespace-nowrap">
                  <Shimmer active={phase === "working"}>
                    <Remold.Text className="inline-block whitespace-nowrap">{title}</Remold.Text>
                  </Shimmer>
                </span>
                <span className="min-w-0 flex-1" />
                <span className="flex-none text-[12.5px] whitespace-nowrap text-(--muted) tabular-nums">
                  <Remold.Text className="inline-block whitespace-nowrap">{detail}</Remold.Text>
                </span>
                {steps.length > 0 && !busy && (
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    strokeWidth={2}
                    data-open={shown || undefined}
                    className="size-4 flex-none text-(--muted) transition-[rotate] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                )}
              </button>
              {canUndo && (
                <button
                  type="button"
                  onClick={() => {
                    field.current?.focus({ preventScroll: true });
                    void undoAll();
                  }}
                  className={`${PILL} mr-1 bg-(--well) text-(--ink) hover:bg-(--rule)`}
                >
                  Undo all
                </button>
              )}
            </div>
          )}

          {active && shown && steps.length > 0 && (
            <ol id={trail} className="m-0 grid list-none grid-cols-[minmax(0,1fr)] p-0 pt-0.5 pb-1" aria-label="What the agent did">
              {steps.map((step) => (
                <Trail key={step.id} step={step} approval={approval} deny={deny} />
              ))}
            </ol>
          )}

          <form onSubmit={submit} className="flex h-12 items-center gap-2.5 pr-1.5 pl-2.5">
            <span data-agent-home="" className="grid size-6 flex-none place-items-center text-(--muted) [&_svg]:size-[18px]">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={1.9} aria-hidden="true" />
            </span>
            <input
              ref={field}
              aria-label="Ask the agent"
              placeholder="Ask the agent to change something"
              value={busy ? prompt : text}
              readOnly={busy}
              onChange={(event) => setText(event.target.value)}
              autoComplete="off"
              className="h-9 min-w-0 flex-1 border-0 bg-transparent p-0 font-sans text-[14px] text-(--ink) outline-none placeholder:text-(--muted) read-only:text-(--muted)"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={busy || !text.trim()}
              className="grid size-9 flex-none place-items-center rounded-full border-0 bg-(--ink) text-white outline-none transition-[background-color,color,scale] duration-150 ease-out enabled:cursor-pointer enabled:active:scale-[0.97] disabled:bg-(--well) disabled:text-(--muted) focus-visible:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)] motion-reduce:transition-none"
            >
              <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2.2} className="size-[18px]" aria-hidden="true" />
            </button>
          </form>

          {!busy && (
            <div className="flex flex-wrap gap-1.5 px-2 pt-0.5 pb-1.5">
              {IDEAS.map((idea) => (
                <button key={idea.label} type="button" onClick={() => send(idea.prompt)} className={`${PILL} bg-(--well) font-medium text-(--ink) hover:bg-(--rule)`}>
                  {idea.label}
                </button>
              ))}
            </div>
          )}
        </section>
      </Remold.Morph>
    </Remold.Connectors>
  );
}
