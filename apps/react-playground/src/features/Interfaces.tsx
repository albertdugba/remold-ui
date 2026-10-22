/**
 * Product interfaces whose markup is rewritten as things happen: an agent reporting its steps,
 * and a stack of notifications that fans out, gains new arrivals and loses dismissed ones.
 * Every change is one `<Remold.Layout>`; nothing is keyed for the animation's sake.
 */
import { springs, Remold } from "@remold-ui/react";
import { useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import type { IconName } from "../icons";
import { useMotion, useRun } from "../motion";
import { MorphIcon, StaticIcon } from "../ui/MorphIcon";

/** Words as separate inline blocks, so each can move on its own inside a Layout. */
const Words = ({ text }: { text: string }) => (
  <>
    {text.split(" ").map((word, i) => (
      <span key={i} className="word">
        {word}
      </span>
    ))}
  </>
);

/* An agent that shows its work, then folds it away. */

const QUESTION = "Which regions grew fastest last quarter?";
const STEPS: { icon: IconName; running: string; done: string }[] = [
  { icon: "search", running: "Searching 14 sources", done: "Searched 14 sources" },
  { icon: "read", running: "Reading the regional report", done: "Read 3 reports" },
  { icon: "table", running: "Comparing growth by region", done: "Compared 9 regions" },
];
const ANSWER = "Coastal and Lakeside grew fastest, up 18% and 14%. Northfield was flat, and the other six regions grew between 4% and 9%.";

/** 0 waiting · 1–3 working on step n · 4 writing · 5 answered */
type Phase = 0 | 1 | 2 | 3 | 4 | 5;

function statusOf(phase: Phase): { icon: IconName; label: string } {
  if (phase === 0) return { icon: "sparkle", label: "Ready when you are" };
  if (phase <= 3) return { icon: STEPS[phase - 1]!.icon, label: `Working · step ${phase} of ${STEPS.length}` };
  if (phase === 4) return { icon: "dots", label: "Writing the answer…" };
  return { icon: "check", label: "Answered in 6 seconds" };
}

function AgentDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion, wait } = useMotion();
  const nextRun = useRun();
  const [phase, setPhase] = useState<Phase>(0);

  const ask = async () => {
    const signal = nextRun();
    for (const p of [1, 2, 3, 4, 5] as const) {
      setPhase(p);
      if (p < 5 && !(await wait(1100, signal))) return;
    }
  };
  useAutoplay(autoplay, 1100, (count) => setPhase((count % 7 > 5 ? 0 : count % 7) as Phase));

  const status = statusOf(phase);
  const finished = phase === 5;
  return (
    <div className="demo-panel">
      <div className="surface agent">
        <p className="agent-question">{QUESTION}</p>
        <div className="agent-status" role="status">
          <MorphIcon name={status.icon} />
          <Remold.Text loop={loop} reducedMotion={reducedMotion}>
            {status.label}
          </Remold.Text>
        </div>
        <Remold.Layout trigger={phase} className="agent-work" spring={springs.smooth} loop={loop} reducedMotion={reducedMotion}>
          {phase > 0 && !finished && (
            <ol className="agent-steps">
              {STEPS.slice(0, Math.min(phase, 3)).map((step, i) => {
                const done = phase > i + 1;
                return (
                  <li key={step.icon} data-done={done || undefined}>
                    <StaticIcon name={done ? "check" : step.icon} />
                    <span>
                      <Words text={done ? step.done : step.running} />
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {finished && (
            <p className="agent-summary">
              <StaticIcon name="check" />
              <span>
                <Words text="Searched 14 sources · Read 3 reports · Compared 9 regions" />
              </span>
            </p>
          )}
          {phase >= 4 && (
            <p className="agent-answer">
              <Words text={phase === 4 ? ANSWER.split(".")[0]! : ANSWER} />
            </p>
          )}
        </Remold.Layout>
        {!preview && (
          <button type="button" className="pill-button primary" onClick={() => void ask()}>
            {phase === 0 ? "Ask" : "Ask again"}
          </button>
        )}
      </div>
    </div>
  );
}

export const agent: Example = {
  id: "agent",
  category: "Interfaces",
  title: "Agent at work",
  summary: "An assistant lists its steps as it works, then folds them into one line above its answer.",
  headline: (
    <>
      Show the work,
      <br />
      then get out of the way.
    </>
  ),
  lead: "While the agent works, each step appears, runs and ticks itself off. When the answer arrives, the steps fold into a single summary line and the answer takes their place. No step has a key; Remold works out which line became which.",
  tries: [
    "Press Ask. Each step appears beneath the last; the status line above changes letter by letter.",
    "Watch the end: the three steps fold into one summary and the answer grows from its first sentence.",
    "Turn on Show matches to see which words carried over between frames.",
  ],
  code: `
<Remold.Text>{status.label}</Remold.Text>
<Remold.Layout trigger={phase}>
  {finished ? <Summary /> : <Steps steps={steps} />}
  {answer && <Answer text={answer} />}
</Remold.Layout>
`,
  uses: [
    { name: "Remold.Layout", role: "Animates steps appearing, folding into the summary, and the answer growing." },
    { name: "Remold.Text", role: "The status line, changing as the agent moves from step to step." },
    { name: "Remold.Icon", role: "The status icon: sparkle, search, page, table, dots, tick." },
  ],
  frame: "panel",
  Demo: AgentDemo,
};

/* A notification stack: collapsed, fanned out, new arrivals, dismissals. */

interface Notice {
  id: number;
  app: string;
  icon: IconName;
  title: string;
  body: string;
  time: string;
}

const ARRIVALS: Omit<Notice, "id">[] = [
  { app: "Calendar", icon: "bell", title: "Design review in 10 minutes", body: "Room 4, with Priya and Ola", time: "now" },
  { app: "Messages", icon: "compose", title: "Ola", body: "Photos from Saturday are up!", time: "2m ago" },
  { app: "Deliveries", icon: "check", title: "Your order is on its way", body: "Arriving at 12:35", time: "9m ago" },
  { app: "Bank", icon: "plus", title: "Payment received", body: "$2,750.00 for invoice 1042", time: "1h ago" },
  { app: "Weather", icon: "rain", title: "Rain from 3 pm", body: "Light showers until the evening", time: "2h ago" },
];

function NotificationsDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [notices, setNotices] = useState<Notice[]>(() => ARRIVALS.slice(1).map((n, i) => ({ ...n, id: i + 1 })));
  const [expanded, setExpanded] = useState(false);
  const [next, setNext] = useState(0);

  const arrive = () => {
    const n = ARRIVALS[next % ARRIVALS.length]!;
    setNotices((all) => [{ ...n, id: Date.now(), time: "now" }, ...all].slice(0, 6));
    setNext((i) => i + 1);
  };
  const dismiss = (id: number) => setNotices((all) => all.filter((n) => n.id !== id));

  useAutoplay(autoplay, 1500, (count) => {
    const beat = count % 5;
    if (beat === 0) setExpanded(true);
    else if (beat === 1) setNotices((all) => all.slice(1));
    else if (beat === 2) setExpanded(false);
    else if (beat === 3) arrive();
    else setNotices((all) => (all.length < 3 ? [...all, ...ARRIVALS.slice(3).map((n, i) => ({ ...n, id: -i - count * 10 }))] : all));
  });

  const shown = expanded ? notices : notices.slice(0, 3);
  return (
    <div className="demo-panel">
      <div className="notices-frame">
        <div className="notices-head">
          <span>Notifications</span>
          {!preview && (
            <span className="notices-actions">
              <button type="button" className="pill-button" onClick={arrive}>
                Send one
              </button>
              <button type="button" className="pill-button" onClick={() => setExpanded((e) => !e)} disabled={notices.length < 2}>
                {expanded ? "Show less" : "Show all"}
              </button>
            </span>
          )}
        </div>
        <Remold.Layout
          trigger={`${expanded}|${notices.map((n) => n.id).join()}`}
          className="notices"
          data-expanded={expanded || undefined}
          spring={springs.snappy}
          loop={loop}
          reducedMotion={reducedMotion}
        >
          {shown.map((n, depth) => (
            <article key={n.id} className="notice" data-depth={expanded ? 0 : depth}>
              <span className="notice-icon">
                <StaticIcon name={n.icon} />
              </span>
              <span className="notice-text">
                <span className="notice-app">
                  {n.app} · {n.time}
                </span>
                <strong>{n.title}</strong>
                <span>{n.body}</span>
              </span>
              {expanded && (
                <button type="button" className="notice-dismiss" aria-label={`Dismiss: ${n.title}`} onClick={() => dismiss(n.id)}>
                  <StaticIcon name="close" />
                </button>
              )}
            </article>
          ))}
          {!expanded && notices.length > 3 && <p className="notices-more">{notices.length - 3} more</p>}
          {notices.length === 0 && <p className="notices-more">You're all caught up</p>}
        </Remold.Layout>
      </div>
    </div>
  );
}

export const notifications: Example = {
  id: "notifications",
  category: "Interfaces",
  title: "Notification stack",
  summary: "A stack of notifications that fans out into a list, takes new arrivals on top and closes the gap after a dismissal.",
  headline: (
    <>
      A stack that
      <br />
      makes room.
    </>
  ),
  lead: "Collapsed, the latest notification sits on top of a short stack. Show them all and the stack fans out into a list; dismiss one and the rest close the gap; a new one arrives on top and pushes the others down. The collapsed and expanded views are separate markup with no animation keys.",
  tries: [
    "Press Show all to fan the stack out. The cards behind slide down into a list.",
    "Dismiss one: it fades and the others close the gap.",
    "Press Send one: a new notification arrives on top and the rest make room.",
  ],
  code: `
<Remold.Layout trigger={[expanded, ...ids].join()}>
  {(expanded ? all : all.slice(0, 3)).map((n, depth) => (
    <Notice key={n.id} notice={n} depth={expanded ? 0 : depth} />
  ))}
</Remold.Layout>
`,
  uses: [{ name: "Remold.Layout", role: "Fans the stack out, makes room for arrivals and closes gaps after dismissals." }],
  frame: "panel",
  Demo: NotificationsDemo,
};
