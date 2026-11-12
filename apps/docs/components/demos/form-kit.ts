export const FORM_KIT = [
  "[--fk-surface:#ffffff] [--fk-well:#f4f4f5] [--fk-well-strong:#e8e8eb] [--fk-ink:#0a0a0b] [--fk-muted:#71717a]",
  "[--fk-faint:#b4b4bd] [--fk-line:rgb(10_10_11/0.1)] [--fk-focus:#0a0a0b] [--fk-good:#16a34a] [--fk-warn:#d97706] [--fk-bad:#e5484d]",
  "dark:[--fk-surface:#18181b] dark:[--fk-well:#26262b] dark:[--fk-well-strong:#313137] dark:[--fk-ink:#fafafa] dark:[--fk-muted:#a1a1aa]",
  "dark:[--fk-faint:#5b5b64] dark:[--fk-line:rgb(255_255_255/0.1)] dark:[--fk-focus:#fafafa] dark:[--fk-good:#34d399] dark:[--fk-warn:#fbbf24] dark:[--fk-bad:#ff6369]",
  "text-start font-sans text-[14px] leading-[1.4] text-(--fk-ink) tabular-nums antialiased",
  "[&_:where(button,[tabindex]):focus-visible]:outline-2 [&_:where(button,[tabindex]):focus-visible]:outline-offset-2 [&_:where(button,[tabindex]):focus-visible]:outline-(--fk-focus)",
].join(" ");

export const FK_BOX = "grid w-[min(100%,var(--fk-width,340px))] gap-2";

export const FK_STAGE = "not-prose grid w-full place-items-center";

export const FK_LABEL = "text-[13px] font-semibold text-(--fk-ink)";

export const FK_DESCRIPTION = "m-0 text-[12.5px] text-(--fk-muted)";

export const FK_ERROR = "m-0 text-[12.5px] font-[550] text-(--fk-bad)";

export const FK_INPUT =
  "h-[42px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-(--fk-ink) outline-none placeholder:text-(--fk-faint)";
