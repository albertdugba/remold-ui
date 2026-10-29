"use client";
import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { Frame, Segmented } from "./frame";
import "./layout.css";

const PEOPLE = [
  { name: "Adjoa Tetteh", role: "Design", hue: 210 },
  { name: "Kwabena Frimpong", role: "Engineering", hue: 150 },
  { name: "Chloé Martin", role: "Product", hue: 30 },
  { name: "Selorm Agbeko", role: "Engineering", hue: 280 },
];

export function LayoutDemo() {
  const [view, setView] = useState<"Grid" | "List">("Grid");
  return (
    <Frame>
      <div className="rm-people">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={["Grid", "List"] as const}
        />
        <LayoutGroup id="people-layout">
          {view === "Grid" ? (
            <div className="rm-people-grid">
              {PEOPLE.map((p) => (
                <motion.div layout layoutId={p.name} key={p.name} className="rm-person card">
                  <span
                    className="rm-avatar large"
                    style={{ background: `hsl(${p.hue} 70% 62%)` }}
                    aria-hidden="true"
                  />
                  <strong>{p.name}</strong>
                  <span>{p.role}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <ul className="rm-people-list">
              {PEOPLE.map((p) => (
                <motion.li layout layoutId={p.name} key={p.name} className="rm-person row">
                  <span
                    className="rm-avatar"
                    style={{ background: `hsl(${p.hue} 70% 62%)` }}
                    aria-hidden="true"
                  />
                  <strong>{p.name}</strong>
                  <span>{p.role}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </LayoutGroup>
      </div>
    </Frame>
  );
}
