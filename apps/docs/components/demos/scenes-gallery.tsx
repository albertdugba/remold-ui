"use client";
/**
 * Four diagrams in one stage. Pick a diagram, then one of its layouts: every object, link and the
 * camera spring to the new arrangement. Tap an object to lift it; drag sideways to turn the scene.
 */
import { Remold } from "@remold-ui/react";
import { useEffect, useMemo, useState } from "react";
import { architecture, database, edge, integrations, type Diagram } from "./diagrams";
import "./gallery.css";

const DIAGRAMS: { key: string; name: string; diagram: Diagram }[] = [
  { key: "architecture", name: "Architecture", diagram: architecture },
  { key: "integrations", name: "Integrations", diagram: integrations },
  { key: "database", name: "Database", diagram: database },
  { key: "edge", name: "Edge network", diagram: edge },
];

/** The layouts were drawn for a smaller stage; bring the isometric cameras in a step. */
const STAGE_ZOOM = 1.3;
const staged = (d: Diagram): Diagram => ({
  ...d,
  layouts: Object.fromEntries(
    Object.entries(d.layouts).map(([name, layout]) => [
      name,
      layout.camera === "fit" ? layout : { ...layout, camera: { ...layout.camera, zoom: (layout.camera?.zoom ?? 1) * STAGE_ZOOM } },
    ]),
  ),
});

/** `layoutStep` steps the current diagram's layouts from outside (it wraps round); leave it out to use the buttons only. */
export function ScenesGalleryDemo({ layoutStep }: { layoutStep?: number } = {}) {
  const [which, setWhich] = useState(DIAGRAMS[0]!.key);
  const diagram = useMemo(() => staged(DIAGRAMS.find((d) => d.key === which)!.diagram), [which]);
  const layouts = Object.keys(diagram.layouts);
  const [layout, setLayout] = useState(layouts[0]!);
  useEffect(() => {
    if (layoutStep === undefined) return;
    setLayout(layouts[layoutStep % layouts.length]!);
    setFocused(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutStep]);
  const [focused, setFocused] = useState<string | null>(null);
  const shown = diagram.layouts[layout] ? layout : layouts[0]!;
  const object = focused ? diagram.objects[focused] : undefined;

  return (
    <div className="gx not-prose">
      <Remold.Scene
        // A new diagram is a new scene; layouts within one diagram spring.
        key={which}
        className="gx-canvas"
        label={diagram.label}
        objects={diagram.objects}
        layouts={diagram.layouts}
        links={diagram.links}
        palette={diagram.palette}
        layout={shown}
        focused={focused}
        onFocusedChange={setFocused}
      />
      <div className="gx-ui">
        <div className="gx-seg" role="group" aria-label="Diagram">
          {DIAGRAMS.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={which === d.key}
              onClick={() => {
                setWhich(d.key);
                setLayout(Object.keys(d.diagram.layouts)[0]!);
                setFocused(null);
              }}
            >
              {d.name}
            </button>
          ))}
        </div>
        <div className="gx-seg quiet" role="group" aria-label="Layout">
          {layouts.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={shown === l}
              onClick={() => {
                setLayout(l);
                setFocused(null);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="gx-info" aria-live="polite">
        {object ? (
          <>
            <b>{object.label}.</b> {object.description}
          </>
        ) : (
          <>
            <b>{shown}.</b> {diagram.layouts[shown]?.caption}{" "}
            <span className="gx-hint">Hover to lift a piece, click to focus it, drag to turn the scene.</span>
          </>
        )}
      </p>
    </div>
  );
}
