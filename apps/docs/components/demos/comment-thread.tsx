"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark01Icon, FavouriteIcon, MessageCircleIcon, PauseIcon, PlayIcon, RepeatOne02Icon } from "@hugeicons/core-free-icons";
import { Remold, useConnectorMotion } from "@remold-ui/react";
import { motion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowUpIcon } from "./demo-icons";
import {
  addTypingComment,
  addVotes,
  commentTrail,
  countComments,
  handleOf,
  makeComment,
  postThread,
  previewThread,
  sendTypingComment,
  sortComments,
  updateComment,
  type Comment,
} from "./comment-thread.model";
import "./comment-thread.css";

/** Illustrated avatars from DiceBear's public API: drawn, so no real person's face. Same name, same face. */
const avatar = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    name,
  )}&backgroundColor=f1f1f3`;

const AUTHOR = { name: "Ama Mensah", handle: "@amamensah" };
const MAX_DEPTH = 3;
const POST_LIKES = 248;
const REPOSTS = 31;

/** The scene: a reader asks something, the author answers, a couple of likes land, then it starts over. */
const SCENE: ((list: Comment[]) => Comment[])[] = [
  addTypingComment(null, "c-release", "Abena Osei"),
  sendTypingComment(
    "c-release",
    "Did you automate releases from day one, or do them by hand at first?",
    2,
  ),
  addTypingComment("c-release", "r-release", AUTHOR.name, "Author"),
  sendTypingComment(
    "r-release",
    "Automated from the first release. Doing one by hand was enough.",
    1,
  ),
  addVotes("r-release", "r-esi"),
];

const SORTS = ["Top", "Newest"] as const;
type Sort = (typeof SORTS)[number];

const ago = (m: number) =>
  m < 1
    ? "now"
    : m < 60
    ? `${m}m`
    : m < 1440
    ? `${Math.round(m / 60)}h`
    : `${Math.round(m / 1440)}d`;

function Avatar({
  name,
  anchor,
  link,
  lit,
  size = 36,
}: {
  name: string;
  anchor?: string;
  link?: string;
  lit?: boolean;
  size?: number;
}) {
  return (
    <img
      className="cx-avatar"
      src={avatar(name)}
      alt=""
      width={size}
      height={size}
      {...(anchor ? { "data-rm-anchor": anchor } : {})}
      {...(link ? { "data-rm-link": link } : {})}
      {...(lit ? { "data-rm-line": "lit" } : {})}
    />
  );
}

/** The post everyone is replying to: who wrote it, what they said, the link they shared. */
function Post({
  liked,
  onLike,
  comments,
}: {
  liked: boolean;
  onLike: () => void;
  comments: number;
}) {
  return (
    <article className="cx-post" aria-label={`Post by ${AUTHOR.name}`}>
      <header className="cx-post-head">
        <Avatar name={AUTHOR.name} size={40} />
        <span className="cx-post-who">
          <strong>{AUTHOR.name}</strong>
          <span>{`${AUTHOR.handle} · 4h`}</span>
        </span>
      </header>
      <p className="cx-post-text">
        I shipped my first open-source library last week. Ten weeks of evenings,
        one launch post and a lot of lessons. Here’s what I’d do again, and what
        I wouldn’t.
      </p>
      <div className="cx-post-bar">
        <button
          type="button"
          className="cx-post-action"
          aria-pressed={liked}
          aria-label={`Like, ${POST_LIKES + (liked ? 1 : 0)}`}
          onClick={onLike}
        >
          <HugeiconsIcon icon={FavouriteIcon} aria-hidden="true" />
          <span>{POST_LIKES + (liked ? 1 : 0)}</span>
        </button>
        <span className="cx-post-action" aria-label={`${comments} comments`}>
          <HugeiconsIcon icon={MessageCircleIcon} aria-hidden="true" />
          <span>{comments}</span>
        </span>
        <span className="cx-post-action" aria-label={`${REPOSTS} reposts`}>
          <HugeiconsIcon icon={RepeatOne02Icon} aria-hidden="true" />
          <span>{REPOSTS}</span>
        </span>
        <button type="button" className="cx-post-action save" aria-label="Save">
          <HugeiconsIcon icon={Bookmark01Icon} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export type CommentThreadVariant = "full" | "preview";

interface CommentThreadDemoProps {
  variant?: CommentThreadVariant;
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function CommentThreadDemo({
  variant = "full",
  playing,
}: CommentThreadDemoProps = {}) {
  const isPreview = variant === "preview";
  const start = isPreview ? previewThread : postThread;
  const [comments, setComments] = useState(start);
  const [sort, setSort] = useState<Sort>("Top");
  const [liked, setLiked] = useState(false);
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const [hover, setHover] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState(playing ?? false);
  const [visible, setVisible] = useState(false);
  const step = useRef(0);
  const frame = useRef<HTMLDivElement>(null);
  const connectorRoot = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const connectorMotion = useConnectorMotion(connectorRoot);
  const shown = useMemo(() => sortComments(comments, sort), [comments, sort]);
  const lit = useMemo(
    () => new Set(hover ? commentTrail(shown, hover) ?? [] : []),
    [hover, shown],
  );

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e?.isIntersecting ?? false),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The scene, one beat every couple of seconds, while it's live and on screen. After the last beat
  // the thread goes back to how it started.
  useEffect(() => {
    if (!live || !visible) return;
    const timer = setInterval(() => {
      const beat = step.current % (SCENE.length + 1);
      step.current++;
      if (beat === SCENE.length) {
        setComments(start());
        setLiked(false);
      } else {
        setComments((list) => SCENE[beat]!(list));
        if (beat === SCENE.length - 1) setLiked(true);
      }
    }, 2100);
    return () => clearInterval(timer);
  }, [live, visible, start]);

  // Played from outside, the scene follows that control; on its own, the first touch stops it.
  useEffect(() => {
    if (playing !== undefined) setLive(playing);
  }, [playing]);

  const takeOver = () => {
    if (playing === undefined && live) setLive(false);
  };

  const restart = () => {
    step.current = 0;
    setComments(start());
    setLiked(false);
    setFolded(new Set());
    setReplying(null);
  };

  const toggleFold = (key: string) =>
    setFolded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const send = (event: FormEvent, parent: string, mention?: string) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const key = `you-${Date.now()}`;
    const mine = makeComment(key, "You", text, 0, 0, { sending: true, mention });
    setComments((list) =>
      updateComment(list, parent, (comment) => ({
        ...comment,
        replies: [...comment.replies, mine],
      })),
    );
    setFolded((current) => {
      const next = new Set(current);
      next.delete(parent);
      return next;
    });
    setDraft("");
    setReplying(null);

    // The server confirms it. The client key stays, so the reply and its line stay put.
    setTimeout(
      () =>
        setComments((list) =>
          updateComment(list, key, (x) => ({ ...x, sending: false })),
        ),
      900,
    );
  };

  const thread = (list: Comment[], parent: string, depth = 0, parentAuthor?: string): ReactNode =>
    list.map((x) => {
      const isFolded = folded.has(x.key);
      const total = countComments(x.replies);
      const isLit = lit.has(x.key);
      const author = x.badge === "Author";
      const deep = depth >= MAX_DEPTH;
      const mention = x.mention ?? (depth >= 2 && parentAuthor ? handleOf(parentAuthor) : undefined);
      const replyTo = depth > 0 ? handleOf(x.author) : undefined;
      return (
        <motion.article
          layout="position"
          {...connectorMotion}
          key={x.key}
          className={`cx-comment${x.typing ? " typing" : ""}`}
          data-depth={depth}
          data-lit={isLit || undefined}
          data-top={parent === "top" || undefined}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.32, bounce: 0.12 }}
          onPointerEnter={(event) => event.pointerType === "mouse" && setHover(x.key)}
          onPointerLeave={() => setHover(parent === "top" ? null : parent)}
        >
          <Avatar
            name={x.author}
            anchor={x.key}
            link={parent === "top" ? undefined : parent}
            lit={isLit}
          />
          {x.typing ? (
            <div
              className="cx-bubble cx-dots"
              role="status"
              aria-label={`${x.author} is typing`}
            >
              <i />
              <i />
              <i />
            </div>
          ) : (
            <div className="cx-main">
              <div className={`cx-bubble${author ? " official" : ""}`}>
                <p className="cx-meta">
                  <strong>{x.author}</strong>
                  {x.badge && (
                    <span className={`cx-badge${author ? " official" : ""}`}>
                      {x.badge}
                    </span>
                  )}
                  <span className="cx-age">
                    {x.sending ? "Sending…" : ago(x.age)}
                  </span>
                </p>
                <p className="cx-text">
                  {mention && <span className="cx-mention">{mention} </span>}
                  {x.text}
                </p>
              </div>
              <div className="cx-under">
                <button
                  type="button"
                  className="cx-vote"
                  aria-pressed={x.voted}
                  aria-label={`Like, ${x.votes}`}
                  onClick={() =>
                    setComments((l) =>
                      updateComment(l, x.key, (y) => ({
                        ...y,
                        voted: !y.voted,
                        votes: y.votes + (y.voted ? -1 : 1),
                      })),
                    )
                  }
                >
                  <HugeiconsIcon icon={FavouriteIcon} aria-hidden="true" />
                  <span>{String(x.votes)}</span>
                </button>
                <button
                  type="button"
                  className="cx-text-button"
                  onClick={() => {
                    setReplying(replying === x.key ? null : x.key);
                    requestAnimationFrame(() => input.current?.focus());
                  }}
                >
                  Reply
                </button>
                {total > 0 && !isFolded && (
                  <button
                    type="button"
                    className="cx-text-button"
                    aria-expanded
                    onClick={() => toggleFold(x.key)}
                  >
                    Hide replies
                  </button>
                )}
              </div>
              {replying === x.key && (
                <form className="cx-compose" onSubmit={(event) => send(event, deep ? parent : x.key, replyTo)}>
                  <img
                    className="cx-compose-face"
                    src={avatar("You")}
                    alt=""
                    width={28}
                    height={28}
                  />
                  <div className="cx-compose-box">
                    {replyTo && <span className="cx-compose-to">{replyTo}</span>}
                    <textarea
                      ref={input}
                      rows={1}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setReplying(null);
                        else if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder={replyTo ? "Add a reply…" : `Reply to ${x.author.split(" ")[0]}…`}
                      aria-label={`Reply to ${x.author}`}
                    />
                    <div className="cx-compose-bar">
                      <span className="cx-compose-hint" aria-hidden="true">
                        <kbd>Enter</kbd> to send · <kbd>Esc</kbd> to cancel
                      </span>
                      <span className="cx-compose-actions">
                        <button
                          type="button"
                          className="cx-compose-cancel"
                          onClick={() => setReplying(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="cx-compose-send"
                          disabled={!draft.trim()}
                          aria-label="Send reply"
                        >
                          <ArrowUpIcon />
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
                      <img
                        key={reply.key}
                        src={avatar(reply.author)}
                        alt=""
                        width={18}
                        height={18}
                      />
                    ))}
                  </span>
                  {total} {total === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>
          )}
          {!isFolded && x.replies.length > 0 && (
            <motion.div layout="position" {...connectorMotion} className="cx-replies">
              {thread(x.replies, x.key, depth + 1, x.author)}
            </motion.div>
          )}
        </motion.article>
      );
    });

  const total = countComments(comments);
  return (
    <div
      className="cx not-prose"
      data-look="post"
      data-variant={isPreview ? "preview" : undefined}
      ref={frame}
      onPointerDown={takeOver}
      onKeyDown={takeOver}
    >
      {/* A preview plays on its own; a playback control would make it read as a video. */}
      {!isPreview && (
        <button
          type="button"
          className={`cx-live${live ? " on" : ""}`}
          aria-pressed={live}
          aria-label={live ? "Pause autoplay" : "Start autoplay"}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (!live) restart();
            setLive((v) => !v);
          }}
        >
          {live ? (
            <HugeiconsIcon icon={PauseIcon} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <HugeiconsIcon icon={PlayIcon} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      )}

      <Remold.Connectors
        ref={connectorRoot}
        className={`cx-stage${hover ? " focus" : ""}`}
        radius={16}
        gap={4}
        onPointerLeave={() => setHover(null)}
      >
          <motion.div layout="position" {...connectorMotion} className="cx-top">
            <Post
              liked={liked}
              onLike={() => setLiked((v) => !v)}
              comments={total}
            />
          </motion.div>
          <motion.div layout="position" {...connectorMotion} className="cx-list-head">
            <span className="cx-count">{`${total} ${
              total === 1 ? "comment" : "comments"
            }`}</span>
            <div className="cx-seg small" role="group" aria-label="Sort">
              {SORTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={sort === option}
                  onClick={() => setSort(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </motion.div>
          <motion.div layout="position" {...connectorMotion} className="cx-replies top">
            {thread(shown, "top")}
          </motion.div>
      </Remold.Connectors>
    </div>
  );
}
