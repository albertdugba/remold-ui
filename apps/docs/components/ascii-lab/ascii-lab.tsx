"use client";
/**
 * The ASCII lab, on `@remold-ui/ascii`: lit 3D subjects, photos, videos and the camera, drawn live
 * in characters. The Remold mark remolds into a word as you scroll, a torus knot turns on its own,
 * and STL models, images and videos can be dropped in.
 */
import {
  type AsciiFrame,
  type AsciiRenderer,
  type AsciiStyle,
  createAsciiRenderer,
  type DistanceField,
  type Mesh,
  parseStl,
  pathField,
  STYLES,
  textField,
  torusKnot,
} from "@remold-ui/ascii";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { animate, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_TUNING, TunePanel, type Tuning } from "./tune-panel";
import "./ascii-lab.css";

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.2 };
const FOLLOW = { duration: 0.6, bounce: 0.15 };

const MARK = "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";
const MARK_VIEW_BOX = { x: 6, y: 6, width: 20, height: 20 };
const FIRST_WORD = "remold";
const WORD_LIMIT = 12;
const TYPING_PAUSE = 280;
const PHONE_WIDTH = 640;
const PHONE_CELL = 8;

const DEPTH = 0.2;
const TURN = 0.55;
const LEAN = 0.35;
/** A model can turn further toward the pointer than a word can and still read. */
const MODEL_TURN = 1.1;
/** How fast a model turns on its own, in radians per second. */
const SPIN = 0.35;
/** How the scene sits with no pointer over it: turned to show its depth, less so once it reads as a word. */
const RESTING = { mark: { yaw: -0.45, pitch: 0.24 }, word: { yaw: -0.2, pitch: 0.16 }, model: { pitch: 0.3 } };
const RESTING_LIGHT = { x: -2.6, y: 2.2 };
const LIGHT_REACH = { x: 3.2, y: 2.4 };
const LIGHT_DISTANCE = 3;
/** Photos and cameras leave their darkest tones empty, so black reads as the ground. */
const MEDIA_FLOOR = 0.06;

const PALETTES = {
  ink: { label: "Ink", background: "#0b0b0c", foreground: "#f4f4f5", dark: "#2e2e34", light: "#f4f4f5", invert: false, source: false },
  colour: { label: "Colour", background: "#09090b", foreground: "#fafafa", dark: "#3f3f46", light: "#fafafa", invert: false, source: true },
  phosphor: { label: "Phosphor", background: "#040805", foreground: "#86efac", dark: "#14532d", light: "#bbf7d0", invert: false, source: false },
  cobalt: { label: "Cobalt", background: "#1f3ce8", foreground: "#e9ffe9", dark: "#020617", light: "#5cff86", invert: false, source: false },
  riso: { label: "Riso", background: "#f4e409", foreground: "#1e0b4f", dark: "#1e0b4f", light: "#6d28d9", invert: true, source: false },
} as const;

type PaletteName = keyof typeof PALETTES;
type Subject = "word" | "knot" | "camera" | "file";
type Loaded = { name: string; kind: "mesh"; mesh: Mesh } | { name: string; kind: "media"; element: HTMLImageElement | HTMLVideoElement; url: string };

/** Looks worth starting from. Lab is the cobalt-and-green look of a 3D ASCII lab built in Figma Make. */
const PRESETS = {
  remold: { label: "Remold", subject: "word", style: "ascii", palette: "ink" },
  lab: { label: "Lab", subject: "knot", style: "mixed", palette: "cobalt" },
  terminal: { label: "Terminal", subject: "knot", style: "binary", palette: "phosphor" },
  print: { label: "Print", subject: "word", style: "dither", palette: "riso" },
  braille: { label: "Braille", subject: "knot", style: "braille", palette: "ink" },
} as const satisfies Record<string, { label: string; subject: Subject; style: AsciiStyle; palette: PaletteName }>;

type PresetName = keyof typeof PRESETS;

const unit = (value: number) => Math.min(1, Math.max(0, value));
const isModelFile = (file: File) => /\.stl$/i.test(file.name);

