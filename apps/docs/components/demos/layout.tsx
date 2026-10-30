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
              {PEOPLE.map((person) => (
                <motion.div layout layoutId={person.name} key={person.name} className="rm-person card">
                  <span
                    className="rm-avatar large"
                    style={{ background: `hsl(${person.hue} 70% 62%)` }}
                    aria-hidden="true"
                  />
                  <strong>{person.name}</strong>
                  <span>{person.role}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <ul className="rm-people-list">
              {PEOPLE.map((person) => (
                <motion.li layout layoutId={person.name} key={person.name} className="rm-person row">
                  <span
                    className="rm-avatar"
                    style={{ background: `hsl(${person.hue} 70% 62%)` }}
                    aria-hidden="true"
                  />
                  <strong>{person.name}</strong>
                  <span>{person.role}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </LayoutGroup>
      </div>
    </Frame>
  );
}
