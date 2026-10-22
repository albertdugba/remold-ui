import {
  createMorph,
  deceleration,
  lerpPoint,
  project,
  rubberband,
  springCoefficients,
  springs,
  stepSpring,
  value,
  velocityTracker,
  type AnimatedValue,
  type Morph,
  type SpringConfig,
} from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { setUpMatching } from "./matching";
import { setUpPage } from "./page";
import { setUpReactDemo } from "./react-demo";
import { setUpScenes } from "./scenes";

const $ = <T extends Element = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;

/**
 * Drive `v` on the shared frame loop, calling `render` every frame until it settles.
 * Returns a function to call after each `to` or `release`; it starts the loop if needed.
 */
function animate(v: AnimatedValue, render: (current: number) => void): () => void {
  let running = false;
  return () => {
    render(v.current);
    if (running) return;
    running = true;
    frames((dt) => {
      running = v.step(dt);
      render(v.current);
      return running;
    });
  };
}

// In-between

const start = { x: 40, y: 160 };
const end = { x: 360, y: 40 };
const dot = $("dot");
const slider = $<HTMLInputElement>("t");
const out = $("out");

function draw() {
  const t = Number(slider.value);
  const p = lerpPoint(start, end, t);
  dot.setAttribute("cx", String(p.x));
  dot.setAttribute("cy", String(p.y));
  out.textContent = t.toFixed(2);
}
slider.addEventListener("input", draw);
draw();

// Shape morph

