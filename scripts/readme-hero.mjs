// Writes the README banner, light and dark: the wordmark with "remold" selected like a shape in a
// design tool, and the mark remolding between its two forms. The mark's frames come from Remold's
// own path morph and spring. Build the packages first, then run from the repo root:
// node scripts/readme-hero.mjs
//
// It also writes og.svg, the same picture held still at the size link previews use. The docs
// site's link-preview image is that file drawn by a browser, so the system font is the real one:
// chrome --headless --hide-scrollbars --window-size=1200,630 --screenshot=apps/docs/public/og-remold-ui.png .github/assets/og.svg
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMorph, value } from "../packages/core/dist/index.js";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.github/assets");

const BANNER = { width: 1280, height: 640, framed: true, animated: true };
const LINK_PREVIEW = { width: 1200, height: 630, framed: false, animated: false };

const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Inter, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";

const THEMES = {
  light: { page: "#fafafa", edge: "#e4e4e7", grid: "#efeff1", ink: "#09090b", muted: "#71717a", faint: "#a1a1aa", select: "#0d6efd", handle: "#ffffff" },
  dark: { page: "#0c0c0e", edge: "#232327", grid: "#17171a", ink: "#fafafa", muted: "#a1a1aa", faint: "#52525b", select: "#3b8bff", handle: "#0c0c0e" },
};

const BLOCK = "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H23.5A1.5 1.5 0 0 1 25 8.5V18H18V14H14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";
const ARC = "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";

const MARK_SPRING = { duration: 0.6, bounce: 0.25 };
const FRAMES_PER_SECOND = 24;
const LOOP_SECONDS = 8;
const TO_BLOCK_AT = 3.6;
const TO_ARC_AT = 6;

const FONT_SIZE = 160;
const TRACKING = -8;
const WORD_LENGTH = 452.4;
const SUFFIX_LENGTH = 143.7;
const BASELINE_DROP = 36;
const TAGLINE = [
  "Animated React components you copy into your app, built with Motion and Base UI.",
  "Remold adds the morphing: text, icons, shapes, particles and canvas scenes.",
];
const TAGLINE_FROM_BOTTOM = 126;
const TAGLINE_LEADING = 32;

const MARK_SIZE = 106;
const MARK_GAP = 46;
const SELECT_PAD = 16;
const SUFFIX_GAP = 30;
const HANDLE = 11;

const round = (number) => Math.round(number * 100) / 100;

function springSamples() {
  const progress = value(0, { spring: MARK_SPRING, precision: 0.001 });
  const samples = [0];

  progress.to(1);

  while (progress.step(1 / FRAMES_PER_SECOND)) samples.push(progress.current);

  return [...samples, 1];
}

function markKeyframes() {
  const morph = createMorph(ARC, BLOCK);
  const samples = springSamples();
  const travel = (startsAt, from, to) =>
    samples.map((progress, frame) => ({
      time: startsAt + frame / FRAMES_PER_SECOND,
      d: morph.d(from + (to - from) * progress),
    }));

  const frames = [{ time: 0, d: morph.d(0) }, ...travel(TO_BLOCK_AT, 0, 1), ...travel(TO_ARC_AT, 1, 0), { time: LOOP_SECONDS, d: morph.d(0) }];

  return {
    values: frames.map((frame) => frame.d).join(";"),
    keyTimes: frames.map((frame) => (frame.time / LOOP_SECONDS).toFixed(4)).join(";"),
    still: morph.d(0),
  };
}

function grid(theme, { width, height }) {
  const step = 40;
  const lines = [];

  for (let x = step; x < width; x += step) lines.push(`M${x} 0V${height}`);
  for (let y = step; y < height; y += step) lines.push(`M0 ${y}H${width}`);

  return `<path d="${lines.join("")}" stroke="${theme.grid}" stroke-width="1" fill="none"/>`;
}

function guides(box, theme, { width, height }) {
  const lines = `M0 ${round(box.top)}H${width}M0 ${round(box.bottom)}H${width}M${round(box.left)} 0V${height}M${round(box.right)} 0V${height}`;

  return `<path d="${lines}" stroke="${theme.select}" stroke-opacity="0.22" stroke-width="1" fill="none"/>`;
}

function handle(x, y, theme) {
  return `<rect x="${round(x - HANDLE / 2)}" y="${round(y - HANDLE / 2)}" width="${HANDLE}" height="${HANDLE}" fill="${theme.handle}" stroke="${theme.select}" stroke-width="1.5"/>`;
}

