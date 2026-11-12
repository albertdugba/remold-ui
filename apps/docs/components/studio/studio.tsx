"use client";
import { DAY_STAGE } from "../demos/day-stage";
import { NIGHT_STAGE } from "../demos/night-stage";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowDown01Icon, Delete02Icon, Download01Icon, Layers01Icon, PauseIcon, PlayIcon, Redo02Icon, CheckIcon, Undo02Icon } from "@hugeicons/core-free-icons";
import { Menu } from "@base-ui/react/menu";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { Tabs } from "@base-ui/react/tabs";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Remold } from "@remold-ui/react/canvas";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PALETTES, resolvePoses, sceneKey, toSceneProps, validateDocument, type PaletteName, type Pose, type SceneDocument } from "./document";
import { addStep, removeStep, setMotion, setPose, updateDocument, updateObject, updateStep, type Scope } from "./edit";
import { toJSON, toReact } from "./export";
import { TEMPLATES } from "./templates";
import { useHistory } from "./use-history";
import "./studio.css";

const STORAGE_KEY = "remold-studio:document";

/** The last document you worked on, if this browser kept it and it still opens. */
function stored(): SceneDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = validateDocument(JSON.parse(raw));
    return "doc" in result ? result.doc : null;
  } catch {
    return null;
  }
}

const FEELS = {
  calm: { duration: 1.1, bounce: 0.08 },
  snappy: { duration: 0.6, bounce: 0.12 },
  bouncy: { duration: 0.85, bounce: 0.3 },
} as const;
type Feel = keyof typeof FEELS;
const feelOf = (f: SceneDocument["feel"]): Feel | null =>
  (Object.keys(FEELS) as Feel[]).find((k) => FEELS[k].duration === f.duration && FEELS[k].bounce === f.bounce) ?? null;