function star(points: number, outer: number, inner: number): string {
  const corners = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${corners.join(" L")} Z`;
}

const shapes: Record<string, string> = {
  Square: "M50 50 H150 V150 H50 Z",
  Circle: "M100 40 A60 60 0 1 1 100 160 A60 60 0 1 1 100 40 Z",
  Star: star(5, 70, 30),
  Plus: "M85 40 H115 V85 H160 V115 H115 V160 H85 V115 H40 V85 H85 Z",
  Heart: "M100 160 C40 120 30 70 65 55 C85 47 100 65 100 75 C100 65 115 47 135 55 C170 70 160 120 100 160 Z",
  "Two dots": "M35 100 a25 25 0 1 1 50 0 a25 25 0 1 1 -50 0 Z M115 100 a25 25 0 1 1 50 0 a25 25 0 1 1 -50 0 Z",
};

const fromSelect = $<HTMLSelectElement>("from");
const toSelect = $<HTMLSelectElement>("to");
const showPoints = $<HTMLInputElement>("points");
const morphSlider = $<HTMLInputElement>("mt");
const morphOut = $("mout");
const shapePath = $("shape");
const anchors = $("anchors");
const stats = $("stats");

for (const name of Object.keys(shapes)) {
  fromSelect.add(new Option(name));
  toSelect.add(new Option(name));
}
fromSelect.value = "Square";
toSelect.value = "Star";

let morph: Morph;
// Morph progress: 0 is the first shape, 1 the second. A bouncy spring overshoots past 1 and back.
const progress = value(0, { spring: springs.bouncy, precision: 0.001 });

function renderMorph(t: number) {
  shapePath.setAttribute("d", morph.d(t));
  morphOut.textContent = t.toFixed(2);
  morphSlider.value = String(t);

  anchors.replaceChildren();
  if (!showPoints.checked) return;
  const buffer = morph.at(t);
  for (const { offset, segments } of morph.layout) {
    // Anchors are the start point, then every segment's end point (6 numbers apart).
    for (let s = 0; s <= segments; s++) {
      const o = s === 0 ? offset : offset + 2 + (s - 1) * 6 + 4;
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", String(buffer[o]));
      c.setAttribute("cy", String(buffer[o + 1]));
      c.setAttribute("r", "2.5");
      anchors.append(c);
    }
  }
}

const playMorph = animate(progress, renderMorph);

function rebuild() {
  morph = createMorph(shapes[fromSelect.value]!, shapes[toSelect.value]!);
  const segments = morph.layout.reduce((n, l) => n + l.segments, 0);
  stats.textContent = `${morph.layout.length} subpath(s), ${segments} segments, ${morph.from.length} numbers per frame.`;
  renderMorph(progress.current);
}

$("play").addEventListener("click", () => {
  const target = progress.target < 0.5 ? 1 : 0;
  // Reduced motion still shows what changed, just without the movement.
  if (prefersReducedMotion()) progress.set(target);
  else progress.to(target);
  playMorph();
});
fromSelect.addEventListener("change", rebuild);
toSelect.addEventListener("change", rebuild);
showPoints.addEventListener("change", () => renderMorph(progress.current));
morphSlider.addEventListener("input", () => {
  progress.set(Number(morphSlider.value));
  renderMorph(progress.current);
});
rebuild();

// Springs

const config: SpringConfig = { ...springs.bouncy };
const durationInput = $<HTMLInputElement>("duration");
const bounceInput = $<HTMLInputElement>("bounce");
const ball = $("ball");
const curve = $("curve");
const LEFT = 30;
const RIGHT = 370;
const ballX = value(LEFT, { precision: 0.1 });
const moveBall = animate(ballX, (x) => ball.setAttribute("cx", String(x)));

/** Plot the spring going from 0 to 1 over 1.5 seconds: 0 at y = 115, 1 at y = 55. */
function plotSpring() {
  const coefficients = springCoefficients(config);
  const state = { value: 0, velocity: 0 };
  const points: string[] = [];
  for (let i = 0; i <= 200; i++) {
    points.push(`${(i / 200) * 400},${115 - state.value * 60}`);
    stepSpring({ state, target: 1, spring: coefficients, dt: 1.5 / 200 });
  }
  curve.setAttribute("points", points.join(" "));
}

function syncInputs() {
  durationInput.value = String(config.duration);
  bounceInput.value = String(config.bounce);
  $("duration-out").textContent = `${config.duration.toFixed(2)} s`;
  $("bounce-out").textContent = config.bounce.toFixed(2);
  plotSpring();
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
  button.addEventListener("click", () => {
    Object.assign(config, springs[button.dataset.preset as keyof typeof springs]);
    syncInputs();
  });
}
durationInput.addEventListener("input", () => {
  config.duration = Number(durationInput.value);
  syncInputs();
});
bounceInput.addEventListener("input", () => {
  config.bounce = Number(bounceInput.value);
  syncInputs();
});
$("track").addEventListener("click", () => {
  const target = ballX.target === LEFT ? RIGHT : LEFT;
  if (prefersReducedMotion()) ballX.set(target);
  else ballX.to(target, { spring: config });
  moveBall();
});
syncInputs();

// Throw

const STOPS = [40, 200, 360];
const MIN = STOPS[0]!;
const MAX = STOPS[STOPS.length - 1]!;
const throwArea = $<SVGSVGElement>("throw");
const handle = $("handle");
const handleX = value(MIN, { spring: springs.snappy, precision: 0.1 });
const moveHandle = animate(handleX, (x) => handle.setAttribute("transform", `translate(${x} 0)`));
const tracker = velocityTracker();
let drag: { pointerX: number; handleX: number; scale: number } | null = null;

/** Where the handle sits for a finger position, resisting past the ends. */
function constrain(x: number): number {
  if (x < MIN) return MIN + rubberband(x - MIN, MAX - MIN);
  if (x > MAX) return MAX + rubberband(x - MAX, MAX - MIN);
  return x;
}

handle.addEventListener("pointerdown", (event) => {
  handle.setPointerCapture(event.pointerId);
  handleX.hold();
  tracker.reset();
  drag = {
    pointerX: event.clientX,
    handleX: handleX.current,
    // Screen pixels to SVG units.
    scale: 400 / throwArea.getBoundingClientRect().width,
  };
  tracker.add(event.timeStamp, drag.handleX);
});

handle.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const x = drag.handleX + (event.clientX - drag.pointerX) * drag.scale;
  tracker.add(event.timeStamp, x);
  handleX.set(constrain(x));
  moveHandle();
});

function endDrag(event: PointerEvent) {
  if (!drag) return;
  drag = null;
  const velocity = tracker.velocity(event.timeStamp);
  // Snap to the stop nearest to where the flick would have coasted.
  const landing = handleX.current + project(velocity, deceleration.fast);
  const target = STOPS.reduce((best, stop) => (Math.abs(stop - landing) < Math.abs(best - landing) ? stop : best));
  if (prefersReducedMotion()) {
    handleX.release({ target });
    handleX.set(target);
  } else {
    handleX.release({ velocity, target });
  }
  moveHandle();
}
handle.addEventListener("pointerup", endDrag);
handle.addEventListener("pointercancel", endDrag);
moveHandle();

// What became what

setUpMatching();

// Markup rewritten from scratch

setUpPage();

// Illustrations that are alive

setUpScenes();

// React

setUpReactDemo();