function build(theme, picture) {
  const { width, height, framed, animated } = picture;
  const baseline = Math.round(height / 2) + BASELINE_DROP;
  const mark = markKeyframes();
  const total = MARK_SIZE + MARK_GAP + WORD_LENGTH + TRACKING + SUFFIX_GAP + SUFFIX_LENGTH + TRACKING;
  const markX = (width - total) / 2;
  const wordX = markX + MARK_SIZE + MARK_GAP;
  const wordEnd = wordX + WORD_LENGTH + TRACKING;
  const suffixX = wordEnd + SUFFIX_GAP;

  const crisp = (position) => Math.round(position) + 0.5;
  const box = { left: crisp(wordX - SELECT_PAD), right: crisp(wordEnd + SELECT_PAD), top: crisp(baseline - 138), bottom: crisp(baseline + 26) };
  const boxWidth = box.right - box.left;
  const boxHeight = box.bottom - box.top;
  const labelWidth = 96;
  const labelX = (box.left + box.right) / 2 - labelWidth / 2;
  const markScale = MARK_SIZE / 18;
  const markTransform = `translate(${round(markX - 7 * markScale)} ${round(baseline - 25 * markScale)}) scale(${round(markScale)})`;

  const corner = framed ? 24 : 0;
  const movingMark = `<path class="moving" d="${mark.still}"><animate attributeName="d" dur="${LOOP_SECONDS}s" repeatCount="indefinite" values="${mark.values}" keyTimes="${mark.keyTimes}"/></path>
    <path class="still" d="${mark.still}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="remold/ui: animated React components you copy into your app, built with Motion and Base UI. Remold adds the morphing: text, icons, shapes, particles and canvas scenes. The word remold sits in a selection box with corner handles, and the logo beside it remolds between a square shoulder and an arc.">
  ${animated ? "<style>.still{display:none}@media (prefers-reduced-motion:reduce){.moving{display:none}.still{display:inline}}</style>" : ""}
  <clipPath id="frame"><rect width="${width}" height="${height}" rx="${corner}"/></clipPath>
  <g clip-path="url(#frame)">
    <rect width="${width}" height="${height}" fill="${theme.page}"/>
    ${grid(theme, picture)}
    ${guides(box, theme, picture)}
  </g>
  ${framed ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${corner - 0.5}" fill="none" stroke="${theme.edge}"/>` : ""}

  <g transform="${markTransform}" fill="${theme.ink}">
    ${animated ? movingMark : `<path d="${mark.still}"/>`}
  </g>

  <rect x="${round(box.left)}" y="${round(box.top)}" width="${round(boxWidth)}" height="${round(boxHeight)}" fill="${theme.select}" fill-opacity="0.07" stroke="${theme.select}" stroke-width="1.5"/>
  <g font-family="${SANS}" font-size="${FONT_SIZE}" letter-spacing="${TRACKING}">
    <text x="${round(wordX)}" y="${baseline}" font-weight="650" fill="${theme.ink}" textLength="${WORD_LENGTH}" lengthAdjust="spacing">remold</text>
    <text x="${round(suffixX)}" y="${baseline}" font-weight="500" fill="${theme.faint}" textLength="${SUFFIX_LENGTH}" lengthAdjust="spacing">/ui</text>
  </g>
  ${handle(box.left, box.top, theme)}
  ${handle(box.right, box.top, theme)}
  ${handle(box.left, box.bottom, theme)}
  ${handle(box.right, box.bottom, theme)}
  <rect x="${round(labelX)}" y="${round(box.bottom + 14)}" width="${labelWidth}" height="24" rx="5" fill="${theme.select}"/>
  <text x="${round((box.left + box.right) / 2)}" y="${round(box.bottom + 30.5)}" text-anchor="middle" font-family="${MONO}" font-size="12.5" font-weight="500" fill="#ffffff">${Math.round(boxWidth)} × ${Math.round(boxHeight)}</text>

  <text text-anchor="middle" font-family="${SANS}" font-size="22" letter-spacing="-0.2" fill="${theme.muted}">${TAGLINE.map((line, index) => `<tspan x="${width / 2}" y="${height - TAGLINE_FROM_BOTTOM + index * TAGLINE_LEADING}">${line}</tspan>`).join("")}</text>
</svg>
`;
}

await mkdir(OUT, { recursive: true });

for (const [name, theme] of Object.entries(THEMES)) {
  await writeFile(path.join(OUT, `hero-${name}.svg`), build(theme, BANNER));
}

await writeFile(path.join(OUT, "og.svg"), build(THEMES.light, LINK_PREVIEW));

console.log(`readme hero: wrote hero-light.svg, hero-dark.svg and og.svg to ${path.relative(process.cwd(), OUT)}`);
