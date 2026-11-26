"use client";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  CheckIcon,
  Copy01Icon,
  Delete02Icon,
  Image01Icon,
  PauseIcon,
  PlayIcon,
  Redo02Icon,
  ShapesIcon,
  TextIcon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Menu } from "@base-ui/react/menu";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { Switch } from "@base-ui/react/switch";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Remold } from "@remold-ui/react/canvas";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { useHistory } from "../studio/use-history";
import {
  CANVAS_SIZES,
  CHARACTER_SETS,
  colorRamp,
  frameId,
  validateFilm,
  type Brand,
  type DotLook,
  type Film,
  type FilmFrame,
  type FrameSource,
  type Shade,
} from "./document";
import { toJSON, toReact } from "./export";
import { frameLabel, framePoints, frameShape, iconMarkup, svgToPath } from "./shapes";
import { ICON_SHAPES, PATHS, readImage } from "./assets";
import { composeLayers, useRecorder } from "./use-recorder";
import { buildFilm, DEFAULT_BRAND, STYLES } from "./brand";
import { cliSplash } from "./banner";
import { GuidePanel } from "./guide-panel";
import "./particle-studio.css";

const STORAGE_KEY = "remold-particle-studio:film";
const NOTICE_MS = 1800;
const CANVAS_GUTTER = 72;

const SOURCE_ICONS: Record<FrameSource["kind"], IconSvgElement> = { text: TextIcon, image: Image01Icon, path: ShapesIcon };

function stored(): Film | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = validateFilm(JSON.parse(raw));
    return "film" in result ? result.film : null;
  } catch {
    return null;
  }
}

const updateFrame = (film: Film, at: number, patch: Partial<FilmFrame>): Film => ({
  ...film,
  frames: film.frames.map((frame, i) => (i === at ? { ...frame, ...patch } : frame)),
});

function newFrame(source: FrameSource, index: number): FilmFrame {
  const name = source.kind === "text" ? source.text : source.kind === "image" ? "Image" : "Shape";
  return { id: frameId(), name: `${name} ${index}`.trim(), ms: 1600, source, shade: "gradient", transition: "scatter" };
}

