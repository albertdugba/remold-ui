/**
 * The stories the studio starts from, as scene documents. They're the home page's Savings goal
 * and Food delivery, rebuilt as data so every word, colour, place and step can be edited.
 */
import { DOCUMENT_VERSION, type Pose, type SceneDocument, type StudioObject } from "./document";

const JAR = "M50 4C76 4 96 24 96 50C96 76 76 96 50 96C24 96 4 76 4 50C4 24 24 4 50 4Z";
const SUITCASE = "M16 18H84Q96 18 96 30V84Q96 96 84 96H16Q4 96 4 84V30Q4 18 16 18Z";
const GOLD = "#ffd166";

/** A week tile, saved or not yet. */
const week = (i: number, saved: boolean): Pose => ({
  x: -170 + i * 78,
  y: 80,
  z: saved ? 30 : 16,
  width: 58,
  depth: 58,
  height: saved ? 12 : 6,
  fill: saved ? 1 : 0,
  color: GOLD,
});

const savingsGoal: SceneDocument = {
  version: DOCUMENT_VERSION,
  title: "Savings goal",
  stage: "day",
  camera: { zoom: 1.4, centerX: -40, centerY: -20 },
  feel: { duration: 0.85, bounce: 0.22 },
  objects: [
    { id: "table", name: "Table", palette: "paper", scenery: true, look: { radius: 0.1, shadow: true } },
    { id: "jar", name: "Lisbon trip fund", palette: "sky", look: { shape: { path: JAR }, glass: true, sides: "sheen", fillColor: GOLD } },
    ...[0, 1, 2, 3].map(
      (i): StudioObject => ({ id: `w${i + 1}`, name: `Week ${i + 1}`, palette: "paper", look: { radius: 0.22, shadow: true, fillColor: GOLD, decal: { text: `W${i + 1}`, size: 13 } } }),
    ),
    { id: "tag", name: "Lisbon", palette: "orange", look: { radius: 0.3, shadow: true, decal: { text: "LIS", size: 15 } } },
  ],
  steps: [
    {
      id: "start",
      name: "Start",
      ms: 1200,
      pose: {
        table: { x: -200, y: -170, z: 0, width: 360, depth: 340, height: 16 },
        jar: { x: -80, y: -110, z: 16, width: 130, depth: 130, height: 110, shape: JAR, fill: 0.06, color: GOLD },
        w1: week(0, false),
        w2: week(1, false),
        w3: week(2, false),
        w4: week(3, false),
        tag: { x: 90, y: -150, z: 90, width: 60, depth: 60, height: 10, opacity: 0 },
      },
      overlay: { mark: "🫙", title: "GH₵ 0 of GH₵ 6,000", detail: "Lisbon in December", tint: "#fff1c7" },
    },
    ...[1, 2, 3, 4].map((n) => ({
      id: `week-${n}`,
      name: `Week ${n}`,
      ms: n === 4 ? 1300 : 1000,
      pose: { [`w${n}`]: week(n - 1, true), jar: { fill: 0.06 + n * 0.22 } },
      overlay: { mark: "🫙", title: `GH₵ ${(n * 1500).toLocaleString("en-US")} of GH₵ 6,000`, detail: "Lisbon in December", tint: "#fff1c7" },
    })),
    {
      id: "trip",
      name: "Trip booked",
      ms: 3200,
      pose: {
        jar: { x: -100, y: -100, z: 40, width: 170, depth: 110, height: 70, shape: SUITCASE, fill: 1, color: "#ff9a4d" },
        tag: { z: 16, opacity: 1 },
      },
      motion: { jar: { arc: 30 }, tag: { arc: 50, delay: 0.35 } },
      overlay: { mark: "✈️", title: "Flights booked · 12 Dec", detail: "Goal reached", tint: "#ffe2c7" },
    },
  ],
  links: [],
  footer: "4 weeks · GH₵ 1,500 a week",
};

const RIDER = 34;
const BAG = 24;
/** The rider, centred on a point in the street. */
const rider = (x: number, y: number): Pose => ({ x: x - RIDER / 2, y: y - RIDER / 2 });
/** The bag riding on the rider at a point. */
const carried = (x: number, y: number): Pose => ({ x: x - BAG / 2, y: y - BAG / 2, z: 19 });

