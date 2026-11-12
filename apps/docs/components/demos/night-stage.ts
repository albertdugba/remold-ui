export const NIGHT = {
  top: "#17161d",
  sides: ["#0f0d18", "#241a4a", "#6a4cff"],
  line: "150, 148, 170",
  glow: "124, 92, 255",
  text: "#d9d6ea",
} as const;

export const PLATFORM_INK = "rgba(124, 92, 255, 0.55)";
export const WIRE_INK = "rgba(170, 166, 195, 0.7)";
export const VIOLET = "#7c5cff";

export const NIGHT_STAGE =
  "relative grid min-h-[520px] w-full overflow-hidden bg-[#101015] bg-[radial-gradient(60%_50%_at_50%_55%,rgb(124_92_255/0.14),transparent_70%)] font-sans text-[#ecebf5] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] before:bg-size-[32px_32px] before:[mask-image:radial-gradient(70%_60%_at_50%_50%,#000,transparent)] before:content-['']";
export const NIGHT_SCENE = "relative block h-[460px] w-full";
export const NIGHT_CHIP =
  "absolute top-[22px] left-1/2 flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 rounded-xl bg-[rgb(26_24_36/0.86)] px-3 py-2 text-[13px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_12px_30px_-12px_rgb(0_0_0/0.6)] backdrop-blur-[10px]";
export const NIGHT_FOOT = "absolute right-[18px] bottom-4 left-[18px] flex items-center justify-between gap-3";
export const NIGHT_READOUT =
  "font-[ui-monospace,'SF_Mono',Menlo,monospace] text-[12px] whitespace-nowrap text-[#8f8ca3] [&_b]:font-semibold [&_b]:text-[#ecebf5]";
export const NIGHT_CTA =
  "h-8 cursor-pointer rounded-[9px] border-0 bg-[rgb(124_92_255/0.16)] px-3.5 text-[13px] font-semibold whitespace-nowrap text-[#e6e0ff] shadow-[inset_0_0_0_1px_rgb(124_92_255/0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a48bff] disabled:cursor-default disabled:opacity-40";
