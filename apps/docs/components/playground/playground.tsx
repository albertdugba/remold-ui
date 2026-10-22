"use client";
/**
 * The morph playground: paste two shapes (SVG or path data) or type two phrases, and watch one
 * become the other. Everything you set lives in the address bar, so a link reproduces it exactly.
 * Shapes can be exported as a short video.
 */
import { createMorph, drawPath, springs, value, type Morph, type SpringConfig } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ICONS } from "./icon-presets";
import { toPathData, viewBoxFor } from "./shapes";
import "./playground.css";

type Mode = "shapes" | "text";
type SpringName = keyof typeof springs;
type Look = "fill" | "outline";

interface Settings {
  mode: Mode;
  a: string;
  b: string;
  spring: SpringName;
  look: Look;
  pairing: "auto" | "order";
}

const PRESETS: { name: string; mode: Mode; a: string; b: string; look: Look }[] = [
  {
    name: "Circle → star",
    mode: "shapes",
    a: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38"/></svg>',
    b: '<svg viewBox="0 0 100 100"><polygon points="50,8 61,38 94,38 67,57 77,90 50,70 23,90 33,57 6,38 39,38"/></svg>',
    look: "fill",
  },
  { name: "Play → pause", mode: "shapes", a: ICONS.play, b: ICONS.pause, look: "outline" },
  { name: "Menu → close", mode: "shapes", a: ICONS.menu, b: ICONS.close, look: "outline" },
  { name: "Sun → moon", mode: "shapes", a: ICONS.sun, b: ICONS.moon, look: "outline" },
  {
    name: "Squares → bars",
    mode: "shapes",
    a: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="35" height="35"/><rect x="55" y="10" width="35" height="35"/><rect x="10" y="55" width="35" height="35"/><rect x="55" y="55" width="35" height="35"/></svg>',
    b: '<svg viewBox="0 0 100 100"><rect x="8" y="60" width="16" height="32"/><rect x="31" y="40" width="16" height="52"/><rect x="54" y="22" width="16" height="70"/><rect x="77" y="8" width="16" height="84"/></svg>',
    look: "fill",
  },
  { name: "Words", mode: "text", a: "Saving changes", b: "All changes saved", look: "fill" },
  { name: "Prices", mode: "text", a: "£1,299.00", b: "£949.50", look: "fill" },
];

const DEFAULTS: Settings = { mode: "shapes", a: PRESETS[0]!.a, b: PRESETS[0]!.b, spring: "bouncy", look: "fill", pairing: "auto" };