const foodDelivery: SceneDocument = {
  version: DOCUMENT_VERSION,
  title: "Food delivery",
  stage: "day",
  camera: { zoom: 1.38, centerX: 5, centerY: -5 },
  feel: { duration: 0.9, bounce: 0.15 },
  objects: [
    ...["h1", "h2", "h3", "h4"].map((id, i): StudioObject => ({ id, name: `House ${i + 1}`, palette: "sky", scenery: true, look: { radius: 0.1, shadow: true } })),
    ...["s1", "s2", "s3"].map((id, i): StudioObject => ({ id, name: `Street ${i + 1}`, palette: "street", scenery: true, look: { radius: 0.04, sides: "flat" } })),
    { id: "kitchen", name: "Mama’s Kitchen", palette: "orange", look: { radius: 0.1, shadow: true, decal: { text: "Mama’s", size: 14 } } },
    { id: "home", name: "Your home", palette: "clay", look: { radius: 0.1, shadow: true, decal: { text: "Home", size: 14 } } },
    { id: "rider", name: "Kojo, your rider", palette: "mint", look: { shape: "ellipse", shadow: true } },
    { id: "bag", name: "Your order", palette: "sun", look: { radius: 0.2, shadow: true } },
  ],
  steps: [
    {
      id: "ordered",
      name: "Cooking",
      ms: 1500,
      pose: {
        h1: { x: -60, y: -180, z: 0, width: 80, depth: 70, height: 40 },
        h2: { x: 40, y: -190, z: 0, width: 70, depth: 80, height: 70 },
        h3: { x: -80, y: 60, z: 0, width: 90, depth: 80, height: 30 },
        h4: { x: -250, y: 80, z: 0, width: 80, depth: 90, height: 46 },
        s1: { x: -204, y: -104, z: 0, width: 48, depth: 148, height: 3 },
        s2: { x: -204, y: -4, z: 0, width: 403, depth: 48, height: 3 },
        s3: { x: 151, y: -4, z: 0, width: 48, depth: 108, height: 3 },
        kitchen: { x: -230, y: -190, z: 0, width: 100, depth: 90, height: 60 },
        home: { x: 130, y: 110, z: 0, width: 90, depth: 90, height: 50 },
        rider: { ...rider(-180, -80), z: 3, width: RIDER, depth: RIDER, height: 16 },
        bag: { x: -192, y: -157, z: 60, width: BAG, depth: BAG, height: 18 },
      },
      overlay: { mark: "🍲", title: "Cooking your jollof", detail: "Mama’s Kitchen · 18 min", tint: "#ffe6cc" },
    },
    {
      id: "picked",
      name: "Picked up",
      ms: 1100,
      pose: { bag: carried(-180, -80) },
      motion: { bag: { arc: 50 } },
      overlay: { mark: "🛵", title: "Kojo picked it up", detail: "Arriving in 12 min", tint: "#d7f5ea" },
    },
    {
      id: "street",
      name: "On the way",
      ms: 1100,
      pose: { rider: rider(-180, 20), bag: carried(-180, 20) },
      motion: { bag: { delay: 0.05 } },
      overlay: { mark: "🛵", title: "On the way", detail: "Arriving in 8 min", tint: "#d7f5ea" },
    },
    {
      id: "corner",
      name: "Your street",
      ms: 1300,
      pose: { rider: rider(175, 20), bag: carried(175, 20) },
      motion: { bag: { delay: 0.05 } },
      overlay: { mark: "🛵", title: "Turning onto your street", detail: "Arriving in 2 min", tint: "#d7f5ea" },
    },
    {
      id: "door",
      name: "At the door",
      ms: 1100,
      pose: { rider: rider(175, 80), bag: carried(175, 80) },
      motion: { bag: { delay: 0.05 } },
      overlay: { mark: "🚪", title: "Kojo is at your door", detail: "Head down now", tint: "#ffe2d6" },
    },
    {
      id: "delivered",
      name: "Delivered",
      ms: 3000,
      pose: { bag: { x: 163, y: 80, z: 0 } },
      motion: { bag: { arc: 30 } },
      overlay: { mark: "✅", title: "Delivered · enjoy!", detail: "Rate Kojo’s delivery", tint: "#dff5e6" },
    },
  ],
  links: [],
  footer: "1× jollof with chicken · GH₵ 85",
};

export const TEMPLATES: readonly SceneDocument[] = [foodDelivery, savingsGoal];
