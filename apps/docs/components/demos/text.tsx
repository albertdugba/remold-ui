"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";

const THEME =
  "[--tx-ink:#0a0a0b] [--tx-muted:#71717a] [--tx-surface:#ffffff] [--tx-well:#f4f4f5] dark:[--tx-ink:#fafafa] dark:[--tx-muted:#a1a1aa] dark:[--tx-surface:#18181b] dark:[--tx-well:#26262b]";

const BUTTON =
  "h-9 w-[104px] flex-none cursor-pointer rounded-full border-0 text-[13.5px] font-semibold outline-none transition-[background-color,color,scale] duration-150 ease-out focus-visible:shadow-[0_0_0_2px_var(--tx-surface),0_0_0_4px_var(--tx-ink)] active:scale-[0.97] motion-reduce:transition-none";

export function FollowDemo() {
  const [following, setFollowing] = useState(false);

  return (
    <div className={`not-prose grid w-full place-items-center font-sans antialiased ${THEME}`}>
      <section className="flex w-[340px] max-w-full items-center gap-3 rounded-[22px] bg-(--tx-surface) p-3.5 text-(--tx-ink)">
        <span className="grid size-11 flex-none place-items-center rounded-full bg-[#fef3c7] text-[14px] font-semibold text-[#713f12]" aria-hidden="true">
          EO
        </span>
        <span className="grid min-w-0 flex-1 gap-px">
          <span className="truncate text-[14.5px] font-semibold tracking-[-0.01em]">Efua Owusu</span>
          <span className="truncate text-[13px] text-(--tx-muted)">Product designer</span>
        </span>
        <button
          type="button"
          aria-pressed={following}
          onClick={() => setFollowing(!following)}
          className={`${BUTTON} ${following ? "bg-(--tx-well) text-(--tx-ink)" : "bg-(--tx-ink) text-(--tx-surface)"}`}
        >
          <Remold.Text>{following ? "Following" : "Follow"}</Remold.Text>
        </button>
      </section>
    </div>
  );
}
