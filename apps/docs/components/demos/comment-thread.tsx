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

const PALETTE = [
  "[--cx-bg:#ffffff] [--cx-subtle:#f6f6f7] [--cx-border:#e7e7ea] [--cx-text:#18181b] [--cx-body:#27272a] [--cx-muted:#71717a] [--cx-faint:#a1a1aa]",
  "[--cx-line:#dcdce0] [--cx-ink:#18181b] [--cx-mention:#2563eb] [--cx-pressed:#ffffff] [--cx-official:#18181b] [--cx-on-official:#ffffff] [--cx-scrollbar:#d4d4d8]",
  "dark:[--cx-bg:#18181b] dark:[--cx-subtle:#27272a] dark:[--cx-border:#3f3f46] dark:[--cx-text:#fafafa] dark:[--cx-body:#fafafa] dark:[--cx-muted:#d4d4d8] dark:[--cx-faint:#a1a1aa]",
  "dark:[--cx-line:#71717a] dark:[--cx-ink:#fafafa] dark:[--cx-mention:#60a5fa] dark:[--cx-pressed:#3f3f46] dark:[--cx-official:#a78bfa] dark:[--cx-on-official:#1e1b4b] dark:[--cx-scrollbar:#71717a]",
].join(" ");

const BUTTON = "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cx-ink)";
const POST_ACTION = "inline-flex items-center gap-1.5 py-1 text-[13px] tabular-nums [&_svg]:size-[17px]";
const TEXT_BUTTON = `${BUTTON} ml-1.5 text-[12.5px] text-(--cx-muted) hover:text-(--cx-text)`;
const TOP_COMMENT =
  "[[data-top]+&]:border-t [[data-top]+&]:border-solid [[data-top]+&]:border-(--cx-border) [[data-top]+&]:pt-[18px]";
