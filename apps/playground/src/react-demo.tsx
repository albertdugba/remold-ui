/**
 * The React adapter in use: a list you can sort and filter (every item gets a new key on each
 * change, so React rebuilds them and Remold still matches them), a morphing status, and
 * a canvas scene driven by a prop.
 */
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { createRoot } from "react-dom/client";

const FRUIT = [
  { name: "Apricot", price: 4 },
  { name: "Blueberry", price: 7 },
  { name: "Cherry", price: 9 },
  { name: "Damson", price: 3 },
  { name: "Elderberry", price: 6 },
];

const objects = {
  a: { look: "chip" as const, label: "a" },
  b: { look: "chip" as const, label: "b" },
  c: { look: "chip" as const, label: "c" },
};
const row = (i: number) => ({ x: -220 + i * 160, y: -40, width: 120, depth: 80 });
const layouts = {
  Row: { objects: { a: row(0), b: row(1), c: row(2) } },
  Stack: { objects: { a: { ...row(1), z: 0 }, b: { ...row(1), z: 40 }, c: { ...row(1), z: 80 } } },
};

function Demo() {
  const [sort, setSort] = useState<"name" | "price">("name");
  const [cheapOnly, setCheapOnly] = useState(false);
  const [layout, setLayout] = useState<keyof typeof layouts>("Row");
  const items = FRUIT.filter((f) => !cheapOnly || f.price < 6).sort((x, y) =>
    sort === "name" ? x.name.localeCompare(y.name) : x.price - y.price,
  );
  const trigger = `${sort}-${cheapOnly}`;
  const status = cheapOnly ? "Showing cheap fruit" : sort === "name" ? "Sorted by name" : "Sorted by price";

  return (
    <div className="react-demo">
      <div className="row">
        <button type="button" onClick={() => setSort(sort === "name" ? "price" : "name")}>
          Sort by {sort === "name" ? "price" : "name"}
        </button>
        <label>
          <input type="checkbox" checked={cheapOnly} onChange={(e) => setCheapOnly(e.target.checked)} /> Under 6
        </label>
        <span className="status-pill">
          <Remold.Text>{status}</Remold.Text>
        </span>
      </div>
      <Remold.Layout trigger={trigger} className="fruit" announce>
        {items.map((f) => (
          <div key={`${f.name}-${trigger}`} className="task">
            <span className="task-title">{f.name}</span>
            <span className="who">{f.price}</span>
          </div>
        ))}
      </Remold.Layout>
      <div className="row">
        {Object.keys(layouts).map((name) => (
          <button key={name} type="button" aria-pressed={layout === name} onClick={() => setLayout(name as keyof typeof layouts)}>
            {name}
          </button>
        ))}
      </div>
      <Remold.Scene
        className="scene-canvas short"
        label="Three chips"
        palette="teal"
        layout={layout}
        objects={objects}
        layouts={layouts}
      />
    </div>
  );
}

export function setUpReactDemo() {
  createRoot(document.getElementById("react-demo")!).render(<Demo />);
}
