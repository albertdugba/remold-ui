type Palette = {
  top: string;
  sides: readonly [string, string, string];
  line: string;
  glow: string;
  text: string;
};

const tone = (top: string, sides: [string, string, string], glow: string, text = "#ffffff"): Palette => ({
  top,
  sides,
  line: "90, 80, 65",
  glow,
  text,
});

export const PAPER = tone("#fbf8f2", ["#cfc6b6", "#e3dccf", "#f3eee5"], "255, 170, 90", "#3a3128");
export const LEAF = tone("#86d19a", ["#2f7a45", "#4fa865", "#9fe0b0"], "80, 200, 120");
export const CLAY = tone("#e08d66", ["#8a3e22", "#c0643f", "#eda887"], "240, 140, 90");
export const BLOOM = tone("#ff8fb1", ["#a83a63", "#e0628c", "#ffb3cb"], "255, 120, 170");
export const SUN = tone("#ffd166", ["#a06a00", "#e0a21a", "#ffe08f"], "255, 200, 80", "#3a2a00");
export const ORANGE = tone("#ffb36b", ["#a3501a", "#e07a2e", "#ffc58f"], "255, 150, 70", "#3a1d05");
export const SKY = tone("#eef3fb", ["#8a9bb8", "#b9c6dc", "#dfe6f2"], "120, 160, 230", "#24324a");
export const MINT = tone("#5fd4a8", ["#16725a", "#2fae84", "#97ebcb"], "60, 210, 160");
export const STREET = tone("#e4ddd0", ["#b9b0a1", "#cdc5b7", "#ddd6c9"], "200, 190, 170", "#3a3128");

export const DAY_STAGE =
  "relative grid min-h-[520px] w-full overflow-hidden bg-[#f4efe6] bg-[radial-gradient(70%_55%_at_50%_45%,#fffaf1,transparent_75%)] font-sans text-[#2b2620] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(rgb(90_80_65/0.12)_1px,transparent_1.4px)] before:bg-size-[22px_22px] before:[mask-image:radial-gradient(70%_60%_at_50%_50%,#000,transparent)] before:content-['']";
export const DAY_SCENE = "relative block h-[460px] w-full";
export const DAY_CHIP =
  "absolute top-5 left-1/2 flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 rounded-[14px] bg-white/90 py-2 pr-3.5 pl-2 text-[13px] shadow-[0_0_0_1px_rgb(90_80_65/0.08),0_10px_26px_-12px_rgb(90_70_40/0.35)] backdrop-blur-[8px]";
export const DAY_CHIP_COPY =
  "grid min-w-0 [&_b]:truncate [&_b]:text-[13.5px] [&_b]:font-semibold [&_span]:text-[11.5px] [&_span]:text-[#8a7f70]";
export const DAY_FOOT = "absolute right-[18px] bottom-4 left-[18px] flex items-center justify-between gap-3";
export const DAY_READOUT =
  "text-[12.5px] whitespace-nowrap text-[#8a7f70] [&_b]:font-semibold [&_b]:text-[#2b2620] [&_b]:tabular-nums";