export function Studio() {
  const history = useHistory<SceneDocument>(() => TEMPLATES[0]!);
  const doc = history.value;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("until");
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState("step");

  /** Pick an object (or none); the inspector turns to it. */
  const pick = (id: string | null) => {
    setSelected(id);
    if (id) setTab("object");
  };

  // Open where you left off, after the first paint so the server and client agree.
  useEffect(() => {
    const saved = stored();
    if (saved) history.reset(saved);
  }, [history.reset]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      // Private windows and full storage: the studio still works, it just won't remember.
    }
  }, [doc]);

  // Keep the step and selection valid as steps and objects come and go.
  const at = Math.min(step, doc.steps.length - 1);
  const current = doc.steps[at]!;
  const object = doc.objects.find((o) => o.id === selected) ?? null;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setStep((s) => (Math.min(s, doc.steps.length - 1) + 1) % doc.steps.length), current.ms);
    return () => clearTimeout(t);
  }, [playing, at, current.ms, doc.steps.length]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(t);
  }, [notice]);

  // ⌘Z and ⇧⌘Z, except while typing, where the field's own undo is what you want.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]");
      if (typing || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) history.redo();
      else history.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history.undo, history.redo]);

  const key = useMemo(() => sceneKey(doc), [doc]);
  // Rebuilt only when the scene itself changes, not when you type in a card.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sceneProps = useMemo(() => toSceneProps(doc), [key]);

  const edit = (next: SceneDocument, foldKey?: string) => {
    setPlaying(false);
    history.set(next, foldKey);
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${what} copied`);
    } catch {
      setNotice("Couldn't reach the clipboard");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([toJSON(doc)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "scene"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="st">
      <header className="st-bar">
        <TemplatePicker
          title={doc.title}
          onPick={(t) => {
            edit(t);
            setStep(0);
            setSelected(null);
          }}
        />
        <input className="st-title" value={doc.title} aria-label="Title" onChange={(e) => edit(updateDocument(doc, { title: e.target.value }), "title")} />
        <span className="st-spacer" />
        <button type="button" className="st-icon" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo">
          <HugeiconsIcon icon={Undo02Icon} />
        </button>
        <button type="button" className="st-icon" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo">
          <HugeiconsIcon icon={Redo02Icon} />
        </button>
        <Menu.Root modal={false}>
          <Menu.Trigger className="st-primary">
            Export
            <HugeiconsIcon icon={ArrowDown01Icon} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="st-layer" align="end" sideOffset={6}>
              <Menu.Popup className="st-menu">
                <Menu.Item className="st-menu-item" onClick={() => copy(toReact(doc), "React component")}>
                  Copy React component
                </Menu.Item>
                <Menu.Item className="st-menu-item" onClick={() => copy(toJSON(doc), "JSON")}>
                  Copy JSON
                </Menu.Item>
                <Menu.Item className="st-menu-item" onClick={download}>
                  Download JSON
                  <HugeiconsIcon icon={Download01Icon} />
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </header>

      <div className="st-body">
        <aside className="st-panel st-layers" aria-label="Objects">
          <p className="st-heading">
            <HugeiconsIcon icon={Layers01Icon} aria-hidden="true" /> Objects
          </p>
          <ul>
            {doc.objects.map((o) => (
              <li key={o.id}>
                <button type="button" className="st-layer-row" data-active={o.id === selected || undefined} onClick={() => pick(o.id === selected ? null : o.id)}>
                  <span className="st-swatch" style={{ background: PALETTES[o.palette].sides[1] }} aria-hidden="true" />
                  <span className="st-layer-name">{o.name}</span>
                  {o.scenery && <span className="st-tag">scenery</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="st-center">
          <div className={`${doc.stage === "night" ? NIGHT_STAGE : DAY_STAGE} st-stage`} data-stage={doc.stage}>
            <Remold.Scene
              key={key}
              className="st-scene"
              label={doc.title}
              {...sceneProps}
              layout={current.id}
              focused={object && !object.scenery ? object.id : null}
              onFocusedChange={(id) => id && pick(id)}
              interact={{ drag: false }}
            />
            {current.overlay && (
              <div className="st-chip" role="status">
                <span className="st-chip-mark" style={{ background: current.overlay.tint ?? "#f4efe6" }} aria-hidden="true">
                  {current.overlay.mark}
                </span>
                <span className="st-chip-copy">
                  <span>{current.overlay.detail}</span>
                  <b>{current.overlay.title}</b>
                </span>
              </div>
            )}
            {doc.footer && <p className="st-footer">{doc.footer}</p>}
          </div>

          <div className="st-timeline" role="toolbar" aria-label="Steps">
            <button type="button" className="st-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <HugeiconsIcon icon={PauseIcon} /> : <HugeiconsIcon icon={PlayIcon} />}
            </button>
            <ol className="st-steps">
              {doc.steps.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="st-step"
                    data-active={i === at || undefined}
                    onClick={() => {
                      setPlaying(false);
                      setStep(i);
                    }}
                  >
                    <span className="st-step-n">{i + 1}</span>
                    {s.name}
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="st-icon"
              aria-label="Add a step after this one"
              onClick={() => {
                const added = addStep(doc, at);
                edit(added.doc);
                setStep(added.index);
              }}
            >
              <HugeiconsIcon icon={Add01Icon} />
            </button>
            <button
              type="button"
              className="st-icon"
              aria-label="Remove this step"
              disabled={doc.steps.length <= 1}
              onClick={() => {
                edit(removeStep(doc, at));
                setStep(Math.max(0, at - 1));
              }}
            >
              <HugeiconsIcon icon={Delete02Icon} />
            </button>
          </div>
        </section>

        <aside className="st-panel st-inspector" aria-label="Inspector">
          <Tabs.Root value={tab} onValueChange={(v) => setTab(String(v))}>
            <Tabs.List className="st-tabs">
              <Tabs.Tab value="step" className="st-tab">
                Step
              </Tabs.Tab>
              <Tabs.Tab value="object" className="st-tab">
                Object
              </Tabs.Tab>
              <Tabs.Tab value="scene" className="st-tab">
                Scene
              </Tabs.Tab>
              <Tabs.Indicator className="st-tab-indicator" />
            </Tabs.List>

            <Tabs.Panel value="step" className="st-fields">
              <Row label="Name">
                <input className="st-input" value={current.name} onChange={(e) => edit(updateStep(doc, at, { name: e.target.value }), `name:${at}`)} />
              </Row>
              <Range label="Holds for" value={current.ms} min={300} max={5000} step={100} format={(v) => `${(v / 1000).toFixed(1)}s`} onChange={(v) => edit(updateStep(doc, at, { ms: v }), `ms:${at}`)} />
              <p className="st-heading">Card</p>
              {current.overlay ? (
                <>
                  <Row label="Title">
                    <input className="st-input" value={current.overlay.title} onChange={(e) => edit(updateStep(doc, at, { overlay: { ...current.overlay!, title: e.target.value } }), `ot:${at}`)} />
                  </Row>
                  <Row label="Detail">
                    <input className="st-input" value={current.overlay.detail} onChange={(e) => edit(updateStep(doc, at, { overlay: { ...current.overlay!, detail: e.target.value } }), `od:${at}`)} />
                  </Row>
                  <Row label="Icon">
                    <input className="st-input st-short" value={current.overlay.mark} onChange={(e) => edit(updateStep(doc, at, { overlay: { ...current.overlay!, mark: e.target.value } }), `om:${at}`)} />
                    <input
                      type="color"
                      className="st-color"
                      aria-label="Icon background"
                      value={current.overlay.tint ?? "#f4efe6"}
                      onChange={(e) => edit(updateStep(doc, at, { overlay: { ...current.overlay!, tint: e.target.value } }), `oc:${at}`)}
                    />
                  </Row>
                  <button type="button" className="st-link" onClick={() => edit(updateStep(doc, at, { overlay: undefined }))}>
                    Remove the card from this step
                  </button>
                </>
              ) : (
                <button type="button" className="st-link" onClick={() => edit(updateStep(doc, at, { overlay: { mark: "✨", title: "Something happened", detail: "A detail" } }))}>
                  Add a card to this step
                </button>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="object" className="st-fields">
              {object ? (
                <ObjectFields
                  doc={doc}
                  at={at}
                  id={object.id}
                  scope={scope}
                  onScope={setScope}
                  onEdit={edit}
                />
              ) : (
                <p className="st-empty">Pick an object on the stage, or in the list, to change it.</p>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="scene" className="st-fields">
              <Row label="Stage">
                <Choice
                  value={doc.stage}
                  options={[
                    { value: "day", label: "Day" },
                    { value: "night", label: "Night" },
                  ]}
                  onChange={(v) => edit(updateDocument(doc, { stage: v as SceneDocument["stage"] }))}
                />
              </Row>
              <Row label="Feel">
                <Choice
                  value={feelOf(doc.feel) ?? ""}
                  options={[
                    { value: "calm", label: "Calm" },
                    { value: "snappy", label: "Snappy" },
                    { value: "bouncy", label: "Bouncy" },
                  ]}
                  onChange={(v) => edit(updateDocument(doc, { feel: FEELS[v as Feel] }))}
                />
              </Row>
              <Range label="Zoom" value={doc.camera.zoom} min={0.6} max={2.4} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => edit(updateDocument(doc, { camera: { ...doc.camera, zoom: v } }), "zoom")} />
              <Row label="Footer">
                <input className="st-input" value={doc.footer ?? ""} onChange={(e) => edit(updateDocument(doc, { footer: e.target.value || undefined }), "footer")} />
              </Row>
              <Importer
                onOpen={(next) => {
                  edit(next);
                  setStep(0);
                  setSelected(null);
                  setNotice("Opened");
                }}
              />
            </Tabs.Panel>
          </Tabs.Root>
        </aside>
      </div>

      {notice && (
        <p className="st-notice" role="status">
          <HugeiconsIcon icon={CheckIcon} aria-hidden="true" /> {notice}
        </p>
      )}
    </div>
  );
}

/** Where an object sits at this step, what it looks like, and how it moves in. */
function ObjectFields({
  doc,
  at,
  id,
  scope,
  onScope,
  onEdit,
}: {
  doc: SceneDocument;
  at: number;
  id: string;
  scope: Scope;
  onScope: (s: Scope) => void;
  onEdit: (next: SceneDocument, foldKey?: string) => void;
}) {
  const object = doc.objects.find((o) => o.id === id)!;
  const pose = resolvePoses(doc, at)[id] ?? {};
  const motion = doc.steps[at]!.motion?.[id] ?? {};
  const changed = Object.keys(doc.steps[at]!.pose[id] ?? {});
  const pose$ = (change: Pose, field: string) => onEdit(setPose(doc, at, id, change, scope), `pose:${at}:${id}:${field}`);

  return (
    <>
      <Row label="Name">
        <input className="st-input" value={object.name} onChange={(e) => onEdit(updateObject(doc, id, { name: e.target.value }), `oname:${id}`)} />
      </Row>
      <Row label="Label">
        <input
          className="st-input"
          value={object.look.decal?.text ?? ""}
          placeholder="Text on top"
          onChange={(e) => onEdit(updateObject(doc, id, { look: { decal: { ...object.look.decal, text: e.target.value } } }), `odecal:${id}`)}
        />
      </Row>
      <Row label="Colour">
        <PalettePicker value={object.palette} onChange={(p) => onEdit(updateObject(doc, id, { palette: p }))} />
      </Row>

      <p className="st-heading">
        At this step
        {changed.length > 0 && <span className="st-tag">{changed.length} changed here</span>}
      </p>
      <Row label="Applies">
        <Choice
          value={scope}
          options={[
            { value: "until", label: "Until next change" },
            { value: "step", label: "This step only" },
          ]}
          onChange={(v) => onScope(v as Scope)}
        />
      </Row>
      <div className="st-grid">
        {(["x", "y", "z", "width", "depth", "height"] as const).map((field) => (
          <Num key={field} label={field === "width" ? "W" : field === "depth" ? "D" : field === "height" ? "H" : field.toUpperCase()} value={pose[field] ?? 0} onChange={(v) => pose$({ [field]: v }, field)} />
        ))}
      </div>
      <Range label="Fill" value={pose.fill ?? 0} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => pose$({ fill: v }, "fill")} />
      <Range label="Wireframe" value={pose.ghost ?? 0} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => pose$({ ghost: v }, "ghost")} />
      <Range label="Visible" value={pose.opacity ?? 1} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => pose$({ opacity: v }, "opacity")} />
      <Row label="Fill colour">
        <input type="color" className="st-color" value={pose.color ?? "#ffd166"} onChange={(e) => pose$({ color: e.target.value }, "color")} aria-label="Fill colour" />
      </Row>

      <p className="st-heading">Moving into this step</p>
      <Range label="Hop" value={motion.arc ?? 0} min={0} max={140} step={5} format={(v) => (v ? `${v}` : "none")} onChange={(v) => onEdit(setMotion(doc, at, id, { arc: v }), `arc:${at}:${id}`)} />
      <Range label="Wait" value={motion.delay ?? 0} min={0} max={1.5} step={0.05} format={(v) => (v ? `${v.toFixed(2)}s` : "none")} onChange={(v) => onEdit(setMotion(doc, at, id, { delay: v }), `delay:${at}:${id}`)} />
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="st-row">
      <span className="st-label">{label}</span>
      <span className="st-control">{children}</span>
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <NumberField.Root className="st-num" value={Math.round(value)} step={1} largeStep={10} onValueChange={(v) => v !== null && onChange(v)}>
      <NumberField.ScrubArea className="st-num-label">
        <label>{label}</label>
      </NumberField.ScrubArea>
      <NumberField.Input className="st-num-input" aria-label={label} />
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
    <div className="st-row">
      <span className="st-label">{label}</span>
      <Slider.Root className="st-slider" value={value} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? v[0]! : v)}>
        <Slider.Control className="st-slider-control">
          <Slider.Track className="st-slider-track">
            <Slider.Indicator className="st-slider-fill" />
            <Slider.Thumb className="st-slider-thumb" aria-label={label} />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <span className="st-value">{format(value)}</span>
    </div>
  );
}

function Choice({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <ToggleGroup className="st-choice" value={[value]} onValueChange={(v) => v[0] && onChange(v[0])}>
      {options.map((o) => (
        <Toggle key={o.value} value={o.value} className="st-choice-item">
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];

function PalettePicker({ value, onChange }: { value: PaletteName; onChange: (p: PaletteName) => void }) {
  return (
    <div className="st-palettes" role="radiogroup" aria-label="Colour">
      {PALETTE_NAMES.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={p === value}
          aria-label={p}
          className="st-palette"
          style={{ background: `linear-gradient(135deg, ${PALETTES[p].top} 0 45%, ${PALETTES[p].sides[1]} 45%)` }}
          onClick={() => onChange(p)}
        />
      ))}
    </div>
  );
}

function TemplatePicker({ title, onPick }: { title: string; onPick: (t: SceneDocument) => void }) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className="st-ghost">
        Templates
        <HugeiconsIcon icon={ArrowDown01Icon} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="st-layer" align="start" sideOffset={6}>
          <Menu.Popup className="st-menu">
            {TEMPLATES.map((t) => (
              <Menu.Item key={t.title} className="st-menu-item" onClick={() => onPick(t)}>
                {t.title}
                {t.title === title && <HugeiconsIcon icon={CheckIcon} />}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Paste a document's JSON to open it. */
function Importer({ onOpen }: { onOpen: (doc: SceneDocument) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="st-import">
      <p className="st-heading">Open JSON</p>
      <textarea className="st-input st-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a scene document" spellCheck={false} />
      {error && <p className="st-error">{error}</p>}
      <button
        type="button"
        className="st-ghost"
        disabled={!text.trim()}
        onClick={() => {
          try {
            const result = validateDocument(JSON.parse(text));
            if ("error" in result) return setError(result.error);
            setError(null);
            setText("");
            onOpen(result.doc);
          } catch {
            setError("That isn't valid JSON.");
          }
        }}
      >
        Open
      </button>
    </div>
  );
}