async function loadFile(file: File): Promise<Loaded> {
  const name = file.name.replace(/\.[^.]+$/, "");

  if (isModelFile(file)) return { name, kind: "mesh", mesh: parseStl(await file.arrayBuffer()) };

  const url = URL.createObjectURL(file);

  if (file.type.startsWith("image/")) {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { name, kind: "media", element: image, url };
  }

  if (file.type.startsWith("video/")) {
    const video = Object.assign(document.createElement("video"), { src: url, loop: true, muted: true, playsInline: true });
    await video.play();
    return { name, kind: "media", element: video, url };
  }

  URL.revokeObjectURL(url);
  throw new Error("Drop an STL model, an image or a video.");
}

export function AsciiLab() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<AsciiRenderer | null>(null);
  const shownWordRef = useRef<{ text: string; field: DistanceField } | null>(null);
  const knotRef = useRef<Mesh | null>(null);

  const [word, setWord] = useState(FIRST_WORD);
  const [subject, setSubject] = useState<Subject>("word");
  const [style, setStyle] = useState<AsciiStyle>("ascii");
  const [paletteName, setPaletteName] = useState<PaletteName>("ink");
  const [tuning, setTuning] = useState<Tuning>(DEFAULT_TUNING);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  const palette = PALETTES[paletteName];
  const isMedia = subject === "camera" || (subject === "file" && loaded?.kind === "media");
  const stateRef = useRef({ palette, subject, isMedia, tuning });
  stateRef.current = { palette, subject, isMedia, tuning };

  const preset = (Object.keys(PRESETS) as PresetName[]).find((name) => {
    const look = PRESETS[name];
    return look.style === style && look.palette === paletteName && (look.subject === subject || subject === "camera" || subject === "file");
  });

  const reducedMotion = useReducedMotion() ?? false;
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const scrolled = useTransform(scrollYProgress, [0.12, 0.62], [0, 1]);
  const morph = useSpring(scrolled, FOLLOW);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const yaw = useSpring(0, FOLLOW);
  const pitch = useSpring(0, FOLLOW);
  const resting = useSpring(1, FOLLOW);
  const lightX = useSpring(RESTING_LIGHT.x, FOLLOW);
  const lightY = useSpring(RESTING_LIGHT.y, FOLLOW);
  const change = useMotionValue(1);
  const spinRef = useRef({ angle: 0, last: 0 });

  const frameRef = useRef<(now: number) => AsciiFrame>(() => ({ subject: "shape", ink: PALETTES.ink }));
  frameRef.current = (now) => {
    const { palette: ink, subject: current, isMedia: media, tuning: tune } = stateRef.current;
    const still = reducedRef.current;
    const seconds = still ? 0 : now / 1000;
    const rest = resting.get();
    const light = [lightX.get(), lightY.get(), LIGHT_DISTANCE] as const;

    if (media) {
      return {
        subject: "media",
        ink,
        seconds,
        mirror: current === "camera" && tune.mirror,
        tone: { contrast: tune.contrast, brightness: tune.brightness, floor: ink.invert ? 0 : MEDIA_FLOOR },
      };
    }

    if (current !== "word") {
      const spin = spinRef.current;
      if (!still && spin.last > 0) spin.angle += Math.min(0.1, (now - spin.last) / 1000) * SPIN;
      spin.last = now;

      return {
        subject: "mesh",
        ink,
        seconds,
        light,
        camera: { yaw: spin.angle + yaw.get() * (MODEL_TURN / TURN), pitch: pitch.get() + RESTING.model.pitch * rest },
      };
    }

    const shown = still ? scrolled.get() : morph.get();
    const changing = change.get();
    const swell = Math.max(Math.sin(Math.PI * unit(shown)), Math.sin(Math.PI * unit(changing)));
    const restYaw = RESTING.mark.yaw + (RESTING.word.yaw - RESTING.mark.yaw) * unit(shown);
    const restPitch = RESTING.mark.pitch + (RESTING.word.pitch - RESTING.mark.pitch) * unit(shown);

    return {
      subject: "shape",
      ink,
      seconds,
      light,
      morph: shown,
      change: changing,
      depth: DEPTH * (1 + 0.7 * swell),
      camera: {
        yaw: yaw.get() + restYaw * rest + (still ? 0 : Math.sin(seconds * 0.45) * 0.14 * rest + Math.sin(Math.PI * unit(shown)) * 0.5),
        pitch: pitch.get() + restPitch * rest + (still ? 0 : Math.sin(seconds * 0.31) * 0.05 * rest),
      },
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const section = sectionRef.current;

    if (!canvas || !stage || !section) return;

    const cellSize = stage.clientWidth < PHONE_WIDTH ? PHONE_CELL : DEFAULT_TUNING.cellSize;
    let renderer: AsciiRenderer;

    try {
      renderer = createAsciiRenderer(canvas, { cellSize });
      const field = textField(FIRST_WORD);
      renderer.setField("logo", pathField(MARK, MARK_VIEW_BOX));
      renderer.setField("from", field);
      renderer.setField("to", field);
      shownWordRef.current = { text: FIRST_WORD, field };
      knotRef.current = torusKnot();
      renderer.setMesh(knotRef.current);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      return;
    }

    rendererRef.current = renderer;
    setTuning((current) => ({ ...current, cellSize }));
    setReady(true);

    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      renderer.resize({ width, height, pixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();

    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    visibility.observe(section);

    let frame = requestAnimationFrame(function draw(now) {
      frame = requestAnimationFrame(draw);
      if (visible) renderer.render(frameRef.current(now));
    });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready) rendererRef.current?.setStyle(style);
  }, [style, ready]);

  useEffect(() => {
    if (ready) rendererRef.current?.setCellSize(tuning.cellSize);
  }, [tuning.cellSize, ready]);

  useEffect(() => {
    if (ready) rendererRef.current?.setRamp(tuning.ramp);
  }, [tuning.ramp, ready]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!ready || !renderer) return;

    if (subject === "knot" && knotRef.current) renderer.setMesh(knotRef.current);
    if (subject === "file" && loaded?.kind === "mesh") renderer.setMesh(loaded.mesh);
    if (subject === "file" && loaded?.kind === "media") renderer.setMedia(loaded.element);
  }, [subject, loaded, ready]);

  useEffect(() => {
    if (subject !== "camera" || !ready) return;

    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(async (opened) => {
        if (cancelled) {
          for (const track of opened.getTracks()) track.stop();
          return;
        }
        stream = opened;
        const video = Object.assign(document.createElement("video"), { muted: true, playsInline: true, srcObject: opened });
        await video.play();
        rendererRef.current?.setMedia(video);
        setNotice(null);
      })
      .catch(() => {
        setNotice("The camera is blocked or missing. Allow it in the browser, or upload an image or video instead.");
        setSubject("knot");
      });

    return () => {
      cancelled = true;
      for (const track of stream?.getTracks() ?? []) track.stop();
      rendererRef.current?.setMedia(null);
    };
  }, [subject, ready]);

  useEffect(() => {
    return () => {
      if (loaded?.kind === "media") URL.revokeObjectURL(loaded.url);
    };
  }, [loaded]);

  useEffect(() => {
    const text = word.trim();
    const renderer = rendererRef.current;
    const shown = shownWordRef.current;

    if (!renderer || !shown || !text || text === shown.text) return;

    const pause = setTimeout(() => {
      const field = textField(text);
      renderer.setField("from", shown.field);
      renderer.setField("to", field);
      shownWordRef.current = { text, field };
      change.jump(0);

      if (reducedRef.current) change.jump(1);
      else animate(change, 1, SPRING);
    }, TYPING_PAUSE);

    return () => clearTimeout(pause);
  }, [word, change]);

  const applyPreset = (name: PresetName) => {
    const look = PRESETS[name];
    setStyle(look.style);
    setPaletteName(look.palette);
    if (subject !== "camera" && subject !== "file") setSubject(look.subject);
  };

  const open = async (file: File) => {
    try {
      setLoaded(await loadFile(file));
      setSubject("file");
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.replace(/^ascii: /, "") : String(error));
    }
  };

  const follow = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;

    resting.set(0);
    yaw.set(x * TURN);
    pitch.set(-y * LEAN);
    lightX.set(x * LIGHT_REACH.x);
    lightY.set(y * LIGHT_REACH.y + 0.6);
  };

  const rest = () => {
    resting.set(1);
    yaw.set(0);
    pitch.set(0);
    lightX.set(RESTING_LIGHT.x);
    lightY.set(RESTING_LIGHT.y);
  };

  const flash = (message: string) => {
    setCopied(true);
    setNotice(message);
    setTimeout(() => {
      setCopied(false);
      setNotice(null);
    }, 1600);
  };

  const copy = async () => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    try {
      await navigator.clipboard.writeText(renderer.text(frameRef.current(performance.now())));
      flash("Copied as text");
    } catch {
      setNotice("The clipboard is blocked here.");
    }
  };

  const savePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const output = document.createElement("canvas");
    output.width = canvas.width;
    output.height = canvas.height;
    const context = output.getContext("2d");
    if (!context) return;

    context.fillStyle = palette.background;
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(canvas, 0, 0);
    output.toBlob((blob) => {
      if (!blob) return;
      const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `ascii-${style}.png` });
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      flash("Saved a PNG");
    }, "image/png");
  };

  const description =
    subject === "word"
      ? `The Remold mark in 3D, remolding into the word “${word.trim() || FIRST_WORD}” as you scroll`
      : subject === "knot"
        ? "A turning torus knot"
        : subject === "camera"
          ? "Your camera"
          : `${loaded?.name ?? "Your file"}`;
  const theme = { "--al-background": palette.background, "--al-foreground": palette.foreground } as React.CSSProperties;

  return (
    <section ref={sectionRef} className="al-scroll" data-subject={subject} style={theme}>
      <div
        ref={stageRef}
        className="al-stage"
        onPointerMove={follow}
        onPointerLeave={rest}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) void open(file);
        }}
      >
        <canvas ref={canvasRef} className="al-canvas" role="img" aria-label={`${description}, drawn as ${STYLES[style].label} characters`} />

        <header className="al-title">
          <span>ASCII Lab</span>
          <span className="al-badge">Live</span>
        </header>

        <ToggleGroup className="al-presets" value={preset ? [preset] : []} onValueChange={(value) => value[0] && applyPreset(value[0] as PresetName)} aria-label="Presets">
          {(Object.keys(PRESETS) as PresetName[]).map((name) => (
            <Toggle key={name} value={name} className="al-preset">
              {PRESETS[name].label}
            </Toggle>
          ))}
        </ToggleGroup>

        {subject === "word" && (
          <motion.p className="al-hint" style={{ opacity: hintOpacity }} aria-hidden="true">
            Scroll to remold · drop a model, image or video anywhere
          </motion.p>
        )}

        <p className="al-notice" role="status">
          {notice}
        </p>

        {failure ? (
          <p className="al-failure">{failure}</p>
        ) : (
          <div className="al-controls">
            <ToggleGroup className="al-segmented al-styles" value={[style]} onValueChange={(value) => value[0] && setStyle(value[0] as AsciiStyle)} aria-label="Style">
              {(Object.keys(STYLES) as AsciiStyle[]).map((name) => (
                <Toggle key={name} value={name} className="al-segment">
                  {STYLES[name].label}
                </Toggle>
              ))}
            </ToggleGroup>

            <div className="al-row">
              <ToggleGroup className="al-segmented" value={[subject]} onValueChange={(value) => value[0] && setSubject(value[0] as Subject)} aria-label="Subject">
                <Toggle value="word" className="al-segment">
                  Word
                </Toggle>
                <Toggle value="knot" className="al-segment">
                  Knot
                </Toggle>
                <Toggle value="camera" className="al-segment">
                  Camera
                </Toggle>
                {loaded && (
                  <Toggle value="file" className="al-segment al-model-name">
                    {loaded.name}
                  </Toggle>
                )}
              </ToggleGroup>

              {subject === "word" && (
                <label className="al-word">
                  <span className="sr-only">Word</span>
                  <input value={word} maxLength={WORD_LIMIT} spellCheck={false} autoComplete="off" onChange={(event) => setWord(event.target.value)} placeholder="Type a word" />
                </label>
              )}

              <button type="button" className="al-button al-quiet" onClick={() => fileRef.current?.click()}>
                Upload
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".stl,model/stl,image/*,video/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void open(file);
                  event.target.value = "";
                }}
              />

              <TunePanel tuning={tuning} onChange={setTuning} media={isMedia} style={theme} />
            </div>

            <div className="al-row">
              <ToggleGroup className="al-segmented" value={[paletteName]} onValueChange={(value) => value[0] && setPaletteName(value[0] as PaletteName)} aria-label="Palette">
                {(Object.keys(PALETTES) as PaletteName[]).map((name) => (
                  <Toggle key={name} value={name} className="al-segment">
                    {PALETTES[name].label}
                  </Toggle>
                ))}
              </ToggleGroup>
              <button type="button" className="al-button" onClick={copy}>
                {copied ? "Done" : "Copy as text"}
              </button>
              <button type="button" className="al-button" onClick={savePng}>
                Save PNG
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
