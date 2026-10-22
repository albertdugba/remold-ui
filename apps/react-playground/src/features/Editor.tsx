/**
 * An AI writing editor. Every word is its own element, so a rewrite is a keyless diff at the
 * word level: words that survive glide to their new places, corrected typos are recognised by
 * their spelling, and new words fade in. An accepted suggestion's words flow from the card into
 * the paragraph, because they are the same words.
 */
import { springs, Remold } from "@remold-ui/react";
import { useState } from "react";
import { icons, type IconName } from "../icons";
import { useMotion, useRun } from "../motion";
import { Segmented } from "../ui/controls";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { Browser } from "../ui/layout";
import { useTransitionStats } from "../ui/useTransitionStats";

const TITLE = "Notes now syncs everywhere";
const VERSIONS = {
  Draft:
    "We're exited to anounce that Northwind Notes now syncs your documents across every device in real time, so the changes you make on your laptop appear on your phone before you've even picked it up.",
  Corrected:
    "We're excited to announce that Northwind Notes now syncs your documents across every device in real time, so the changes you make on your laptop appear on your phone before you've even picked it up.",
  Shorter: "Northwind Notes now syncs your documents across every device in real time.",
  Friendlier:
    "Good news: Northwind Notes now syncs across all your devices in real time, so whatever you write on your laptop is already waiting on your phone.",
} as const;
type Version = keyof typeof VERSIONS;

const SUGGESTION = "It even works offline, and catches up the moment you reconnect.";
const OUTLINE = [
  { heading: "What's new", points: ["Northwind Notes now syncs", "every device in real time"] },
  { heading: "Why it matters", points: ["changes on your laptop", "appear on your phone"] },
];

const ACTIONS: { version: Version; label: string; icon: IconName; status: string }[] = [
  { version: "Corrected", label: "Fix spelling", icon: "check", status: "Fixed 2 spelling mistakes" },
  { version: "Shorter", label: "Make shorter", icon: "sparkle", status: "Cut to one sentence" },
  { version: "Friendlier", label: "Make friendlier", icon: "sparkle", status: "Warmer tone, same facts" },
  { version: "Draft", label: "Back to draft", icon: "read", status: "Original draft" },
];

/** Words as separate inline blocks: each can move on its own. */
const Words = ({ text, className = "" }: { text: string; className?: string }) => (
  <>
    {text.split(" ").map((word, i) => (
      <span key={i} className={`word ${className}`}>
        {word}
      </span>
    ))}
  </>
);

type View = "Draft" | "Outline";

function EditorDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion, wait } = useMotion();
  const nextRun = useRun();
  const [view, setView] = useState<View>("Draft");
  const [version, setVersion] = useState<Version>("Draft");
  const [accepted, setAccepted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<{ icon: IconName; label: string }>({ icon: "read", label: "Original draft" });
  const [stats, onTransition] = useTransitionStats("Pick a rewrite to run a transition");

  const rewrite = async (action: (typeof ACTIONS)[number]) => {
    const signal = nextRun();
    setView("Draft");
    setStatus({ icon: "sparkle", label: "Rewriting…" });
    if (!(await wait(700, signal))) return;
    setVersion(action.version);
    setStatus({ icon: action.icon, label: action.status });
  };

  // As a preview: fix spelling, shorten, accept the suggestion, warm it up, then start over.
  useAutoplay(autoplay, 2600, (count) => {
    const beat = count % 5;
    if (beat === 0) void rewrite(ACTIONS[0]!);
    else if (beat === 1) void rewrite(ACTIONS[1]!);
    else if (beat === 2) setAccepted(true);
    else if (beat === 3) void rewrite(ACTIONS[2]!);
    else {
      setAccepted(false);
      setDismissed(false);
      void rewrite(ACTIONS[3]!);
    }
  });

  return (
    <div className="demo-device">
      <Browser
        title="Launch note — Northwind Notes"
        toolbar={<Segmented label="View" options={["Draft", "Outline"] as const} value={view} onChange={setView} />}
      >
        <div className="editor">
          <Remold.Layout
            trigger={`${view}|${version}|${accepted}|${dismissed}`}
            className="editor-page"
            spring={springs.smooth}
            loop={loop}
            reducedMotion={reducedMotion}
            onTransition={onTransition}
          >
            <h3 className="doc-title">
              <Words text={TITLE} />
            </h3>
            {view === "Draft" ? (
              <>
                <p className="doc-text">
                  <Words text={VERSIONS[version]} />
                  {accepted && (
                    <>
                      {" "}
                      <Words text={SUGGESTION} />
                    </>
                  )}
                </p>
                {!accepted && !dismissed && (
                  <aside className="suggestion">
                    <p className="suggestion-label">Suggested addition</p>
                    <p className="suggestion-text">
                      <Words text={SUGGESTION} />
                    </p>
                    <div className="suggestion-actions">
                      <button type="button" className="pill-button primary" onClick={() => setAccepted(true)}>
                        Accept
                      </button>
                      <button type="button" className="pill-button" onClick={() => setDismissed(true)}>
                        Dismiss
                      </button>
                    </div>
                  </aside>
                )}
              </>
            ) : (
              <div className="outline">
                {OUTLINE.map((section) => (
                  <div key={section.heading} className="outline-section">
                    <p className="outline-heading">
                      <Words text={section.heading} />
                    </p>
                    <ul>
                      {section.points.map((point) => (
                        <li key={point}>
                          <Words text={point} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Remold.Layout>
          <aside className="assistant-panel">
            <div className="assistant-status" role="status">
              <Remold.Icon
                d={icons[status.icon]}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                loop={loop}
                reducedMotion={reducedMotion}
              />
              <Remold.Text loop={loop} reducedMotion={reducedMotion}>
                {status.label}
              </Remold.Text>
            </div>
            <div className="assistant-actions">
              {ACTIONS.map((action) => (
                <button
                  key={action.version}
                  type="button"
                  className="action"
                  aria-pressed={version === action.version}
                  onClick={() => void rewrite(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {(accepted || dismissed) && (
              <button
                type="button"
                className="reset"
                onClick={() => {
                  setAccepted(false);
                  setDismissed(false);
                }}
              >
                Bring the suggestion back
              </button>
            )}
          </aside>
        </div>
      </Browser>
      {!preview && <p className="stats">{stats}</p>}
    </div>
  );
}

export const editor: Example = {
  id: "writing",
  category: "Interfaces",
  title: "Writing assistant",
  summary: "Rewrites happen word by word: surviving words glide, typos are fixed in place, suggestions flow in.",
  headline: (
    <>
      Rewrites you can
      <br />
      actually follow.
    </>
  ),
  lead: "When an assistant rewrites your text, the words that stay glide to their new places and only the new ones fade in, so you can see what it changed. Accepted suggestions flow into the paragraph from the card they were in.",
  tries: [
    "Press Fix spelling. “exited” and “anounce” are recognised by their letters and corrected in place.",
    "Press Make shorter, then Make friendlier. Words that survive glide; the rest fade.",
    "Accept the suggestion. Its words leave the card and join the paragraph.",
    "Switch to Outline and back. Phrases that appear in both views travel between them.",
  ],
  code: `
<Remold.Layout trigger={revision}>
  <p>
    {text.split(" ").map((word, i) => (
      <span key={i} className="word">{word}</span>
    ))}
  </p>
</Remold.Layout>
// .word { display: inline-block } so each word can move
`,
  uses: [
    { name: "Remold.Layout", role: "Matches every word of the old text with the new, so survivors move and the rest fade." },
    { name: "Remold.Text", role: "The assistant's status line, changing letter by letter." },
    { name: "Remold.Icon", role: "The status icon morphing between sparkle, check and page." },
  ],
  frame: "window",
  Demo: EditorDemo,
};
