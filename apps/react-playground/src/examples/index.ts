import { editor } from "../features/Editor";
import { familyTree } from "../features/Family";
import { dataJourney, fulfilment, payment } from "../features/Business";
import { plans, reveal, send, showcase } from "../features/Fintech";
import { buttons, media, navigation, toggles, weather } from "../features/Icons";
import { agent, notifications } from "../features/Interfaces";
import { architecture, autoscaling, database, edge, integrations, pipeline, pointCloud, traffic } from "../features/Scenes";
import { particlesExample } from "../features/Particles";
import { migrationMap, releaseControl } from "../features/Stories";
import { blobs, chart, donut, emblem, pathGroup, progress } from "../features/Svg";
import { board, headline, order, pricing, translate } from "../features/Text";
import { voice } from "../features/Voice";
import { wallet } from "../features/Wallet";
import { world } from "../features/World";
import type { Collection, Example } from "./types";

/** Every example, grouped by collection, in the order each collection page shows them. */
export const examples: Example[] = [
  headline,
  translate,
  pricing,
  board,
  order,
  toggles,
  buttons,
  media,
  navigation,
  weather,
  emblem,
  chart,
  donut,
  progress,
  pathGroup,
  blobs,
  voice,
  agent,
  editor,
  notifications,
  showcase,
  wallet,
  plans,
  reveal,
  send,
  particlesExample,
  architecture,
  database,
  pipeline,
  edge,
  autoscaling,
  integrations,
  traffic,
  pointCloud,
  familyTree,
  migrationMap,
  releaseControl,
  payment,
  fulfilment,
  dataJourney,
  world,
];

/** In the order the landing page shows them. */
export const collections: Collection[] = [
  {
    id: "interfaces",
    category: "Interfaces",
    summary: "A voice orb, an agent at work, a writing assistant and a notification stack.",
    headline: "Interfaces that rewrite themselves.",
    lead: "Product screens whose markup is replaced as things happen. Remold compares what was on screen with what is now, works out what became what, and moves it there. No keys, ids or layout names.",
    featured: "voice",
  },
  {
    id: "fintech",
    category: "Fintech",
    summary: "Payment cards for landing pages and apps: a card hero, a wallet, a plan picker, a virtual card and a send-money flow.",
    headline: "Money moves. So should the interface.",
    lead: "Realistic payment cards in plain HTML and CSS, and the screens around them. Cards stack, fan out and rise from a wallet; numbers reveal themselves in place; amounts and balances change only the digits that moved.",
    featured: "card-hero",
  },
  {
    id: "canvas",
    category: "Canvas",
    summary:
      "Living diagrams for products, payments, fulfilment, trust, data and infrastructure—with keyless point clouds and Story-powered templates.",
    headline: "Diagrams that move between ideas.",
    lead: "Describe objects and a few layouts as plain data; the scene springs every object, link and the camera between them. Explain a payment, delivery, Trust Center or product story—not only infrastructure—or build data-driven point clouds. People can turn it, tap an object to focus it, or tab through it with a screen reader.",
    featured: "particles",
  },
  {
    id: "text",
    category: "Text",
    summary: "Headlines, prices, live boards and status lines that change in place, letter by letter.",
    headline: "Text that changes in place.",
    lead: "When words change, the letters both versions share stay on screen and slide to their new places; only the difference fades in or out. Your eye goes straight to what changed.",
    featured: "headline",
  },
  {
    id: "icons",
    category: "Icons",
    summary: "Toggles, buttons, media controls and weather icons that reshape from one state into the next.",
    headline: "Icons that change shape, not pictures.",
    lead: "Each icon is a single path. When its state changes, every stroke travels to where the next icon needs it, and spare strokes merge into a neighbour or grow out of one.",
    featured: "icon-toggles",
  },
  {
    id: "svg",
    category: "SVG",
    summary: "Emblems, charts, donuts, progress rings and soft blobs: any path, at any size, morphing.",
    headline: "Any path can become any other.",
    lead: "The same morph that drives icons works on artwork and charts: different point counts, holes, several pieces. Give it the old path and the new one; it pairs the pieces and springs between them.",
    featured: "emblem",
  },
];

export const examplesIn = (collection: Collection) => examples.filter((e) => e.category === collection.category);
export const findCollection = (id: string | null) => collections.find((c) => c.id === id) ?? null;
