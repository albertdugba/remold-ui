/**
 * Every docs page, grouped as the sidebar shows them. Addresses are hashes: "#/react/layout".
 */
import type { ReactNode } from "react";
import { collections } from "../examples";
import { CanvasParticles, CanvasScene, CoreMatching, CoreMotion, CoreShapes } from "./pages/canvas-core";
import { Accessibility, Matching, Springs, Styling } from "./pages/concepts";
import { ExamplesPage } from "./pages/examples";
import { Installation, Introduction, QuickStart } from "./pages/overview";
import { REACT_PAGES, ReactPage } from "./pages/react";

export interface DocPage {
  /** The address after "#/". The introduction is "". */
  path: string;
  title: string;
  render: () => ReactNode;
}

export interface NavGroup {
  title: string;
  pages: DocPage[];
}

export const NAV: NavGroup[] = [
  {
    title: "Overview",
    pages: [
      { path: "", title: "Introduction", render: () => <Introduction /> },
      { path: "installation", title: "Installation", render: () => <Installation /> },
      { path: "quick-start", title: "Quick start", render: () => <QuickStart /> },
    ],
  },
  {
    title: "Concepts",
    pages: [
      { path: "concepts/matching", title: "How matching works", render: () => <Matching /> },
      { path: "concepts/springs", title: "Springs", render: () => <Springs /> },
      { path: "concepts/accessibility", title: "Accessibility", render: () => <Accessibility /> },
      { path: "concepts/styling", title: "Styling", render: () => <Styling /> },
    ],
  },
  {
    title: "React",
    pages: Object.entries(REACT_PAGES).map(([id, page]) => ({
      path: `react/${id}`,
      title: page.title,
      render: () => <ReactPage id={id} />,
    })),
  },
  {
    title: "Canvas",
    pages: [
      { path: "canvas/scene", title: "scene()", render: () => <CanvasScene /> },
      { path: "canvas/particles", title: "particles()", render: () => <CanvasParticles /> },
    ],
  },
  {
    title: "Core",
    pages: [
      { path: "core/motion", title: "Motion values", render: () => <CoreMotion /> },
      { path: "core/matching", title: "Matching", render: () => <CoreMatching /> },
      { path: "core/shapes", title: "Shapes", render: () => <CoreShapes /> },
    ],
  },
  {
    title: "Examples",
    pages: collections.map((c) => ({ path: `examples/${c.id}`, title: c.category, render: () => <ExamplesPage collection={c} /> })),
  },
];

export const PAGES: DocPage[] = NAV.flatMap((g) => g.pages);

export interface Route {
  page: DocPage | null;
  /** A heading on the page to scroll to, such as an example's id. */
  anchor: string | null;
  /** The Pro page, which has its own full-width layout. */
  pro: boolean;
}

/**
 * Read the hash. Old addresses still work: "#/text" and "#/text/headline" (collections before
 * the docs) go to the matching examples page.
 */
export function readRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (path === "pro") return { page: null, anchor: null, pro: true };
  const exact = PAGES.find((p) => p.path === path);
  if (exact) return { page: exact, anchor: null, pro: false };
  const parts = path.split("/");
  // "examples/text/headline", or the old "text/headline".
  const [collectionId, exampleId] = parts[0] === "examples" ? [parts[1], parts[2]] : [parts[0], parts[1]];
  const examples = PAGES.find((p) => p.path === `examples/${collectionId}`);
  if (examples) return { page: examples, anchor: exampleId ?? null, pro: false };
  return { page: PAGES[0]!, anchor: null, pro: false };
}
