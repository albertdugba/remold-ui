/**
 * Product drop: a shop's hero where the product itself is made of dots. Switch product and the
 * dots rebuild into the next silhouette while the name and price change letter by letter; pick
 * a colourway and every dot recolours on its way. "Halden" and its products are made up, and
 * the silhouettes are simple shapes drawn for this page.
 */
import { particles, type Particles } from "@remold-ui/canvas";
import { samplePath, type CloudPoint } from "@remold-ui/core";
import { Remold } from "@remold-ui/react";
import { useEffect, useRef, useState } from "react";
import { useMotion } from "../motion";

const COLOURWAYS = [
  { name: "Graphite", colour: "#2b2d33" },
  { name: "Fog", colour: "#9aa3ad" },
  { name: "Ocean", colour: "#2563eb" },
  { name: "Ember", colour: "#e4572e" },
  { name: "Moss", colour: "#4d7c4a" },
  { name: "Sand", colour: "#c9a46c" },
] as const;
const PALETTE = COLOURWAYS.map((c) => c.colour);
const toneOf = (i: number) => i / (COLOURWAYS.length - 1);

/** Rounded rectangle path, clockwise; `hole` runs it the other way, to cut it out under the nonzero rule. */
const box = (x: number, y: number, w: number, h: number, r: number, hole = false) =>
  hole
    ? `M${x + r} ${y} A${r} ${r} 0 0 0 ${x} ${y + r} V${y + h - r} A${r} ${r} 0 0 0 ${x + r} ${y + h} H${x + w - r} A${r} ${r} 0 0 0 ${
        x + w
      } ${y + h - r} V${y + r} A${r} ${r} 0 0 0 ${x + w - r} ${y} Z`
    : `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${
        x + r
      } A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
/** Circle path, wound one way or the other (for holes under the nonzero rule). */
const circle = (cx: number, cy: number, r: number, hole = false) =>
  `M${cx - r} ${cy} A${r} ${r} 0 1 ${hole ? 0 : 1} ${cx + r} ${cy} A${r} ${r} 0 1 ${hole ? 0 : 1} ${cx - r} ${cy} Z`;

const PRODUCTS = [
  {
    name: "Halden One",
    kind: "Over-ear headphones",
    price: "$349",
    // A headband arc and two ear cups.
    path: `M14 58 A36 36 0 0 1 86 58 L78 58 A28 28 0 0 0 22 58 Z ${box(8, 50, 20, 38, 9)} ${box(72, 50, 20, 38, 9)}`,
    colourway: 0,
  },
  {
    name: "Halden Buds",
    kind: "Wireless earbuds",
    price: "$179",
    // A rounded case with a lid seam and a status light cut out.
    path: `${box(16, 26, 68, 52, 24)} ${box(20, 44, 60, 2.5, 1.2, true)} ${circle(50, 62, 2.4, true)}`,
    colourway: 2,
  },
  {
    name: "Halden Room",
    kind: "Smart speaker",
    price: "$249",
    // A tall body with a woofer and a tweeter cut out.
    path: `${box(28, 4, 44, 92, 12)} ${circle(50, 64, 15, true)} ${circle(50, 27, 7, true)}`,
    colourway: 3,
  },
  {
    name: "Halden Time",
    kind: "Smart watch",
    price: "$299",
    // Strap, case and crown.
    path: `${box(38, 2, 24, 96, 8)} ${box(26, 26, 48, 48, 14)} ${box(73, 44, 6, 12, 2)}`,
    colourway: 5,
  },
];

const DOTS = 2600;

function shape(product: number, colourway: number): CloudPoint[] {
  return samplePath(PRODUCTS[product]!.path, { count: DOTS }).map((p) => ({ ...p, tone: toneOf(colourway) }));
}

export function ProductDrop() {
  const { loop, reducedMotion } = useMotion();
  const [product, setProduct] = useState(0);
  const [colourway, setColourway] = useState<number>(PRODUCTS[0]!.colourway);
  const [driving, setDriving] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dots = useRef<Particles | null>(null);
  const item = PRODUCTS[product]!;
  const text = { loop, reducedMotion };

  useEffect(() => {
    dots.current = particles(canvas.current!, {
      points: shape(product, colourway),
      palette: PALETTE,
      radius: 1.9,
      padding: 36,
      spring: { duration: 0.95, bounce: 0.22 },
      pointer: { radius: 70, strength: 18 },
      label: `${item.name} in ${COLOURWAYS[colourway]!.name}`,
      reducedMotion,
      loop,
    });
    return () => dots.current?.destroy();
    // Created once; product and colour changes morph the same dots.
  }, [loop, reducedMotion]);

  useEffect(() => {
    dots.current?.to(shape(product, colourway), { label: `${PRODUCTS[product]!.name} in ${COLOURWAYS[colourway]!.name}` });
  }, [product, colourway]);

  // Shows each product in turn until someone takes over.
  useEffect(() => {
    if (driving) return;
    const timer = setInterval(() => {
      setProduct((p) => {
        const next = (p + 1) % PRODUCTS.length;
        setColourway(PRODUCTS[next]!.colourway);
        return next;
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [driving]);

  const go = (step: number) => {
    setDriving(true);
    const next = (product + step + PRODUCTS.length) % PRODUCTS.length;
    setProduct(next);
    setColourway(PRODUCTS[next]!.colourway);
  };

  return (
    <div className="pro-stage light drop">
      <canvas ref={canvas} className="drop-canvas" />
      <div className="drop-info">
        <p className="pro-eyebrow">Halden · New season</p>
        <Remold.Text className="drop-name" {...text}>
          {item.name}
        </Remold.Text>
        <Remold.Text className="drop-kind" {...text}>
          {item.kind}
        </Remold.Text>
        <Remold.Text className="drop-price" {...text}>
          {item.price}
        </Remold.Text>
        <div className="drop-swatches" role="group" aria-label="Colour">
          {COLOURWAYS.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className="drop-swatch"
              style={{ background: c.colour }}
              aria-label={c.name}
              aria-pressed={colourway === i}
              onClick={() => {
                setDriving(true);
                setColourway(i);
              }}
            />
          ))}
        </div>
        <Remold.Text className="drop-colour" {...text}>
          {COLOURWAYS[colourway]!.name}
        </Remold.Text>
        <div className="drop-actions">
          <button type="button" className="drop-arrow" aria-label="Previous product" onClick={() => go(-1)}>
            ‹
          </button>
          <button type="button" className="drop-buy">
            Add to bag
          </button>
          <button type="button" className="drop-arrow" aria-label="Next product" onClick={() => go(1)}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
