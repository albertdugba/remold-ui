"use client";

import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./visitors-globe.css";

const CITIES = [
  { name: "San Francisco", lat: 37.8, lon: -122.4, now: 64 },
  { name: "Mexico City", lat: 19.4, lon: -99.1, now: 31 },
  { name: "Toronto", lat: 43.7, lon: -79.4, now: 27 },
  { name: "New York", lat: 40.7, lon: -74, now: 88 },
  { name: "São Paulo", lat: -23.5, lon: -46.6, now: 42 },
  { name: "Lisbon", lat: 38.7, lon: -9.1, now: 18 },
  { name: "London", lat: 51.5, lon: -0.1, now: 73 },
  { name: "Accra", lat: 5.6, lon: -0.2, now: 22 },
  { name: "Lagos", lat: 6.5, lon: 3.4, now: 38 },
  { name: "Berlin", lat: 52.5, lon: 13.4, now: 46 },
  { name: "Cape Town", lat: -33.9, lon: 18.4, now: 14 },
  { name: "Nairobi", lat: -1.3, lon: 36.8, now: 19 },
  { name: "Dubai", lat: 25.2, lon: 55.3, now: 25 },
  { name: "Mumbai", lat: 19.1, lon: 72.9, now: 57 },
  { name: "Singapore", lat: 1.35, lon: 103.8, now: 33 },
  { name: "Seoul", lat: 37.6, lon: 127, now: 29 },
  { name: "Tokyo", lat: 35.7, lon: 139.7, now: 61 },
  { name: "Sydney", lat: -33.9, lon: 151.2, now: 36 },
  { name: "Auckland", lat: -36.8, lon: 174.8, now: 12 },
  { name: "Honolulu", lat: 21.3, lon: -157.9, now: 9 },
];

const KINDS = {
  join: { color: "#4ade80", verbs: ["New signup in", "New trial in"] },
  paid: { color: "#fbbf24", verbs: ["Pro upgrade in", "Lifetime plan in"] },
  invite: { color: "#a78bfa", verbs: ["Invite from"] },
} as const;

type Kind = keyof typeof KINDS;

const SEQUENCE: Kind[] = ["join", "invite", "paid", "join", "invite", "join", "paid", "invite"];
const BEAT_MS = 2400;
const BEATS = Array.from({ length: 12 }, () => ({ ms: BEAT_MS }));
const VISITORS = [1284, 1291, 1287, 1302, 1298, 1311, 1306, 1319, 1313, 1301, 1295, 1288];
const START = -20;
const ORDER = CITIES.map((city, index) => ({ i: index, lon: (city.lon - START - 30 + 720) % 360 }))
  .sort((a, b) => a.lon - b.lon)
  .map(({ i }) => i);
const MARKERS = CITIES.filter((city) => city.now >= 40).map((city) => ({ ...city, size: 1.5, color: "#5b6b99" }));
const COLORS = { land: "#8ea2d6", sphere: "#0b1430", glow: "#3157d6", accent: "#4ade80", arc: KINDS.invite.color };

type Visit = { id: number; kind: Kind; city: number; to?: number };

const visit = (id: number): Visit => {
  const kind = SEQUENCE[id % SEQUENCE.length]!;
  const city = ORDER[id % ORDER.length]!;
  return { id, kind, city, to: kind === "invite" ? ORDER[(id + ORDER.length - 3) % ORDER.length] : undefined };
};

export function VisitorsGlobeDemo({ playing }: { playing?: boolean }) {
  const scene = useScene(BEATS, (step) => step, playing);
  const [feed, setFeed] = useState<Visit[]>(() => [visit(2), visit(1), visit(0)]);

  useEffect(() => {
    if (scene.step === 0) return;
    setFeed((items) => [visit(items[0]!.id + 1), ...items].slice(0, 4));
  }, [scene.step]);

  const latest = feed[0]!;
  const kind = KINDS[latest.kind];
  const visitors = VISITORS[scene.step % VISITORS.length]!;

  return (
    <MotionConfig reducedMotion="user">
      <div className="vg" ref={scene.ref}>
        <div className="vg-head">
          <div className="vg-title" role="heading" aria-level={3}>
            Live visitors
          </div>
          <span className="vg-live">
            <span className="vg-beacon" aria-hidden="true" />
            Live
          </span>
        </div>

        <div className="vg-count">
          <Odometer className="vg-number" value={visitors.toLocaleString("en-US")} />
          <span className="vg-unit">on the site right now</span>
        </div>

        <div className="vg-globe" data-rm-autoplay-control="">
          <Remold.Globe
            className="vg-canvas"
            start={START}
            tilt={-12}
            scale={0.8}
            colors={COLORS}
            markers={MARKERS}
            label="Globe showing where visitors are right now"
            pulses={feed
              .filter((v) => v.kind !== "invite")
              .map((v) => ({ id: v.id, color: KINDS[v.kind].color, ...CITIES[v.city]! }))}
            arcs={feed
              .filter((v) => v.kind === "invite")
              .map((v) => ({ id: v.id, from: CITIES[v.city]!, to: CITIES[v.to!]! }))}
          />
        </div>

        <div className="vg-toast-slot" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={latest.id}
              className="vg-toast"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.2 } }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
            >
              <span className="vg-dot" style={{ background: kind.color }} aria-hidden="true" />
              <span className="vg-what">
                {kind.verbs[latest.id % kind.verbs.length]} <b>{CITIES[latest.city]!.name}</b>
                {latest.to !== undefined && (
                  <>
                    {" "}to <b>{CITIES[latest.to]!.name}</b>
                  </>
                )}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="vg-legend" aria-hidden="true">
          <span><i style={{ background: KINDS.join.color }} />Signups</span>
          <span><i style={{ background: KINDS.paid.color }} />Upgrades</span>
          <span><i style={{ background: KINDS.invite.color }} />Invites</span>
        </div>
      </div>
    </MotionConfig>
  );
}
