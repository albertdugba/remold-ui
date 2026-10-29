"use client";

import { Remold } from "@remold-ui/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useState } from "react";
import { Frame } from "./frame";
import "./feedback-face.css";

const r1 = (n: number) => Math.round(n * 10) / 10;

const ellipse = (cx: number, cy: number, rx: number, ry = rx) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${
    -rx * 2
  } 0Z`;

const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${r1(cy + s * 0.95)}C${r1(cx - s * 1.35)} ${r1(cy + s * 0.05)} ${r1(
    cx - s * 0.95,
  )} ${r1(cy - s * 1.05)} ${cx} ${r1(cy - s * 0.4)}` +
  `C${r1(cx + s * 0.95)} ${r1(cy - s * 1.05)} ${r1(cx + s * 1.35)} ${r1(
    cy + s * 0.05,
  )} ${cx} ${r1(cy + s * 0.95)}Z`;

const arch = (cx: number, cy: number) =>
  `M${cx - 13} ${cy + 5}Q${cx} ${cy - 14} ${cx + 13} ${cy + 5}Q${cx} ${
    cy - 3
  } ${cx - 13} ${cy + 5}Z`;

const pair = (make: (cx: number, cy: number) => string) =>
  make(72, 96) + make(128, 96);

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

export function FeedbackFaceDemo({
  framed = true,
  index,
}: {
  framed?: boolean;
  index?: number;
}) {
  const [own, setOwn] = useState(4);
  const rating =
    index === undefined
      ? own
      : ((index % RATINGS.length) + RATINGS.length) % RATINGS.length;
  const r = RATINGS[rating]!;
  const body = (
    <div className="ff" data-rating={rating + 1}>
      <Remold.PathGroup
        className="ff-art"
        viewBox="0 0 200 200"
        role="img"
        aria-label={`A face that looks ${r.label
          .toLowerCase()
          .replace("!", "")}`}
        spring={{ duration: 0.55, bounce: 0.25 }}
        paths={[
          { id: "face", d: FACE, className: "ff-face" },
          { id: "extra", d: r.extra, className: "ff-extra" },
          {
            id: "brows",
            d: r.brows,
            className: "ff-brows",
            fill: "none",
            strokeWidth: 7,
            strokeLinecap: "round",
          },
          { id: "eyes", d: r.eyes, className: "ff-eyes" },
          { id: "mouth", d: r.mouth, className: "ff-mouth" },
        ]}
      />
      <div className="ff-copy">
        <p className="ff-question">How was your delivery?</p>
        <span className="ff-label">{r.label}</span>
      </div>
      <ToggleGroup
        className="ff-scale"
        aria-label="Rating"
        value={[String(rating)]}
        onValueChange={(values) => {
          const next = values[0];
          if (next) setOwn(Number(next));
        }}
      >
        {RATINGS.map((item, i) => (
          <Toggle
            key={item.label}
            value={String(i)}
            aria-label={item.label}
            disabled={index !== undefined}
          >
            {i + 1}
          </Toggle>
        ))}
      </ToggleGroup>
      <span className="ff-ask">{r.ask}</span>
    </div>
  );
  return framed ? <Frame>{body}</Frame> : body;
}
