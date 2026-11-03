"use client";
import { Remold, useAutoplay } from "@remold-ui/react";
import "./remold-person.css";

const FORMS = ["Card", "List", "Profile"] as const;
const SPRING = { duration: 0.65, bounce: 0.18 };
const PLAY = "M8 5.5v13l11-6.5z";
const PAUSE = "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z";

/** Illustrated avatars (DiceBear): drawn, so no real person's face. */
const face = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    name,
  )}&backgroundColor=ede9fe`;

const ME = {
  name: "Akosua Boateng",
  role: "Product designer",
  team: "Northwind",
};
const STATS = [
  ["48", "Projects"],
  ["2.4k", "Followers"],
  ["312", "Following"],
] as const;
const OTHERS = [
  { name: "Kwame Owusu", role: "Engineer" },
  { name: "Efua Addo", role: "Researcher" },
];

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={face(name)}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-violet-100 ring-1 ring-black/5 dark:ring-white/10"
      style={{ width: size, height: size }}
    />
  );
}

const follow =
  "inline-flex items-center justify-center rounded-full bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900";

function Form({ form }: { form: (typeof FORMS)[number] }) {
  if (form === "Card")
    return (
      <div className="grid w-full max-w-[280px] justify-items-center gap-3 rounded-[26px] bg-white p-6 text-center ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <Avatar name={ME.name} size={76} />
        <div className="grid gap-0.5">
          <span className="text-[17px] font-semibold">{ME.name}</span>
          <span className="text-[13px] text-zinc-500 dark:text-zinc-400">
            {ME.role} · {ME.team}
          </span>
        </div>
        <dl className="grid w-full grid-cols-3 gap-1 rounded-2xl bg-zinc-50 py-2.5 dark:bg-zinc-800/60">
          {STATS.map(([n, label]) => (
            <div key={label} className="grid">
              <dt className="order-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {label}
              </dt>
              <dd className="m-0 text-[15px] font-semibold tabular-nums">
                {n}
              </dd>
            </div>
          ))}
        </dl>
        <span className={`${follow} h-9 w-full text-[13px]`}>Follow</span>
      </div>
    );

  if (form === "List")
    return (
      <ul className="m-0 grid w-full max-w-[360px] list-none gap-1 rounded-[22px] bg-white p-2 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        {[OTHERS[0]!, ME, OTHERS[1]!].map((p) => {
          const me = p.name === ME.name;
          return (
            <li
              key={p.name}
              className={`flex items-center gap-3 rounded-2xl px-2.5 py-2 ${
                me ? "bg-violet-50 dark:bg-violet-500/10" : ""
              }`}
            >
              <Avatar name={p.name} size={38} />
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-[14px] font-semibold">
                  {p.name}
                </span>
                <span className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                  {p.role}
                </span>
              </span>
              {me ? (
                <span className={`${follow} h-8 px-3.5 text-[12.5px]`}>
                  Follow
                </span>
              ) : (
                <span className="text-[12.5px] text-zinc-400">Following</span>
              )}
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="w-full max-w-[480px] overflow-hidden rounded-[26px] bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="h-24 bg-violet-100 dark:bg-violet-500/15" />
      <div className="grid gap-4 px-6 pb-6">
        <div className="-mt-10 flex items-end justify-between gap-3">
          <span className="rounded-full bg-white p-1 dark:bg-zinc-900">
            <Avatar name={ME.name} size={84} />
          </span>
          <span className="flex gap-2">
            <span className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium ring-1 ring-zinc-200 max-[480px]:hidden dark:ring-zinc-700">
              Message
            </span>
            <span className={`${follow} h-9 px-4 text-[13px]`}>Follow</span>
          </span>
        </div>
        <div className="grid gap-0.5">
          <span className="text-[22px] font-semibold tracking-tight">
            {ME.name}
          </span>
          <span className="text-[14px] text-zinc-500 dark:text-zinc-400">
            {ME.role} · {ME.team}
          </span>
        </div>
        <dl className="m-0 flex flex-wrap gap-x-6 gap-y-1">
          {STATS.map(([n, label]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dd className="m-0 text-[15px] font-semibold tabular-nums">
                {n}
              </dd>
              <dt className="text-[13px] text-zinc-500 dark:text-zinc-400">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function RemoldPerson() {
  const autoplay = useAutoplay(FORMS.length, { every: 2600 });
  const form = FORMS[autoplay.step]!;

  return (
    <div ref={autoplay.ref} className="hr">
      <div className="hr-bar">
        <div role="tablist" aria-label="Component" className="hr-tabs">
          {FORMS.map((f, i) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={i === autoplay.step}
              onClick={() => autoplay.setStep(i)}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="hr-tools">
          <button
            type="button"
            {...autoplay.toggleProps}
            className="hr-play"
            aria-label={autoplay.playing ? "Pause" : "Play"}
          >
            <Remold.Icon
              d={autoplay.playing ? PAUSE : PLAY}
              viewBox="0 0 24 24"
              fill="currentColor"
            />
          </button>
        </span>
      </div>

      <div className="hr-stage">
        <Remold.Layout trigger={[form]} spring={SPRING} className="hr-root">
          <Form form={form} />
        </Remold.Layout>
      </div>

    </div>
  );
}