const COMMENT_GRID = [
  "grid-cols-[36px_minmax(0,1fr)] gap-x-3 @max-[480px]:grid-cols-[30px_minmax(0,1fr)] @max-[480px]:gap-x-[9px]",
  "grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 @max-[480px]:grid-cols-[30px_minmax(0,1fr)] @max-[480px]:gap-x-[9px]",
  "grid-cols-[28px_minmax(0,1fr)] gap-x-[9px] @max-[480px]:gap-x-2",
];
const AVATAR_SIZE = ["size-9 @max-[480px]:size-[30px]", "size-8 @max-[480px]:size-[30px]", "size-7"];

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
  className = "size-9",
  size = 36,
}: {
  name: string;
  anchor?: string;
  link?: string;
  lit?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <img
      className={`block rounded-full bg-(--cx-subtle) shadow-[0_0_0_1px_var(--cx-border)] transition-shadow duration-200 ${className}`}
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
    <article className="grid gap-3" aria-label={`Post by ${AUTHOR.name}`}>
      <header className="flex items-center gap-2.5">
        <Avatar name={AUTHOR.name} size={40} className="size-10" />
        <span className="grid leading-[1.3]">
          <strong className="text-[14px] font-semibold">{AUTHOR.name}</strong>
          <span className="text-[12.5px] text-(--cx-muted)">{`${AUTHOR.handle} · 4h`}</span>
        </span>
      </header>
      <p className="m-0 text-[15px] leading-normal text-pretty">
        I shipped my first open-source library last week. Ten weeks of evenings, one launch post and a lot of
        lessons. Here’s what I’d do again, and what I wouldn’t.
      </p>
      <div className="flex items-center gap-[18px] text-(--cx-muted)">
        <button
          type="button"
          className={`${POST_ACTION} ${BUTTON} aria-pressed:text-[#e11d48] aria-pressed:[&_svg]:fill-current`}
          aria-pressed={liked}
          aria-label={`Like, ${POST_LIKES + (liked ? 1 : 0)}`}
          onClick={onLike}
        >
          <HugeiconsIcon icon={FavouriteIcon} aria-hidden="true" />
          <span>{POST_LIKES + (liked ? 1 : 0)}</span>
        </button>
        <span className={POST_ACTION} aria-label={`${comments} comments`}>
          <HugeiconsIcon icon={MessageCircleIcon} aria-hidden="true" />
          <span>{comments}</span>
        </span>
        <span className={POST_ACTION} aria-label={`${REPOSTS} reposts`}>
          <HugeiconsIcon icon={RepeatOne02Icon} aria-hidden="true" />
          <span>{REPOSTS}</span>
        </span>
        <button type="button" className={`${POST_ACTION} ${BUTTON} ml-auto`} aria-label="Save">
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
    <form className="mt-2.5 grid max-w-[560px] grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 @max-[480px]:max-w-none" onSubmit={onSubmit}>
      <img className="mt-1.5 size-7 rounded-full bg-(--cx-subtle)" src={avatar("You")} alt="" width={28} height={28} />

      <div className="grid rounded-[14px] border border-solid border-(--cx-border) bg-(--cx-bg) transition-[border-color,box-shadow] duration-160 ease-out focus-within:border-[color-mix(in_oklab,var(--cx-ink)_45%,var(--cx-border))] focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--cx-ink)_6%,transparent)]">
        {replyTo && (
          <span className="mx-3 mt-2.5 -mb-1 justify-self-start rounded-full bg-[color-mix(in_oklab,var(--cx-mention)_12%,transparent)] px-2 py-0.5 text-[12.5px] font-semibold text-(--cx-mention)">
            {replyTo}
          </span>
        )}

        <textarea
          className="max-h-[140px] min-h-11 resize-none border-0 bg-transparent px-3.5 pt-[11px] pb-1 text-[14px] leading-normal text-(--cx-text) [field-sizing:content] placeholder:text-(--cx-faint) focus-visible:outline-none"
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={replyTo ? "Add a reply…" : `Reply to ${author.split(" ")[0]}…`}
          aria-label={`Reply to ${author}`}
        />

        <div className="flex items-center justify-between gap-2.5 pt-1 pr-1.5 pb-1.5 pl-3.5">
          <span
            className="text-[11.5px] text-(--cx-faint) @max-[480px]:hidden [&_kbd]:rounded-[5px] [&_kbd]:border [&_kbd]:border-solid [&_kbd]:border-(--cx-border) [&_kbd]:bg-(--cx-subtle) [&_kbd]:px-[5px] [&_kbd]:py-px [&_kbd]:font-[inherit] [&_kbd]:text-[10.5px] [&_kbd]:text-(--cx-muted)"
            aria-hidden="true"
          >
            <kbd>Enter</kbd> to send · <kbd>Esc</kbd> to cancel
          </span>
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              className={`${BUTTON} h-[30px] rounded-full px-2.5 text-[12.5px] font-medium text-(--cx-muted) hover:bg-(--cx-subtle) hover:text-(--cx-text)`}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${BUTTON} grid size-[30px] place-items-center rounded-full bg-(--cx-ink) text-(--cx-bg) transition-[opacity,scale] duration-150 ease-out not-disabled:active:scale-[0.94] disabled:cursor-default disabled:opacity-25 [&_svg]:size-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round] [&_svg]:[stroke-width:2.2]`}
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
      className={`${BUTTON} mt-2 inline-flex items-center gap-2 rounded-full border border-solid border-(--cx-border) py-[3px] pr-2.5 pl-1 text-[12.5px] text-(--cx-muted) hover:bg-(--cx-subtle)`}
      aria-expanded={false}
      data-rm-anchor={`folded-${comment.key}`}
      data-rm-link={comment.key}
      onClick={onOpen}
    >
      <span
        className="inline-flex [&_img]:-mr-[5px] [&_img]:size-[18px] [&_img]:rounded-full [&_img]:border-[1.5px] [&_img]:border-solid [&_img]:border-(--cx-bg) [&_img]:bg-(--cx-subtle) [&_img:last-child]:mr-0"
        aria-hidden="true"
      >
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
          className={`grid items-start ${COMMENT_GRID[Math.min(depth, 2)]} ${parent === "top" ? TOP_COMMENT : ""}`}
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
            className={AVATAR_SIZE[Math.min(depth, 2)]}
            anchor={comment.key}
            link={parent === "top" ? undefined : parent}
            lit={isLit}
          />
          {comment.typing ? (
            <div
              className="inline-flex max-w-full gap-0.5 self-center justify-self-start py-3 [&_i]:size-1.5 [&_i]:animate-typing-dot [&_i]:rounded-full [&_i]:bg-(--cx-faint) motion-reduce:[&_i]:animate-none [&_i:nth-child(2)]:[animation-delay:0.15s] [&_i:nth-child(3)]:[animation-delay:0.3s]"
              role="status"
              aria-label={`${comment.author} is typing`}
            >
              <i />
              <i />
              <i />
            </div>
          ) : (
            <div className="min-w-0">
              <div className="grid max-w-full gap-0.5 justify-self-start">
                <p className="m-0 flex min-h-5 items-center gap-2 text-[13px]">
                  <strong className="font-semibold">{comment.author}</strong>
                  {comment.badge && (
                    <span
                      data-official={author || undefined}
                      className="rounded-[4px] bg-(--cx-subtle) px-1.5 py-px text-[11px] font-medium text-(--cx-muted) data-official:bg-(--cx-official) data-official:text-(--cx-on-official)"
                    >
                      {comment.badge}
                    </span>
                  )}
                  <span className="text-[12px] text-(--cx-faint)">{comment.sending ? "Sending…" : ago(comment.age)}</span>
                </p>
                <p
                  className={`m-0 leading-[1.6] text-(--cx-body) ${parent === "top" ? "text-[15px] font-medium tracking-[-0.005em]" : "text-[14.5px]"}`}
                >
                  {mention && <span className="font-[550] text-(--cx-mention)">{mention} </span>}
                  {comment.text}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-[5px]">
                <button
                  type="button"
                  className={`${BUTTON} inline-flex h-6 items-center gap-[5px] rounded-full border border-solid border-(--cx-border) px-[9px] text-[12px] text-(--cx-muted) tabular-nums hover:bg-(--cx-subtle) aria-pressed:border-(--cx-ink) aria-pressed:text-(--cx-text) aria-pressed:[&_svg]:fill-current [&_svg]:size-[13px]`}
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
                  className={TEXT_BUTTON}
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
                    className={TEXT_BUTTON}
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
            <motion.div
              layout="position"
              {...connectorMotion}
              className={`col-start-2 grid ml-2.5 @max-[480px]:ml-1 @max-[480px]:gap-3 ${depth === 0 ? "mt-3 gap-3.5" : "mt-2.5 gap-3"}`}
            >
              {thread(comment.replies, comment.key, depth + 1, comment.author)}
            </motion.div>
          )}
        </motion.article>
      );
    });

  const total = countComments(comments);
  return (
    <div
      data-variant={isPreview ? "preview" : undefined}
      className={`cx group not-prose @container relative my-6 w-full overflow-hidden rounded-[14px] border border-solid border-(--cx-border) bg-(--cx-bg) font-sans text-(--cx-text) shadow-[0_1px_2px_rgb(0_0_0/0.04)] @max-[480px]:m-0 @max-[480px]:rounded-xl dark:shadow-[0_12px_30px_rgb(0_0_0/0.28)] ${PALETTE}`}
      ref={frame}
      onPointerDown={takeOver}
      onKeyDown={takeOver}
    >
      {!isPreview && (
        <button
          type="button"
          data-on={live || undefined}
          className={`${BUTTON} absolute top-3.5 right-3.5 z-2 grid size-9 place-items-center rounded-full border border-solid border-(--cx-border) bg-white text-(--cx-muted) shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,color,box-shadow] duration-200 ease-out data-on:border-[color-mix(in_oklab,var(--cx-ink)_25%,var(--cx-border))] data-on:text-(--cx-text) data-on:shadow-[0_2px_6px_rgb(0_0_0/0.07)] [&_svg]:size-[15px]`}
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
        className="cx-stage h-160 overflow-y-auto overscroll-contain bg-(--cx-bg) px-5 pt-5 pb-7 [scrollbar-color:var(--cx-scrollbar)_transparent] [scrollbar-width:thin] group-data-[variant=preview]:h-auto group-data-[variant=preview]:max-h-[600px] group-data-[variant=preview]:overflow-clip group-data-[variant=preview]:[mask-image:linear-gradient(to_bottom,#000_calc(100%-72px),transparent)] @max-[480px]:h-[min(480px,60svh)] @max-[480px]:px-3 @max-[480px]:pt-4 @max-[480px]:pb-[22px] [&_.rm-connector]:stroke-(--cx-line) [&_.rm-connector]:[stroke-width:1.5] [&_.rm-connector]:transition-[stroke] [&_.rm-connector]:duration-200 [&_.rm-connector[data-line=lit]]:stroke-(--cx-ink)"
        radius={16}
        gap={4}
        onPointerLeave={() => setHover(null)}
      >
        <motion.div layout="position" {...connectorMotion} className="transition-opacity duration-200">
          <Post liked={liked} onLike={() => setLiked((current) => !current)} comments={total} />
        </motion.div>
        <motion.div
          layout="position"
          {...connectorMotion}
          className="mt-5 flex items-center justify-between gap-3.5 border-y border-solid border-(--cx-border) py-3.5 @max-[480px]:flex-col @max-[480px]:items-start @max-[480px]:gap-2.5"
        >
          <span className="text-[13px] text-(--cx-muted) tabular-nums">{`${total} ${total === 1 ? "comment" : "comments"}`}</span>
          <div
            className="inline-flex gap-0.5 rounded-[10px] bg-(--cx-subtle) p-[3px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.045)]"
            role="group"
            aria-label="Sort"
          >
            {SORTS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${BUTTON} min-h-7 rounded-[7px] px-2.5 py-[3px] text-[12px] font-medium text-(--cx-muted) transition-[color,background-color,box-shadow] duration-200 ease-out hover:text-(--cx-text) aria-pressed:bg-(--cx-pressed) aria-pressed:text-(--cx-text) aria-pressed:shadow-[0_1px_2.5px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.05)]`}
                aria-pressed={sort === option}
                onClick={() => setSort(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </motion.div>
        <motion.div layout="position" {...connectorMotion} className="mt-[18px] grid gap-3.5 @max-[480px]:gap-3">
          {thread(shown, "top")}
        </motion.div>
      </Remold.Connectors>
    </div>
  );
}
