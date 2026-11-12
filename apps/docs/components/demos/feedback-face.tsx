"use client";

import { Remold } from "@remold-ui/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useState, type CSSProperties } from "react";
import { Frame } from "./frame";

const r1 = (n: number) => Math.round(n * 10) / 10;

const ellipse = (cx: number, cy: number, rx: number, ry = rx) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;

const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${r1(cy + s * 0.95)}C${r1(cx - s * 1.35)} ${r1(cy + s * 0.05)} ${r1(
    cx - s * 0.95,
  )} ${r1(cy - s * 1.05)} ${cx} ${r1(cy - s * 0.4)}` +
  `C${r1(cx + s * 0.95)} ${r1(cy - s * 1.05)} ${r1(cx + s * 1.35)} ${r1(
    cy + s * 0.05,
  )} ${cx} ${r1(cy + s * 0.95)}Z`;

const arch = (cx: number, cy: number) =>
  `M${cx - 13} ${cy + 5}Q${cx} ${cy - 14} ${cx + 13} ${cy + 5}Q${cx} ${cy - 3} ${cx - 13} ${cy + 5}Z`;

const pair = (make: (cx: number, cy: number) => string) => make(72, 96) + make(128, 96);

const FACE = ellipse(100, 104, 80);

const RATINGS = [
  {
    label: "Terrible",
    ask: "Sorry about that. What went wrong?",
    brows: "M54 68 84 80M146 68 116 80",
    eyes: pair((x, y) => ellipse(x, y + 2, 9, 7)),
    mouth: "M62 152Q100 114 138 152Q100 132 62 152Z",
    extra: ellipse(100, 30, 1),
  },
  {
    label: "Not great",
    ask: "What could we have done better?",
    brows: "M58 78 84 68M142 78 116 68",
    eyes: pair((x, y) => ellipse(x, y, 8, 9)),
    mouth: "M76 148Q100 130 124 148Q100 139 76 148Z",
    extra: "M64 106C58 116 57 122 64 124C71 122 70 116 64 106Z",
  },
  {
    label: "Okay",
    ask: "Thanks. Anything we could improve?",
    brows: "M58 72 86 72M114 72 142 72",
    eyes: pair((x, y) => ellipse(x, y, 9)),
    mouth: "M74 138h52a5 5 0 0 1 0 10h-52a5 5 0 0 1 0-10Z",
    extra: ellipse(100, 30, 1),
  },
  {
    label: "Good",
    ask: "Glad to hear it. What went well?",
    brows: "M58 70Q72 62 86 70M114 70Q128 62 142 70",
    eyes: pair(arch),
    mouth: "M64 128Q100 162 136 128Q100 148 64 128Z",
    extra: ellipse(52, 124, 11, 6) + ellipse(148, 124, 11, 6),
  },
  {
    label: "Love it!",
    ask: "Made our day. What did you love?",
    brows: "M58 62Q72 52 86 62M114 62Q128 52 142 62",
    eyes: pair((x, y) => heart(x, y, 14)),
    mouth: "M60 122H140Q140 172 100 172Q60 172 60 122Z",
    extra: ellipse(50, 128, 12, 7) + ellipse(150, 128, 12, 7),
  },
] as const;

const FACE_COLOR = ["#ff7a5c", "#ffae4f", "#ffcf4a", "#ffd23f", "#ffc93d"];
const EXTRA_COLOR = ["transparent", "#60a5fa", "transparent", "#ff8a8a", "#ff7096"];

export function FeedbackFaceDemo({ framed = true, index }: { framed?: boolean; index?: number }) {
  const [chosenRating, setChosenRating] = useState(4);
  const rating =
    index === undefined ? chosenRating : ((index % RATINGS.length) + RATINGS.length) % RATINGS.length;
  const shown = RATINGS[rating]!;
  const body = (
    <div
      data-rating={rating + 1}
      className="group grid justify-items-center gap-3.5 py-2 text-center font-sans [--ff-ink:#2a1a0c]"
      style={{ "--ff-face": FACE_COLOR[rating], "--ff-extra": EXTRA_COLOR[rating] } as CSSProperties}
    >
      <Remold.PathGroup
        className="size-[168px] [&>svg]:[transition:fill_0.45s_ease,stroke_0.45s_ease]"
        viewBox="0 0 200 200"
        role="img"
        aria-label={`A face that looks ${shown.label.toLowerCase().replace("!", "")}`}
        spring={{ duration: 0.55, bounce: 0.25 }}
        paths={[
          { id: "face", path: FACE, className: "fill-(--ff-face)" },
          { id: "extra", path: shown.extra, className: "fill-(--ff-extra)" },
          {
            id: "brows",
            path: shown.brows,
            className: "stroke-(--ff-ink)",
            fill: "none",
            strokeWidth: 7,
            strokeLinecap: "round",
          },
          { id: "eyes", path: shown.eyes, className: "fill-(--ff-ink) group-data-[rating=5]:fill-[#f43f5e]" },
          { id: "mouth", path: shown.mouth, className: "fill-(--ff-ink) group-data-[rating=5]:fill-[#7a1f2b]" },
        ]}
      />
      <div className="grid gap-0.5">
        <p className="m-0 text-[14px] text-fd-muted-foreground">How was your delivery?</p>
        <span className="text-[26px] font-bold tracking-[-0.02em] text-fd-foreground">{shown.label}</span>
      </div>
      <ToggleGroup
        className="flex gap-1.5 rounded-full bg-fd-muted p-1"
        aria-label="Rating"
        value={[String(rating)]}
        onValueChange={(values) => {
          const picked = values[0];
          if (picked) setChosenRating(Number(picked));
        }}
      >
        {RATINGS.map((item, position) => (
          <Toggle
            key={item.label}
            value={String(position)}
            aria-label={item.label}
            disabled={index !== undefined}
            className="size-10 cursor-pointer rounded-full border-0 bg-transparent text-[14px] font-semibold text-fd-muted-foreground transition-colors duration-200 hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring data-pressed:bg-fd-background data-pressed:text-fd-foreground data-pressed:shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
          >
            {position + 1}
          </Toggle>
        ))}
      </ToggleGroup>
      <span className="text-[14px] text-fd-muted-foreground">{shown.ask}</span>
    </div>
  );
  return framed ? <Frame>{body}</Frame> : body;
}
