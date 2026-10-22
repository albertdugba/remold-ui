"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame, Segmented } from "./frame";
import "./layout.css";

const PEOPLE = [
  { name: "Ada Okafor", role: "Design", hue: 210 },
  { name: "Ben Lindqvist", role: "Engineering", hue: 150 },
  { name: "Chloé Martin", role: "Product", hue: 30 },
  { name: "Dev Patel", role: "Engineering", hue: 280 },
];

/** The same people as a grid or a list: two different layouts, rendered by different markup. */
export function LayoutDemo() {
  const [view, setView] = useState<"Grid" | "List">("Grid");
  return (
    <Frame>
      <div className="rm-people">
        <Segmented label="View" value={view} onChange={setView} options={["Grid", "List"] as const} />
        <Remold.Layout trigger={view}>
          {view === "Grid" ? (
            <div className="rm-people-grid">
              {PEOPLE.map((p) => (
                <div key={p.name} className="rm-person card">
                  <span className="rm-avatar large" style={{ background: `hsl(${p.hue} 70% 62%)` }} aria-hidden="true" />
                  <strong>{p.name}</strong>
                  <span>{p.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <ul className="rm-people-list">
              {PEOPLE.map((p) => (
                <li key={p.name} className="rm-person row">
                  <span className="rm-avatar" style={{ background: `hsl(${p.hue} 70% 62%)` }} aria-hidden="true" />
                  <strong>{p.name}</strong>
                  <span>{p.role}</span>
                </li>
              ))}
            </ul>
          )}
        </Remold.Layout>
      </div>
    </Frame>
  );
}
