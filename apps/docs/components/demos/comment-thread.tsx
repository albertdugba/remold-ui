"use client";
/**
 * A live discussion, in two looks: questions and answers on a product page, and comments under
 * an article. Replies hang from their parent's avatar by curved lines that stay attached while
 * everything moves (`Remold.Connectors`), and every change is a `Remold.Layout` transition:
 *
 * - "Halden is typing…" is a small bubble that grows into the answer when it's sent.
 * - Hovering a reply lights the lines back up to the top and quiets the rest.
 * - The summary ("What buyers say", "Readers are saying") condenses the discussion into a card,
 *   and each person's avatar flies into the point they made.
 * - Helpful votes and likes tick over (`Remold.Text`), and branches fold into a pill.
 *
 * While it's on screen and untouched, it plays a short scene by itself. Touch it and it stops.
 * The shop, the product, the publication and the people are made up.
 */
import { Remold } from "@remold-ui/react";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import "./comment-thread.css";

type Rich = { kind: "sizes"; rows: [string, string, string][] } | { kind: "photo"; caption: string };

interface Comment {
  /** The client's own id: it stays the same when the server's answer arrives. */
  key: string;
  author: string;
  badge?: string;
  text: string;
  rich?: Rich;
  votes: number;
  voted: boolean;
  /** Minutes ago. */
  age: number;
  typing?: boolean;
  sending?: boolean;
  replies: Comment[];
}

interface Point {
  text: ReactNode;
  who: string[];
}

interface Look {
  key: "product" | "article";
  label: string;
  /** What a vote is called: "Helpful" or a heart. */
  vote: string;
  noun: [string, string];
  /** The thing being discussed, shown above the comments. */
  top: ReactNode;
  start: Comment[];
  scene: ((list: Comment[]) => { list: Comment[]; summary?: boolean })[];
  summary: { heading: string; points: Point[]; foot: string };
  here: string[];
}

/** Illustrated avatars from DiceBear's public API: drawn, so no real person's face. Same name, same face. */
const avatar = (name: string) => `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=f1f1f3`;

const c = (key: string, author: string, text: string, votes: number, age: number, extra: Partial<Comment> = {}): Comment => ({
  key,
  author,
  text,
  votes,
  voted: false,
  age,
  replies: [],
  ...extra,
});

/** The scene's building blocks: someone starts typing under `parent`, then sends. */
const typing = (parent: string | null, key: string, author: string, badge?: string) => (l: Comment[]) => {
  const bubble = c(key, author, "", 0, 0, { typing: true, ...(badge ? { badge } : {}) });
  return { list: parent === null ? [...l, bubble] : edit(l, parent, (x) => ({ ...x, replies: [...x.replies, bubble] })) };
};
const sends =
  (key: string, text: string, votes = 0) =>
  (l: Comment[]) => ({ list: edit(l, key, (x) => ({ ...x, typing: false, text, votes })) });
const votesOn =
  (...keys: string[]) =>
  (l: Comment[]) => ({ list: keys.reduce((acc, k) => edit(acc, k, (x) => ({ ...x, votes: x.votes + 1 })), l) });

/* 1. Questions and answers on a product page. */