// Settings travel in the URL hash as base64url JSON, so links are self-contained.
function encode(s: Settings): string {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(hash: string): Settings | null {
  try {
    const raw = hash.replace(/^#s=/, "");
    if (!raw || raw === hash) return null;
    const binary = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as Partial<Settings>;
    return {
      mode: parsed.mode === "text" ? "text" : "shapes",
      a: String(parsed.a ?? ""),
      b: String(parsed.b ?? ""),
      spring: parsed.spring && parsed.spring in springs ? parsed.spring : "bouncy",
      look: parsed.look === "outline" ? "outline" : "fill",
      pairing: parsed.pairing === "order" ? "order" : "auto",
    };
  } catch {
    return null;
  }
}

function useShapes(s: Settings): { morph: Morph | null; viewBox: string; error: string } {
  // Pasted SVG is read with the browser's DOMParser, so shapes are only worked out once the page
  // has loaded in the browser; the server and the first render show an empty stage.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  // Typing stays responsive: the shapes are re-read and re-paired after the keystroke is shown.
  const from = useDeferredValue(s.a);
  const to = useDeferredValue(s.b);
  return useMemo(() => {
    if (s.mode !== "shapes" || !ready) return { morph: null, viewBox: "0 0 24 24", error: "" };
    try {
      const a = toPathData(from);
      const b = toPathData(to);
      return { morph: createMorph(a, b, { pairing: s.pairing }), viewBox: viewBoxFor(a, b), error: "" };
    } catch (e) {
      return { morph: null, viewBox: "0 0 24 24", error: e instanceof Error ? e.message : String(e) };
    }
  }, [ready, s.mode, from, to, s.pairing]);
}

/** Record the morph there and back as a video, drawing frames from a simulated spring. */
async function recordVideo(morph: Morph, viewBox: string, look: Look, spring: SpringConfig): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const [vx, vy, vw] = viewBox.split(" ").map(Number) as [number, number, number, number];
  const scale = size / vw;
  const type = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) throw new Error("This browser can't record video.");
  const recorder = new MediaRecorder(canvas.captureStream(60), { mimeType: type, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  const t = value(0, { spring, precision: 0.0005 });
  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.setTransform(scale, 0, 0, scale, -vx * scale, -vy * scale);
    ctx.beginPath();
    drawPath(morph.at(t.current), morph.layout, ctx);
    if (look === "fill") {
      ctx.fillStyle = "#111111";
      ctx.fill("evenodd");
    } else {
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = (vw / 24) * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  };

  recorder.start();
  // There, pause, back, pause: 4 seconds in real time so the recording runs at full speed.
  const script: [number, number][] = [
    [0.4, 0],
    [1.6, 1],
    [2.0, 1],
    [3.6, 0],
    [4.0, 0],
  ];
  const start = performance.now();
  let last = start;
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const step = script.find(([until]) => elapsed < until);
      if (!step) return resolve();
      if (t.target !== step[1]) t.to(step[1]);
      t.step(Math.min(0.05, (now - last) / 1000));
      last = now;
      draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await stopped;
  return new Blob(chunks, { type: type.split(";")[0] });
}

export function Playground() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [atB, setAtB] = useState(false);
  const [status, setStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const path = useRef<SVGPathElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const t = useMemo(() => value(0, { precision: 0.0005 }), []);
  const { morph, viewBox, error } = useShapes(s);
  const loaded = useRef(false);

  // Read a shared link once, then keep the address bar in step with the settings.
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      const shared = decode(window.location.hash);
      if (shared) {
        setS(shared);
        return;
      }
    }
    window.history.replaceState(null, "", `#s=${encode(s)}`);
  }, [s]);

  // Draw the shape and move the slider straight on the page: animating doesn't re-render React.
  const draw = useCallback(() => {
    if (morph) path.current?.setAttribute("d", morph.d(t.current));
    if (slider.current) slider.current.value = String(t.current);
  }, [morph, t]);
  useEffect(draw, [draw]);

  // Step the spring only while it moves; the loop stops once it settles.
  const stop = useRef<(() => void) | null>(null);
  const animate = useCallback(() => {
    if (stop.current) return;
    stop.current = frames((dt) => {
      const moving = t.step(dt);
      draw();
      if (!moving) stop.current = null;
      return moving;
    });
  }, [draw, t]);
  useEffect(() => () => stop.current?.(), []);

  const update = (patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch }));
  const play = () => {
    const next = !atB;
    setAtB(next);
    if (prefersReducedMotion()) {
      // Reduced motion: jump to the other shape instead of animating.
      t.set(next ? 1 : 0);
      draw();
      return;
    }
    t.to(next ? 1 : 0, { spring: springs[s.spring] });
    animate();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy the address bar to share this.");
    }
  };

  const exportVideo = async () => {
    if (!morph) return;
    setRecording(true);
    setStatus("Recording…");
    try {
      const blob = await recordVideo(morph, viewBox, s.look, springs[s.spring]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remold-morph.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus("Video saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Recording failed.");
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="pg">
      <div className="pg-presets" role="group" aria-label="Examples">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => {
              setAtB(false);
              t.set(0);
              update({ mode: p.mode, a: p.a, b: p.b, look: p.look });
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="pg-main">
        <section className="pg-inputs" aria-label="Inputs">
          <div className="pg-seg" role="group" aria-label="What to morph">
            <button type="button" aria-pressed={s.mode === "shapes"} onClick={() => update({ mode: "shapes" })}>
              Shapes
            </button>
            <button type="button" aria-pressed={s.mode === "text"} onClick={() => update({ mode: "text" })}>
              Text
            </button>
          </div>
          {s.mode === "shapes" ? (
            <>
              <label>
                From
                <textarea value={s.a} spellCheck={false} onChange={(e) => update({ a: e.target.value })} />
              </label>
              <label>
                To
                <textarea value={s.b} spellCheck={false} onChange={(e) => update({ b: e.target.value })} />
              </label>
              <p className="pg-hint">SVG markup (paths and basic shapes) or path data. Transforms are ignored.</p>
            </>
          ) : (
            <>
              <label>
                From
                <input value={s.a} onChange={(e) => update({ a: e.target.value })} />
              </label>
              <label>
                To
                <input value={s.b} onChange={(e) => update({ b: e.target.value })} />
              </label>
            </>
          )}
          <div className="pg-options">
            <label>
              Spring
              <select value={s.spring} onChange={(e) => update({ spring: e.target.value as SpringName })}>
                {Object.keys(springs).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            {s.mode === "shapes" && (
              <>
                <label>
                  Look
                  <select value={s.look} onChange={(e) => update({ look: e.target.value as Look })}>
                    <option value="fill">Fill</option>
                    <option value="outline">Outline</option>
                  </select>
                </label>
                <label>
                  Pairing
                  <select value={s.pairing} onChange={(e) => update({ pairing: e.target.value as Settings["pairing"] })}>
                    <option value="auto">Matched</option>
                    <option value="order">Drawing order</option>
                  </select>
                </label>
              </>
            )}
          </div>
        </section>

        <section className="pg-stage" aria-label="Result">
          {s.mode === "shapes" ? (
            error ? (
              <p className="pg-error" role="alert">
                {error}
              </p>
            ) : (
              <svg viewBox={viewBox} className={`pg-svg ${s.look}`} role="img" aria-label={atB ? "The second shape" : "The first shape"}>
                <path ref={path} fillRule="evenodd" strokeWidth={Number(viewBox.split(" ")[2]) / 12} />
              </svg>
            )
          ) : (
            <Remold.Text className="pg-text" spring={springs[s.spring]}>
              {atB ? s.b : s.a}
            </Remold.Text>
          )}

          <div className="pg-controls">
            <button type="button" className="pg-play" onClick={play} disabled={Boolean(error) && s.mode === "shapes"}>
              {atB ? "Morph back" : "Morph"}
            </button>
            {s.mode === "shapes" && (
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                defaultValue={0}
                ref={slider}
                aria-label="Scrub"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  t.set(v);
                  setAtB(v > 0.5);
                  draw();
                }}
              />
            )}
          </div>
          <div className="pg-share">
            <button type="button" onClick={copyLink}>
              Copy link
            </button>
            {s.mode === "shapes" && (
              <button type="button" onClick={exportVideo} disabled={!morph || recording}>
                {recording ? "Recording…" : "Export video"}
              </button>
            )}
            <span aria-live="polite">{status}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
