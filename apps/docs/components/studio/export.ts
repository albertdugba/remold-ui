/**
 * Turns a scene document into something to take away: the document itself as JSON, or a React
 * component that plays it with nothing but `@remold-ui/react` and `@remold-ui/canvas`.
 */
import { linksOf, lookOptions, PALETTES, resolveLayouts, type SceneDocument } from "./document";

export const toJSON = (doc: SceneDocument) => JSON.stringify(doc, null, 2);

/** A component name from the title: "Food delivery" → "FoodDelivery". */
export function componentName(title: string): string {
  const name = title
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("");
  return /^[A-Z]/.test(name) ? name : `Scene${name}`;
}

const literal = (value: unknown) => JSON.stringify(value, null, 2);

export function toReact(doc: SceneDocument): string {
  const name = componentName(doc.title);
  const used = [...new Set(doc.objects.map((o) => o.palette)), doc.stage === "night" ? "night" : "paper"] as (keyof typeof PALETTES)[];
  const palettes = Object.fromEntries([...new Set(used)].map((p) => [p, PALETTES[p]]));
  const objects = doc.objects
    .map(
      (o) =>
        `  ${JSON.stringify(o.id)}: { look: extrude(${JSON.stringify(lookOptions(o))}), label: ${JSON.stringify(o.name)}, palette: PALETTES.${o.palette}, interactive: ${!o.scenery} },`,
    )
    .join("\n");
  const steps = doc.steps.map((s) => ({ id: s.id, ms: s.ms, overlay: s.overlay ?? null }));

  return `"use client";
// ${doc.title}: made in the Remold studio.
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react/canvas";
import { useEffect, useState } from "react";

type SceneProps = Remold.Scene.Props;

const PALETTES = ${literal(palettes)} as const;

const OBJECTS: SceneProps["objects"] = {
${objects}
};

const LAYOUTS: SceneProps["layouts"] = ${literal(resolveLayouts(doc))};

const LINKS: NonNullable<SceneProps["links"]> = ${literal(linksOf(doc))};

const STEPS = ${literal(steps)};

export function ${name}() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEPS[step]!.ms);
    return () => clearTimeout(timer);
  }, [step]);
  const overlay = STEPS[step]!.overlay;

  return (
    <div style={{ position: "relative" }}>
      <Remold.Scene
        label=${JSON.stringify(doc.title)}
        objects={OBJECTS}
        layouts={LAYOUTS}
        links={LINKS}
        layout={STEPS[step]!.id}
        palette={PALETTES.${doc.stage === "night" ? "night" : "paper"}}
        spring={${JSON.stringify(doc.feel)}}
        interact={{ drag: false }}
        style={{ display: "block", width: "100%", height: 460 }}
      />
      {overlay && (
        <div role="status" style={{ position: "absolute", top: 20, left: "50%", translate: "-50% 0", display: "flex", gap: 10, alignItems: "center", padding: "8px 14px 8px 8px", borderRadius: 14, background: "rgb(255 255 255 / 0.9)", boxShadow: "0 10px 26px -12px rgb(0 0 0 / 0.3)", fontSize: 13 }}>
          <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 10, background: overlay.tint ?? "#f4efe6" }}>{overlay.mark}</span>
          <span style={{ display: "grid" }}>
            <span style={{ color: "#8a7f70", fontSize: 11.5 }}>{overlay.detail}</span>
            <b>{overlay.title}</b>
          </span>
        </div>
      )}
    </div>
  );
}
`;
}
