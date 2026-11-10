"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bookmark01Icon,
  FavouriteIcon,
  MessageCircleIcon,
  PauseIcon,
  PlayIcon,
  RepeatOne02Icon,
} from "@hugeicons/core-free-icons";
import { Remold, useConnectorMotion } from "@remold-ui/react";
import { motion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type KeyboardEvent,
  type RefObject,
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

const avatar = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=f1f1f3`;

const AUTHOR = { name: "Ama Mensah", handle: "@amamensah" };
const MAX_DEPTH = 3;
const POST_LIKES = 248;
const REPOSTS = 31;

const SCENE: ((list: Comment[]) => Comment[])[] = [
  addTypingComment(null, "c-release", "Abena Osei"),
  sendTypingComment("c-release", "Did you automate releases from day one, or do them by hand at first?", 2),
  addTypingComment("c-release", "r-release", AUTHOR.name, "Author"),
  sendTypingComment("r-release", "Automated from the first release. Doing one by hand was enough.", 1),
  addVotes("r-release", "r-esi"),
];

const SORTS = ["Top", "Newest"] as const;
type Sort = (typeof SORTS)[number];

const ago = (m: number) =>
  m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;

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

function Post({ liked, onLike, comments }: { liked: boolean; onLike: () => void; comments: number }) {
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
        I shipped my first open-source library last week. Ten weeks of evenings, one launch post and a lot of
        lessons. Here’s what I’d do again, and what I wouldn’t.
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

function useInView(target: RefObject<HTMLElement | null>, threshold: number) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), {
      threshold,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, threshold]);

  return inView;
}

function ReplyComposer({
  inputRef,
  author,
  replyTo,
  draft,
  onDraftChange,
  onCancel,
  onSubmit,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  author: string;
  replyTo?: string;
  draft: string;
  onDraftChange: (draft: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      onCancel();
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form className="cx-compose" onSubmit={onSubmit}>
      <img className="cx-compose-face" src={avatar("You")} alt="" width={28} height={28} />

      <div className="cx-compose-box">
        {replyTo && <span className="cx-compose-to">{replyTo}</span>}

        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={replyTo ? "Add a reply…" : `Reply to ${author.split(" ")[0]}…`}
          aria-label={`Reply to ${author}`}
        />

        <div className="cx-compose-bar">
          <span className="cx-compose-hint" aria-hidden="true">
            <kbd>Enter</kbd> to send · <kbd>Esc</kbd> to cancel
          </span>
          <span className="cx-compose-actions">
            <button type="button" className="cx-compose-cancel" onClick={onCancel}>
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
  );
}

function FoldedReplies({ comment, total, onOpen }: { comment: Comment; total: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="cx-folded"
      aria-expanded={false}
      data-rm-anchor={`folded-${comment.key}`}
      data-rm-link={comment.key}
      onClick={onOpen}
    >
      <span className="cx-faces" aria-hidden="true">
        {comment.replies.slice(0, 3).map((reply) => (
          <img key={reply.key} src={avatar(reply.author)} alt="" width={18} height={18} />
        ))}
      </span>
      {total} {total === 1 ? "reply" : "replies"}
    </button>
  );
}

export type CommentThreadVariant = "full" | "preview";

interface CommentThreadDemoProps {
  variant?: CommentThreadVariant;
  playing?: boolean;
}

export function CommentThreadDemo({ variant = "full", playing }: CommentThreadDemoProps = {}) {
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
  const step = useRef(0);
  const frame = useRef<HTMLDivElement>(null);
  const visible = useInView(frame, 0.3);
  const connectorRoot = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const connectorMotion = useConnectorMotion(connectorRoot);
  const shown = useMemo(() => sortComments(comments, sort), [comments, sort]);
  const lit = useMemo(() => new Set(hover ? (commentTrail(shown, hover) ?? []) : []), [hover, shown]);

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
      const folds = new Set(current);
      if (folds.has(key)) folds.delete(key);
      else folds.add(key);
      return folds;
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
      const folds = new Set(current);
      folds.delete(parent);
      return folds;
    });
    setDraft("");
    setReplying(null);

    setTimeout(
      () => setComments((list) => updateComment(list, key, (sent) => ({ ...sent, sending: false }))),
      900,
    );
  };

  const thread = (list: Comment[], parent: string, depth = 0, parentAuthor?: string): ReactNode =>
    list.map((comment) => {
      const isFolded = folded.has(comment.key);
      const total = countComments(comment.replies);
      const isLit = lit.has(comment.key);
      const author = comment.badge === "Author";
      const deep = depth >= MAX_DEPTH;
      const mention = comment.mention ?? (depth >= 2 && parentAuthor ? handleOf(parentAuthor) : undefined);
      const replyTo = depth > 0 ? handleOf(comment.author) : undefined;
      return (
        <motion.article
          key={comment.key}
          layout="position"
          {...connectorMotion}
          className={`cx-comment${comment.typing ? " typing" : ""}`}
          data-depth={depth}
          data-lit={isLit || undefined}
          data-top={parent === "top" || undefined}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.32, bounce: 0.12 }}
          onPointerEnter={(event) => event.pointerType === "mouse" && setHover(comment.key)}
          onPointerLeave={() => setHover(parent === "top" ? null : parent)}
        >
          <Avatar
            name={comment.author}
            anchor={comment.key}
            link={parent === "top" ? undefined : parent}
            lit={isLit}
          />
          {comment.typing ? (
            <div className="cx-bubble cx-dots" role="status" aria-label={`${comment.author} is typing`}>
              <i />
              <i />
              <i />
            </div>
          ) : (
            <div className="cx-main">
              <div className={`cx-bubble${author ? " official" : ""}`}>
                <p className="cx-meta">
                  <strong>{comment.author}</strong>
                  {comment.badge && (
                    <span className={`cx-badge${author ? " official" : ""}`}>{comment.badge}</span>
                  )}
                  <span className="cx-age">{comment.sending ? "Sending…" : ago(comment.age)}</span>
                </p>
                <p className="cx-text">
                  {mention && <span className="cx-mention">{mention} </span>}
                  {comment.text}
                </p>
              </div>
              <div className="cx-under">
                <button
                  type="button"
                  className="cx-vote"
                  aria-pressed={comment.voted}
                  aria-label={`Like, ${comment.votes}`}
                  onClick={() =>
                    setComments((current) =>
                      updateComment(current, comment.key, (liked) => ({
                        ...liked,
                        voted: !liked.voted,
                        votes: liked.votes + (liked.voted ? -1 : 1),
                      })),
                    )
                  }
                >
                  <HugeiconsIcon icon={FavouriteIcon} aria-hidden="true" />
                  <span>{String(comment.votes)}</span>
                </button>
                <button
                  type="button"
                  className="cx-text-button"
                  onClick={() => {
                    setReplying(replying === comment.key ? null : comment.key);
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
                    onClick={() => toggleFold(comment.key)}
                  >
                    Hide replies
                  </button>
                )}
              </div>
              {replying === comment.key && (
                <ReplyComposer
                  inputRef={input}
                  author={comment.author}
                  replyTo={replyTo}
                  draft={draft}
                  onDraftChange={setDraft}
                  onCancel={() => setReplying(null)}
                  onSubmit={(event) => send(event, deep ? parent : comment.key, replyTo)}
                />
              )}

              {total > 0 && isFolded && (
                <FoldedReplies comment={comment} total={total} onOpen={() => toggleFold(comment.key)} />
              )}
            </div>
          )}
          {!isFolded && comment.replies.length > 0 && (
            <motion.div layout="position" {...connectorMotion} className="cx-replies">
              {thread(comment.replies, comment.key, depth + 1, comment.author)}
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
      {!isPreview && (
        <button
          type="button"
          className={`cx-live${live ? " on" : ""}`}
          aria-pressed={live}
          aria-label={live ? "Pause autoplay" : "Start autoplay"}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (!live) restart();
            setLive((current) => !current);
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
          <Post liked={liked} onLike={() => setLiked((current) => !current)} comments={total} />
        </motion.div>
        <motion.div layout="position" {...connectorMotion} className="cx-list-head">
          <span className="cx-count">{`${total} ${total === 1 ? "comment" : "comments"}`}</span>
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