export function ParticleStudio() {
  const history = useHistory<Film>(() => buildFilm(DEFAULT_BRAND, STYLES[0]!.name));
  const film = history.value;
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [mode, setMode] = useState<"guided" | "customise">("guided");
  const [step, setStep] = useState("brand");
  const [notice, setNotice] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const svgPicker = useRef<HTMLInputElement>(null);
  const replacing = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const actions = useRef<Remold.Particles.Actions>(null);

  // Saving waits until the saved film has been read back, so the starting template never overwrites it.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = stored();
    if (saved) history.reset(saved);
    setRestored(true);
  }, [history.reset]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(film));
    } catch {
      // Private windows and full storage: the studio still works, it just won't remember.
    }
  }, [film, restored]);

  const at = Math.min(frameIndex, film.frames.length - 1);
  const frame = film.frames[at]!;

  const total = film.frames.reduce((sum, f) => sum + f.ms, 0);
  const recorder = useRecorder({
    layers: () => (canvas.current ? [canvas.current] : []),
    background: film.canvas.background,
    ms: total,
    name: film.title,
    onStart: () => {
      setFrameIndex(0);
      setPlaying(true);
    },
    onDone: (result) => {
      if (result === "saved") {
        track("Studio export", { source: "particle studio", detail: "video" });
        setNotice("Video saved");
      } else setNotice(result);
    },
  });

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setFrameIndex((i) => (Math.min(i, film.frames.length - 1) + 1) % film.frames.length), frame.ms);
    return () => clearTimeout(timer);
  }, [playing, at, frame.ms, film.frames.length]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]");
      if (typing) return;
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((p) => !p);
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history.undo, history.redo]);

  // Fit the canvas into the viewport, like a design tool's "zoom to fit".
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element || !fit) return;
    const measure = () => {
      const scale = Math.min((element.clientWidth - CANVAS_GUTTER) / film.canvas.width, (element.clientHeight - CANVAS_GUTTER) / film.canvas.height);
      setZoom(Math.max(0.1, Math.min(2, scale)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit, film.canvas.width, film.canvas.height]);

  const points = useMemo(() => framePoints(frame, film.count), [frame.source, frame.shade, film.count]);
  const shape = useMemo(() => frameShape(frame, points), [frame.source, points]);
  const palette = useMemo(() => colorRamp(film.look.colors), [film.look.colors]);
  const { look } = film;
  // The canvas reads its dot style when it mounts, so a new style mounts a new canvas.
  const mountKey = `${look.dot}|${look.characters}|${look.cell}|${look.blend}|${look.camera.on}|${film.canvas.width}x${film.canvas.height}`;

  const edit = (next: Film, foldKey?: string) => history.set(next, foldKey);
  const editLook = (patch: Partial<Film["look"]>, foldKey?: string) => edit({ ...film, look: { ...film.look, ...patch } }, foldKey);
  const editFrame = (patch: Partial<FilmFrame>, foldKey?: string) => edit(updateFrame(film, at, patch), foldKey);

  const goTo = (index: number) => {
    setPlaying(false);
    setFrameIndex(index);
  };

  const addFrame = (source: FrameSource) => {
    const added = newFrame(source, film.frames.length + 1);
    edit({ ...film, frames: film.frames.toSpliced(at + 1, 0, added) });
    goTo(at + 1);
  };

  const moveFrame = (from: number, to: number) => {
    if (to < 0 || to >= film.frames.length) return;
    const frames = [...film.frames];
    const [moved] = frames.splice(from, 1);
    frames.splice(to, 0, moved!);
    edit({ ...film, frames });
    goTo(to);
  };

  const pickImage = (replace: boolean) => {
    replacing.current = replace;
    filePicker.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const src = await readImage(file);
      if (replacing.current && frame.source.kind === "image") editFrame({ source: { ...frame.source, src } });
      else addFrame({ kind: "image", src, by: "dark" });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't open that image");
    }
  };

  const open = (next: Film) => {
    history.set(next);
    setFrameIndex(0);
    setPlaying(true);
  };

  const brand = film.brand ?? DEFAULT_BRAND;

  /** A brand or style change rebuilds the frames, keeping the format you picked. */
  const rebuild = (nextBrand: Brand, styleName: string, foldKey?: string) => {
    history.set(buildFilm(nextBrand, styleName, film.canvas), foldKey);
    setPlaying(true);
  };

  const copyPlain = async (text: string, what: string, detail: string) => {
    try {
      await navigator.clipboard.writeText(text);
      track("Studio export", { source: "particle studio", detail });
      setNotice(`${what} copied`);
    } catch {
      setNotice("Couldn't reach the clipboard");
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      track("Copy code", { source: "particle studio", detail: what });
      setNotice(`${what} copied`);
    } catch {
      setNotice("Couldn't reach the clipboard");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([toJSON(film)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName(film.title)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onSvg = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { path, outline } = svgToPath(await file.text());
      if (frame.source.kind === "path") editFrame({ source: { kind: "path", path, outline } });
      else addFrame({ kind: "path", path, outline });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't read that SVG");
    }
  };

  const savePNG = () => {
    const source = canvas.current;
    if (!source) return;
    const composed = document.createElement("canvas");
    composed.width = source.width;
    composed.height = source.height;
    const context = composed.getContext("2d");
    if (!context) return;
    composeLayers(context, [source], film.canvas.background);
    composed.toBlob((blob) => {
      if (!blob) return setNotice("Couldn't save the image");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName(film.title)}-${at + 1}.png`;
      link.click();
      URL.revokeObjectURL(url);
      track("Studio export", { source: "particle studio", detail: "png" });
      setNotice("Image saved");
    }, "image/png");
  };

  const copyText = async () => {
    const text = actions.current?.text() ?? "";
    if (!text) return setNotice("Nothing to copy yet");
    try {
      await navigator.clipboard.writeText(text);
      track("Studio export", { source: "particle studio", detail: "ascii" });
      setNotice("ASCII copied");
    } catch {
      setNotice("Couldn't reach the clipboard");
    }
  };

  return (
    <div className="ps">
      <header className="ps-top">
        <div className="ps-top-left">
          <span className="ps-mark" aria-hidden="true" />
          <input className="ps-title" value={film.title} aria-label="Film title" onChange={(e) => edit({ ...film, title: e.target.value }, "title")} />
        </div>

        <div className="ps-top-center">
          <ToggleGroup
            className="ps-segmented ps-mode"
            value={[mode]}
            onValueChange={(value) => value[0] && setMode(value[0] as "guided" | "customise")}
            aria-label="Mode"
          >
            <Toggle value="guided" className="ps-segment">
              Guided
            </Toggle>
            <Toggle value="customise" className="ps-segment">
              Customise
            </Toggle>
          </ToggleGroup>
          {mode === "customise" && (
            <div className="ps-tools" role="toolbar" aria-label="Add a frame">
              <ToolButton icon={TextIcon} label="Text" onClick={() => addFrame({ kind: "text", text: "type", weight: 800 })} />
              <ToolButton icon={Image01Icon} label="Image" onClick={() => pickImage(false)} />
              <ToolButton icon={ShapesIcon} label="Shape" onClick={() => addFrame({ kind: "path", path: PATHS.Star })} />
              <input
                ref={filePicker}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))}
              />
              <input ref={svgPicker} type="file" accept=".svg,image/svg+xml" hidden onChange={(e) => (onSvg(e.target.files?.[0]), (e.target.value = ""))} />
            </div>
          )}
        </div>

        <div className="ps-top-right">
          {recorder.recording && (
            <span className="ps-recording" role="status">
              <span className="ps-recording-dot" aria-hidden="true" /> Recording {Math.ceil(recorder.left / 1000)}s
            </span>
          )}
          <button type="button" className="ps-icon" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo">
            <HugeiconsIcon icon={Undo02Icon} />
          </button>
          <button type="button" className="ps-icon" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo">
            <HugeiconsIcon icon={Redo02Icon} />
          </button>
          <Menu.Root modal={false}>
            <Menu.Trigger className="ps-button ps-primary">
              Export
              <HugeiconsIcon icon={ArrowDown01Icon} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner className="ps-popup-layer" align="end" sideOffset={6}>
                <Menu.Popup className="ps-menu">
                  <Menu.Item className="ps-menu-item" disabled={recorder.recording} onClick={recorder.start}>
                    Record video
                    <span className="ps-menu-hint">{(total / 1000).toFixed(1)}s</span>
                  </Menu.Item>
                  <Menu.Item className="ps-menu-item" onClick={savePNG}>
                    Save frame as PNG
                  </Menu.Item>
                  {look.dot === "ascii" && (
                    <Menu.Item className="ps-menu-item" onClick={copyText}>
                      Copy ASCII as text
                    </Menu.Item>
                  )}
                  <Menu.Separator className="ps-menu-separator" />
                  <Menu.Item className="ps-menu-item" onClick={() => copy(toReact(film), "React component")}>
                    Copy React component
                  </Menu.Item>
                  <Menu.Item className="ps-menu-item" onClick={() => copy(toJSON(film), "JSON")}>
                    Copy JSON
                  </Menu.Item>
                  <Menu.Item className="ps-menu-item" onClick={download}>
                    Download JSON
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </header>

      <div className="ps-main" data-mode={mode}>
        {mode === "guided" && (
          <GuidePanel
            film={film}
            brand={brand}
            step={step}
            onStep={setStep}
            onBrand={(next, foldKey) => rebuild(next, film.style ?? STYLES[0]!.name, foldKey)}
            onStyle={(name) => rebuild(brand, name)}
            onFormat={(size) => edit({ ...film, canvas: { ...film.canvas, ...size } })}
            onError={setNotice}
            actions={{
              copyReact: () => copy(toReact(film), "React component"),
              record: recorder.start,
              recording: recorder.recording,
              savePNG,
              copyBanner: (banner) => copyPlain(`\`\`\`text\n${banner}\n\`\`\``, "Banner", "banner"),
              copySplash: (banner) => copyPlain(cliSplash(banner, brand.tagline), "CLI splash", "cli"),
            }}
          />
        )}
        {mode === "customise" && (
          <aside className="ps-panel ps-left" aria-label="Frames">
            <p className="ps-section-title">Frames</p>
            <ol className="ps-frames">
              {film.frames.map((f, i) => (
                <li key={f.id}>
                  <button type="button" className="ps-frame-row" data-active={i === at || undefined} onClick={() => goTo(i)}>
                    <HugeiconsIcon icon={SOURCE_ICONS[f.source.kind]} className="ps-frame-icon" aria-hidden="true" />
                    <span className="ps-frame-name">{f.name}</span>
                    <span className="ps-frame-time">{(f.ms / 1000).toFixed(1)}s</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="ps-frame-actions">
              <button type="button" className="ps-icon" aria-label="Move frame up" disabled={at === 0} onClick={() => moveFrame(at, at - 1)}>
                <HugeiconsIcon icon={ArrowUp02Icon} />
              </button>
              <button
                type="button"
                className="ps-icon"
                aria-label="Move frame down"
                disabled={at === film.frames.length - 1}
                onClick={() => moveFrame(at, at + 1)}
              >
                <HugeiconsIcon icon={ArrowDown02Icon} />
              </button>
              <button
                type="button"
                className="ps-icon"
                aria-label="Duplicate frame"
                onClick={() => {
                  edit({ ...film, frames: film.frames.toSpliced(at + 1, 0, { ...frame, id: frameId(), name: `${frame.name} copy` }) });
                  goTo(at + 1);
                }}
              >
                <HugeiconsIcon icon={Copy01Icon} />
              </button>
              <button
                type="button"
                className="ps-icon"
                aria-label="Delete frame"
                disabled={film.frames.length <= 1}
                onClick={() => {
                  edit({ ...film, frames: film.frames.toSpliced(at, 1) });
                  setFrameIndex(Math.max(0, at - 1));
                }}
              >
                <HugeiconsIcon icon={Delete02Icon} />
              </button>
            </div>
          </aside>
        )}

        <section ref={viewport} className="ps-viewport" aria-label="Canvas">
          <div className="ps-artboard-wrap" style={{ width: film.canvas.width * zoom, height: film.canvas.height * zoom }}>
            <p className="ps-artboard-label">
              {film.title}{" "}
              <span>
                {film.canvas.width} × {film.canvas.height}
              </span>
            </p>
            <div
              className="ps-artboard"
              style={{ width: film.canvas.width, height: film.canvas.height, background: film.canvas.background, transform: `scale(${zoom})` }}
            >
              <Remold.Particles
                ref={canvas}
                actionsRef={actions}
                key={mountKey}
                className="ps-particles"
                shape={shape}
                label={frameLabel(frame)}
                count={film.count}
                palette={palette}
                dot={look.dot}
                ascii={look.dot === "ascii" ? { characters: look.characters || ".", size: look.cell } : undefined}
                radius={look.radius}
                blend={look.blend}
                camera={look.camera.on ? { spin: look.camera.spin, tilt: look.camera.tilt } : undefined}
                pointer={false}
                padding={48}
                transition={frame.transition}
              />
            </div>
          </div>
          <div className="ps-zoom" role="group" aria-label="Zoom">
            <button type="button" className="ps-button ps-quiet" data-active={fit || undefined} onClick={() => setFit(true)}>
              Fit
            </button>
            <button
              type="button"
              className="ps-button ps-quiet"
              data-active={(!fit && zoom === 1) || undefined}
              onClick={() => {
                setFit(false);
                setZoom(1);
              }}
            >
              100%
            </button>
            <span className="ps-zoom-value">{Math.round(zoom * 100)}%</span>
          </div>
        </section>

        {mode === "customise" && (
          <aside className="ps-panel ps-right" aria-label="Design">
            {film.brand && <p className="ps-customise-note">Changes here stay until you change the brand or style in Guided, which rebuilds the frames.</p>}
            <Section title="Frame">
              <Field label="Name">
                <input className="ps-input" value={frame.name} onChange={(e) => editFrame({ name: e.target.value }, `name:${at}`)} />
              </Field>
              {frame.source.kind === "text" && (
                <>
                  <Field label="Text">
                    <input
                      className="ps-input"
                      value={frame.source.text}
                      maxLength={24}
                      onChange={(e) =>
                        editFrame({ source: { ...(frame.source as Extract<FrameSource, { kind: "text" }>), text: e.target.value } }, `text:${at}`)
                      }
                    />
                  </Field>
                  <Field label="Weight">
                    <Segmented
                      value={String(frame.source.weight)}
                      options={[
                        { value: "400", label: "Regular" },
                        { value: "700", label: "Bold" },
                        { value: "900", label: "Black" },
                      ]}
                      onChange={(v) => editFrame({ source: { ...(frame.source as Extract<FrameSource, { kind: "text" }>), weight: Number(v) } })}
                    />
                  </Field>
                </>
              )}
              {frame.source.kind === "image" && (
                <>
                  <div className="ps-image">
                    <img src={frame.source.src} alt="" />
                    <button type="button" className="ps-button ps-quiet" onClick={() => pickImage(true)}>
                      Replace
                    </button>
                  </div>
                  <Field label="Dots on">
                    <Segmented
                      value={frame.source.by}
                      options={[
                        { value: "dark", label: "Dark" },
                        { value: "light", label: "Light" },
                        { value: "alpha", label: "Shape" },
                      ]}
                      onChange={(v) => editFrame({ source: { ...(frame.source as Extract<FrameSource, { kind: "image" }>), by: v as "dark" } })}
                    />
                  </Field>
                </>
              )}
              {frame.source.kind === "path" && (
                <>
                  <Field label="Shape">
                    <Segmented
                      value={(Object.keys(PATHS) as (keyof typeof PATHS)[]).find((k) => PATHS[k] === (frame.source as { path: string }).path) ?? ""}
                      options={Object.keys(PATHS).map((k) => ({ value: k, label: k }))}
                      onChange={(v) => editFrame({ source: { kind: "path", path: PATHS[v as keyof typeof PATHS] } })}
                    />
                  </Field>
                  <div className="ps-icon-grid" role="group" aria-label="Icons">
                    {ICON_SHAPES.map(({ name, icon }) => (
                      <button
                        key={name}
                        type="button"
                        className="ps-icon-pick"
                        aria-label={name}
                        title={name}
                        onClick={() => {
                          const { path, outline } = svgToPath(iconMarkup(icon));
                          editFrame({ name, source: { kind: "path", path, outline } });
                        }}
                      >
                        <HugeiconsIcon icon={icon} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <Field label="Dots">
                    <Segmented
                      value={frame.source.outline ? "outline" : "fill"}
                      options={[
                        { value: "fill", label: "Fill" },
                        { value: "outline", label: "Outline" },
                      ]}
                      onChange={(v) => editFrame({ source: { ...(frame.source as Extract<FrameSource, { kind: "path" }>), outline: v === "outline" } })}
                    />
                  </Field>
                  <textarea
                    className="ps-input ps-code"
                    value={frame.source.path}
                    spellCheck={false}
                    aria-label="SVG path"
                    onChange={(e) => editFrame({ source: { ...(frame.source as Extract<FrameSource, { kind: "path" }>), path: e.target.value } }, `path:${at}`)}
                  />
                  <button type="button" className="ps-button ps-quiet ps-upload" onClick={() => svgPicker.current?.click()}>
                    Upload an SVG
                  </button>
                </>
              )}
              {frame.source.kind !== "image" && (
                <Field label="Shade">
                  <Segmented
                    value={frame.shade}
                    options={[
                      { value: "flat", label: "Flat" },
                      { value: "gradient", label: "Fade" },
                      { value: "rings", label: "Rings" },
                      { value: "noise", label: "Noise" },
                    ]}
                    onChange={(v) => editFrame({ shade: v as Shade })}
                  />
                </Field>
              )}
              <Field label="Arrive">
                <Segmented
                  value={frame.transition}
                  options={[
                    { value: "scatter", label: "Scatter" },
                    { value: "direct", label: "Direct" },
                  ]}
                  onChange={(v) => editFrame({ transition: v as FilmFrame["transition"] })}
                />
              </Field>
              <Range
                label="Duration"
                value={frame.ms}
                min={600}
                max={6000}
                step={100}
                format={(v) => `${(v / 1000).toFixed(1)}s`}
                onChange={(ms) => editFrame({ ms }, `ms:${at}`)}
              />
            </Section>

            <Section title="Dots">
              <Segmented
                value={look.dot}
                options={[
                  { value: "circle", label: "Dots" },
                  { value: "square", label: "Squares" },
                  { value: "ascii", label: "ASCII" },
                ]}
                onChange={(v) => editLook({ dot: v as DotLook })}
              />
              {look.dot === "ascii" ? (
                <>
                  <div className="ps-charsets">
                    {CHARACTER_SETS.map((set) => (
                      <button
                        key={set.name}
                        type="button"
                        className="ps-charset"
                        data-active={look.characters === set.characters || undefined}
                        onClick={() => editLook({ characters: set.characters })}
                      >
                        <span className="ps-charset-glyphs">{set.characters}</span>
                        {set.name}
                      </button>
                    ))}
                  </div>
                  <Field label="Characters">
                    <input className="ps-input ps-mono" value={look.characters} onChange={(e) => editLook({ characters: e.target.value }, "characters")} />
                  </Field>
                  <Range label="Cell" value={look.cell} min={6} max={28} step={1} format={(v) => `${v}px`} onChange={(cell) => editLook({ cell }, "cell")} />
                </>
              ) : (
                <Range
                  label="Size"
                  value={look.radius}
                  min={0.6}
                  max={6}
                  step={0.1}
                  format={(v) => `${v.toFixed(1)}px`}
                  onChange={(radius) => editLook({ radius }, "radius")}
                />
              )}
              <Range
                label="Count"
                value={film.count}
                min={300}
                max={8000}
                step={100}
                format={(v) => v.toLocaleString("en-US")}
                onChange={(count) => edit({ ...film, count }, "count")}
              />
            </Section>

            <Section title="Colour">
              <div className="ps-swatches">
                {look.colors.map((color, i) => (
                  <span key={i} className="ps-swatch-field">
                    <input
                      type="color"
                      className="ps-swatch"
                      value={color}
                      aria-label={`Colour ${i + 1}`}
                      onChange={(e) => editLook({ colors: look.colors.map((c, j) => (j === i ? e.target.value : c)) }, `color:${i}`)}
                    />
                    {look.colors.length > 1 && (
                      <button
                        type="button"
                        className="ps-swatch-remove"
                        aria-label={`Remove colour ${i + 1}`}
                        onClick={() => editLook({ colors: look.colors.toSpliced(i, 1) })}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {look.colors.length < 5 && (
                  <button
                    type="button"
                    className="ps-icon"
                    aria-label="Add a colour"
                    onClick={() => editLook({ colors: [...look.colors, look.colors.at(-1) ?? "#ffffff"] })}
                  >
                    <HugeiconsIcon icon={Add01Icon} />
                  </button>
                )}
              </div>
              <div className="ps-ramp" style={{ background: `linear-gradient(90deg, ${palette.join(", ")})` }} aria-hidden="true" />
              <Field label="Background">
                <span className="ps-color-field">
                  <input
                    type="color"
                    className="ps-swatch"
                    value={film.canvas.background}
                    aria-label="Background"
                    onChange={(e) => edit({ ...film, canvas: { ...film.canvas, background: e.target.value } }, "background")}
                  />
                  <span className="ps-mono">{film.canvas.background}</span>
                </span>
              </Field>
              <Field label="Blend">
                <Segmented
                  value={look.blend}
                  options={[
                    { value: "normal", label: "Normal" },
                    { value: "add", label: "Glow" },
                  ]}
                  onChange={(v) => editLook({ blend: v as "normal" | "add" })}
                />
              </Field>
            </Section>

            <Section
              title="3D camera"
              action={
                <Switch.Root
                  className="ps-switch"
                  checked={look.camera.on}
                  onCheckedChange={(on) => editLook({ camera: { ...look.camera, on } })}
                  aria-label="3D camera"
                >
                  <Switch.Thumb className="ps-switch-thumb" />
                </Switch.Root>
              }
            >
              {look.camera.on && (
                <>
                  <Range
                    label="Spin"
                    value={look.camera.spin}
                    min={0}
                    max={0.4}
                    step={0.01}
                    format={(v) => `${v.toFixed(2)}/s`}
                    onChange={(spin) => editLook({ camera: { ...look.camera, spin } }, "spin")}
                  />
                  <Range
                    label="Tilt"
                    value={look.camera.tilt}
                    min={0}
                    max={40}
                    step={1}
                    format={(v) => `${v}°`}
                    onChange={(tilt) => editLook({ camera: { ...look.camera, tilt } }, "tilt")}
                  />
                </>
              )}
            </Section>

            <Section title="Canvas">
              <Segmented
                value={CANVAS_SIZES.find((s) => s.width === film.canvas.width && s.height === film.canvas.height)?.name ?? ""}
                options={CANVAS_SIZES.map((s) => ({ value: s.name, label: s.name }))}
                onChange={(v) => {
                  const size = CANVAS_SIZES.find((s) => s.name === v)!;
                  edit({ ...film, canvas: { ...film.canvas, width: size.width, height: size.height } });
                }}
              />
              <div className="ps-pair">
                <NumberInput
                  label="W"
                  value={film.canvas.width}
                  onChange={(width) => edit({ ...film, canvas: { ...film.canvas, width: Math.max(120, width) } }, "w")}
                />
                <NumberInput
                  label="H"
                  value={film.canvas.height}
                  onChange={(height) => edit({ ...film, canvas: { ...film.canvas, height: Math.max(120, height) } }, "h")}
                />
              </div>
            </Section>

            <Importer
              onOpen={(next) => {
                open(next);
                setNotice("Opened");
              }}
            />
          </aside>
        )}
      </div>

      <footer className="ps-timeline" aria-label="Timeline">
        <button type="button" className="ps-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
          <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} />
        </button>
        <ol className="ps-track">
          {film.frames.map((f, i) => (
            <li key={f.id} style={{ flexGrow: f.ms }}>
              <button type="button" className="ps-clip" data-active={i === at || undefined} onClick={() => goTo(i)}>
                {i === at && playing && (
                  <span key={`${f.id}-${frameIndex}`} className="ps-clip-progress" style={{ animationDuration: `${f.ms}ms` }} aria-hidden="true" />
                )}
                <HugeiconsIcon icon={SOURCE_ICONS[f.source.kind]} className="ps-clip-icon" aria-hidden="true" />
                <span className="ps-clip-name">{f.name}</span>
              </button>
            </li>
          ))}
        </ol>
        <span className="ps-total">{(total / 1000).toFixed(1)}s</span>
      </footer>

      {notice && (
        <p className="ps-notice" role="status">
          <HugeiconsIcon icon={CheckIcon} aria-hidden="true" /> {notice}
        </p>
      )}
    </div>
  );
}

const fileName = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "film";

function ToolButton({ icon, label, onClick }: { icon: IconSvgElement; label: string; onClick: () => void }) {
  return (
    <button type="button" className="ps-tool" onClick={onClick}>
      <HugeiconsIcon icon={icon} aria-hidden="true" />
      {label}
    </button>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="ps-section">
      <div className="ps-section-head">
        <p className="ps-section-title">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ps-field">
      <span className="ps-label">{label}</span>
      <span className="ps-control">{children}</span>
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <ToggleGroup className="ps-segmented" value={[value]} onValueChange={(v) => v[0] && onChange(v[0])}>
      {options.map((o) => (
        <Toggle key={o.value} value={o.value} className="ps-segment">
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <NumberField.Root className="ps-number" value={Math.round(value)} step={1} largeStep={10} onValueChange={(v) => v !== null && onChange(v)}>
      <NumberField.ScrubArea className="ps-number-label">
        <label>{label}</label>
      </NumberField.ScrubArea>
      <NumberField.Input className="ps-number-input" aria-label={label} />
    </NumberField.Root>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="ps-field">
      <span className="ps-label">{label}</span>
      <Slider.Root className="ps-slider" value={value} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? v[0]! : v)}>
        <Slider.Control className="ps-slider-control">
          <Slider.Track className="ps-slider-track">
            <Slider.Indicator className="ps-slider-fill" />
            <Slider.Thumb className="ps-slider-thumb" aria-label={label} />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <span className="ps-value">{format(value)}</span>
    </div>
  );
}

function Importer({ onOpen }: { onOpen: (film: Film) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Section title="Open JSON">
      <textarea
        className="ps-input ps-code"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a film"
        spellCheck={false}
        aria-label="Film JSON"
      />
      {error && <p className="ps-error">{error}</p>}
      <button
        type="button"
        className="ps-button ps-quiet"
        disabled={!text.trim()}
        onClick={() => {
          try {
            const result = validateFilm(JSON.parse(text));
            if ("error" in result) return setError(result.error);
            setError(null);
            setText("");
            onOpen(result.film);
          } catch {
            setError("That isn't valid JSON.");
          }
        }}
      >
        Open
      </button>
    </Section>
  );
}