const PRODUCT_START: Comment[] = [
  c("q-size", "Jonas Weber", "Does it run true to size? I’m usually between M and L.", 24, 2880, {
    badge: "Verified buyer",
    replies: [
      c("a-size", "Halden", "It’s a relaxed fit, so most people size down. In cm:", 18, 2700, {
        badge: "Seller",
        rich: {
          kind: "sizes",
          rows: [
            ["S", "104", "70"],
            ["M", "112", "72"],
            ["L", "120", "74"],
          ],
        },
        replies: [
          c("r-priya", "Priya Nair", "Can confirm. I’m usually an L and the M fits perfectly.", 9, 1440, {
            badge: "Verified buyer",
            replies: [
              c("r-jonas", "Jonas Weber", "Thanks! How tall are you, if you don’t mind me asking?", 3, 1380, {
                badge: "Verified buyer",
                replies: [
                  c("r-priya-2", "Priya Nair", "178 cm. The M still covers my hips with a jumper underneath.", 5, 1320, {
                    badge: "Verified buyer",
                    replies: [
                      c("r-halden-fit", "Halden", "Good shout. We’re adding a fit guide by height to the size chart.", 4, 1200, {
                        badge: "Seller",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      c("r-sam", "Sam Ortiz", "Bought the M. Sleeves are a touch long, which I like with gloves.", 7, 900, {
        badge: "Verified buyer",
        rich: { kind: "photo", caption: "Sam’s photo" },
        replies: [
          c("r-ada-cuff", "Ada Kim", "Do the cuffs adjust, or are they elasticated?", 2, 840, {
            replies: [c("r-halden-cuff", "Halden", "A snap tab on each cuff, two positions.", 3, 800, { badge: "Seller" })],
          }),
        ],
      }),
    ],
  }),
  c("q-rain", "Ada Kim", "Is it waterproof, or just water-resistant?", 11, 600, {
    replies: [
      c("a-rain", "Halden", "Water-resistant. It handles drizzle and light rain, but it isn’t taped for downpours.", 6, 540, {
        badge: "Seller",
        replies: [
          c("r-leo", "Leo Grant", "Wore it through a proper shower on the walk home. Dry for about twenty minutes.", 8, 420, {
            badge: "Verified buyer",
            replies: [c("r-ada-thanks", "Ada Kim", "That’s exactly what I needed to know, thank you.", 1, 380)],
          }),
        ],
      }),
    ],
  }),
];

function JacketCard() {
  return (
    <div className="cx-product">
      <span className="cx-product-art" role="img" aria-label="The Field Jacket">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M24 10l8 5 8-5 10 5 6 16-7 3v20H15V34l-7-3 6-16Z" />
          <path d="M32 15v39M26 30h-4M42 30h-4" />
        </svg>
      </span>
      <span className="cx-product-info">
        <strong>Field Jacket</strong>
        <span>Halden · £189</span>
        <span className="cx-stars" aria-label="Rated 4.6 out of 5 from 218 reviews">
          ★★★★<span className="part">★</span> <em>4.6 · 218 reviews</em>
        </span>
      </span>
    </div>
  );
}

const PRODUCT: Look = {
  key: "product",
  label: "Product Q&A",
  vote: "Helpful",
  noun: ["question", "questions"],
  top: <JacketCard />,
  start: PRODUCT_START,
  scene: [
    typing(null, "q-wash", "Mira Okafor"),
    sends("q-wash", "Does the green fade after a few washes?", 2),
    typing("q-wash", "a-wash", "Halden", "Seller"),
    sends("a-wash", "Not in our tests: 40 washes at 30°C. Turn it inside out to be safe.", 1),
    votesOn("a-wash", "r-priya"),
    (l) => ({ list: l, summary: true }),
    (l) => ({ list: l, summary: false }),
    () => ({ list: PRODUCT_START }),
  ],
  summary: {
    heading: "What buyers say",
    points: [
      {
        text: (
          <>
            Runs large: <b>most buyers size down</b>.
          </>
        ),
        who: ["Jonas Weber", "Priya Nair", "Halden"],
      },
      {
        text: (
          <>
            <b>Water-resistant</b>, not waterproof. Fine for light rain.
          </>
        ),
        who: ["Ada Kim", "Halden"],
      },
      {
        text: (
          <>
            Sleeves run <b>a little long</b>.
          </>
        ),
        who: ["Sam Ortiz"],
      },
    ],
    foot: "From questions, answers and 218 reviews",
  },
  here: ["Mira Okafor", "Jonas Weber", "Priya Nair"],
};

const HOME_THREAD: Comment[] = [
  c("preview-question", "Jonas Weber", "Does it run true to size? I’m usually between M and L.", 24, 2880, {
    badge: "Verified buyer",
    replies: [
      c("preview-answer", "Halden", "It’s a relaxed fit, so most people size down.", 18, 2700, {
        badge: "Seller",
        replies: [
          c("preview-confirmation", "Priya Nair", "Can confirm. I’m usually an L and the M fits perfectly.", 9, 1440, {
            badge: "Verified buyer",
            replies: [c("preview-fit-note", "Jonas Weber", "That’s helpful — I’ll go with the M, then.", 3, 1380, { badge: "Verified buyer" })],
          }),
        ],
      }),
    ],
  }),
  c("preview-rain", "Ada Kim", "Is it waterproof, or just water-resistant?", 11, 600, {
    replies: [
      c("preview-rain-answer", "Halden", "Water-resistant. It handles a drizzle, but it isn’t made for a downpour.", 6, 540, {
        badge: "Seller",
        replies: [c("preview-rain-note", "Leo Grant", "Mine stayed dry through a twenty-minute walk home in the rain.", 8, 420, { badge: "Verified buyer" })],
      }),
    ],
  }),
];

const LOOKS = [PRODUCT];
const SORTS = ["Top", "Newest"] as const;
type Sort = (typeof SORTS)[number];

const ago = (m: number) => (m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`);
const count = (list: Comment[]): number => list.reduce((n, x) => n + (x.typing ? 0 : 1) + count(x.replies), 0);

/** The discussion with `update` applied to the comment with `key`. */
function edit(list: Comment[], key: string, update: (c: Comment) => Comment): Comment[] {
  return list.map((x) => (x.key === key ? update(x) : { ...x, replies: edit(x.replies, key, update) }));
}

function arrange(list: Comment[], sort: Sort): Comment[] {
  const order = sort === "Top" ? (a: Comment, b: Comment) => b.votes - a.votes : (a: Comment, b: Comment) => a.age - b.age;
  // Someone typing stays at the end, where their message will land.
  return [...list]
    .sort((a, b) => Number(!!a.typing) - Number(!!b.typing) || order(a, b))
    .map((x) => ({ ...x, replies: arrange(x.replies, sort) }));
}

/** The keys from the top down to `key`. */
function trail(list: Comment[], key: string, path: string[] = []): string[] | null {
  for (const x of list) {
    if (x.key === key) return [...path, x.key];
    const found = trail(x.replies, key, [...path, x.key]);
    if (found) return found;
  }
  return null;
}

function Avatar({ name, anchor, link, lit, small }: { name: string; anchor?: string; link?: string; lit?: boolean; small?: boolean }) {
  return (
    <img
      className={`cx-avatar${small ? " small" : ""}`}
      src={avatar(name)}
      alt=""
      width={small ? 22 : 36}
      height={small ? 22 : 36}
      {...(anchor ? { "data-rm-anchor": anchor } : {})}
      {...(link ? { "data-rm-link": link } : {})}
      {...(lit ? { "data-rm-line": "lit" } : {})}
    />
  );
}

function RichContent({ rich }: { rich: Rich }) {
  if (rich.kind === "sizes") {
    return (
      <ul className="cx-sizes" aria-label="Size chart in cm">
        {rich.rows.map(([size, chest, length]) => (
          <li key={size}>
            <b>{size}</b>
            <span>
              chest {chest} · length {length}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <span className="cx-photo" role="img" aria-label={rich.caption}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M24 10l8 5 8-5 10 5 6 16-7 3v20H15V34l-7-3 6-16Z" />
      </svg>
      <em>{rich.caption}</em>
    </span>
  );
}

/** Which look is showing: product Q&A or article comments. */
export type ThreadLook = Look["key"];
export type CommentThreadVariant = "full" | "preview";

interface CommentThreadDemoProps {
  onLookChange?: (look: ThreadLook) => void;
  variant?: CommentThreadVariant;
}

export function CommentThreadDemo({ onLookChange, variant = "full" }: CommentThreadDemoProps = {}) {
  const isPreview = variant === "preview";
  const [lookKey, setLookKey] = useState<Look["key"]>("product");
  const look = LOOKS.find((l) => l.key === lookKey)!;
  // Tell the page when the look changes, by hand or by the scene playing itself.
  const lookListener = useRef(onLookChange);
  lookListener.current = onLookChange;
  useEffect(() => lookListener.current?.(lookKey), [lookKey]);
  const [comments, setComments] = useState(() => (isPreview ? HOME_THREAD : PRODUCT_START));
  const [sort, setSort] = useState<Sort>("Top");
  const [summary, setSummary] = useState(false);
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const [hover, setHover] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState(true);
  const [visible, setVisible] = useState(false);
  const step = useRef(0);
  const frame = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const shown = useMemo(() => arrange(comments, sort), [comments, sort]);
  const lit = useMemo(() => new Set(hover ? trail(shown, hover) ?? [] : []), [hover, shown]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? false), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The scene, one beat every couple of seconds, while it's live and on screen.
  useEffect(() => {
    if (!live || !visible) return;
    const timer = setInterval(() => {
      if (isPreview) {
        const beat = step.current++ % 4;
        setSummary(beat === 1);
        setSort(beat === 3 ? "Newest" : "Top");
        return;
      }
      const beat = look.scene[step.current % look.scene.length]!;
      step.current++;
      setComments((list) => {
        const next = beat(list);
        if (next.summary !== undefined) setSummary(next.summary);
        return next.list;
      });
    }, 2100);
    return () => clearInterval(timer);
  }, [isPreview, live, visible, look]);

  /** Anything the viewer does takes over from the scene. */
  const takeOver = () => {
    if (live) setLive(false);
  };

  const switchTo = (key: Look["key"]) => {
    const next = LOOKS.find((l) => l.key === key)!;
    step.current = 0;
    setLookKey(key);
    setComments(isPreview ? HOME_THREAD : next.start);
    setSummary(false);
    setFolded(new Set());
    setReplying(null);
  };

  const toggleFold = (key: string) =>
    setFolded((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const send = (e: FormEvent, parent: string) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const key = `you-${Date.now()}`;
    const mine = c(key, "You", text, 0, 0, { sending: true });
    setComments((list) => edit(list, parent, (comment) => ({ ...comment, replies: [...comment.replies, mine] })));
    setFolded((s) => {
      const next = new Set(s);
      next.delete(parent);
      return next;
    });
    setDraft("");
    setReplying(null);
    // The server confirms it. The client key stays, so the reply and its line stay put.
    setTimeout(() => setComments((list) => edit(list, key, (x) => ({ ...x, sending: false }))), 900);
  };

  const thread = (list: Comment[], parent: string, depth = 0): ReactNode =>
    list.map((x) => {
      const isFolded = folded.has(x.key);
      const total = count(x.replies);
      const isLit = lit.has(x.key);
      const official = x.badge === "Seller" || x.badge === "Author";
      return (
        <article
          key={x.key}
          className={`cx-comment${x.typing ? " typing" : ""}`}
          data-depth={depth}
          data-lit={isLit || undefined}
          data-top={parent === "top" || undefined}
          onPointerEnter={() => setHover(x.key)}
          onPointerLeave={() => setHover(parent === "top" ? null : parent)}
        >
          {/* Lines join a reply to the comment it answers. Top-level comments stand on their own. */}
          <Avatar name={x.author} anchor={x.key} link={parent === "top" ? undefined : parent} lit={isLit} />
          {x.typing ? (
            <div className="cx-bubble cx-dots" role="status" aria-label={`${x.author} is typing`}>
              <i />
              <i />
              <i />
            </div>
          ) : (
            <div className="cx-main">
              <div className={`cx-bubble${official ? " official" : ""}`}>
                <p className="cx-meta">
                  <strong>{x.author}</strong>
                  {x.badge && <span className={`cx-badge${official ? " official" : ""}`}>{x.badge}</span>}
                  <Remold.Text className="cx-age">{x.sending ? "Sending…" : ago(x.age)}</Remold.Text>
                </p>
                <p className="cx-text">{x.text}</p>
                {x.rich && <RichContent rich={x.rich} />}
              </div>
              <div className="cx-under">
                <button
                  type="button"
                  className="cx-vote"
                  aria-pressed={x.voted}
                  aria-label={`${look.vote === "♥" ? "Like" : "Helpful"}, ${x.votes}`}
                  onClick={() =>
                    setComments((l) => edit(l, x.key, (y) => ({ ...y, voted: !y.voted, votes: y.votes + (y.voted ? -1 : 1) })))
                  }
                >
                  <span aria-hidden="true">{look.vote}</span>
                  <Remold.Text>{String(x.votes)}</Remold.Text>
                </button>
                <button
                  type="button"
                  className="cx-text-button"
                  onClick={() => {
                    setReplying(replying === x.key ? null : x.key);
                    requestAnimationFrame(() => input.current?.focus());
                  }}
                >
                  {look.key === "product" && parent === "top" ? "Answer" : "Reply"}
                </button>
                {total > 0 && !isFolded && (
                  <button type="button" className="cx-text-button" aria-expanded onClick={() => toggleFold(x.key)}>
                    Hide replies
                  </button>
                )}
              </div>
              {replying === x.key && (
                <form className="cx-compose" onSubmit={(e) => send(e, x.key)}>
                  <img className="cx-compose-face" src={avatar("You")} alt="" width={28} height={28} />
                  <div className="cx-compose-box">
                    <textarea
                      ref={input}
                      rows={1}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setReplying(null);
                        else if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder={`Reply to ${x.author.split(" ")[0]}…`}
                      aria-label={`Reply to ${x.author}`}
                    />
                    <div className="cx-compose-bar">
                      <span className="cx-compose-hint" aria-hidden="true">
                        <kbd>Enter</kbd> to send · <kbd>Esc</kbd> to cancel
                      </span>
                      <span className="cx-compose-actions">
                        <button type="button" className="cx-compose-cancel" onClick={() => setReplying(null)}>
                          Cancel
                        </button>
                        <button type="submit" className="cx-compose-send" disabled={!draft.trim()} aria-label="Send reply">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 19V5M6 11l6-6 6 6" />
                          </svg>
                        </button>
                      </span>
                    </div>
                  </div>
                </form>
              )}
              {total > 0 && isFolded && (
                <button
                  type="button"
                  className="cx-folded"
                  aria-expanded={false}
                  data-rm-anchor={`folded-${x.key}`}
                  data-rm-link={x.key}
                  onClick={() => toggleFold(x.key)}
                >
                  <span className="cx-faces" aria-hidden="true">
                    {x.replies.slice(0, 3).map((reply) => (
                      <img key={reply.key} src={avatar(reply.author)} alt="" width={18} height={18} />
                    ))}
                  </span>
                  {total} {total === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>
          )}
          {!isFolded && x.replies.length > 0 && <div className="cx-replies">{thread(x.replies, x.key, depth + 1)}</div>}
        </article>
      );
    });

  // Only what changes the layout starts a transition: not hovering, not typing in the reply box.
  const shape = summary
    ? `${look.key}:summary`
    : look.key +
      JSON.stringify(shown, (k, v) => (["text", "author", "rich", "age", "badge"].includes(k) ? undefined : v)) +
      [...folded].join() +
      replying;
  const topLevel = shown.filter((x) => !x.typing).length;
  const total = count(comments);
  return (
    <div className="cx not-prose" data-look={look.key} data-variant={isPreview ? "preview" : undefined} ref={frame} onPointerDown={takeOver} onKeyDown={takeOver}>
      <div className="cx-bar">
        <div className="cx-tools">
          <span className="cx-here" aria-label={`${look.here.length} people here`}>
            {look.here.map((name) => (
              <img key={name} src={avatar(name)} alt="" width={22} height={22} />
            ))}
            <em>{look.here.length} here</em>
          </span>
          <button type="button" className="cx-summarise" aria-pressed={summary} onClick={() => setSummary((v) => !v)}>
            <Remold.Text>{summary ? "Show all" : "Summarize"}</Remold.Text>
          </button>
          <button
            type="button"
            className={`cx-live${live ? " on" : ""}`}
            aria-pressed={live}
            aria-label={live ? "Pause autoplay" : "Start autoplay"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (!live) switchTo(look.key);
              setLive((v) => !v);
            }}
          >
            <Remold.Icon icon={live ? Pause : Play} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <Remold.Connectors className={`cx-stage${hover ? " focus" : ""}`} radius={24} gap={8} onPointerLeave={() => setHover(null)}>
        <Remold.Layout trigger={shape} spring={{ duration: 0.45, bounce: 0.04 }}>
          <div className="cx-top">{look.top}</div>
          <div className="cx-list-head">
            <Remold.Text className="cx-count">{`${topLevel} ${
              topLevel === 1 ? look.noun[0] : look.noun[1]
            } · ${total} in all`}</Remold.Text>
            {!summary && (
              <div className="cx-seg small" role="group" aria-label="Sort">
                {SORTS.map((s) => (
                  <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {summary ? (
            <section className="cx-summary" aria-label={look.summary.heading}>
              <p className="cx-summary-head">{look.summary.heading}</p>
              <ul>
                {look.summary.points.map((p, i) => (
                  <li key={i}>
                    <p>{p.text}</p>
                    <span className="cx-chips">
                      {p.who.map((name) => (
                        <Avatar key={name} name={name} small />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="cx-summary-foot">{look.summary.foot}</p>
            </section>
          ) : (
            <div className="cx-replies top">{thread(shown, "top")}</div>
          )}
        </Remold.Layout>
      </Remold.Connectors>
    </div>
  );
}
