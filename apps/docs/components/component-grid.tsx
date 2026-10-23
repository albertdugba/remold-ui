/**
 * "Browse all": a card for every ready-made component, with a live preview of it above its
 * title and description, built from the pages themselves so the list keeps itself up to date.
 */
import Link from "next/link";
import { source } from "@/lib/source";
import { CATALOGUE } from "./catalogue";
import { ComponentBrowser, type BrowserItem } from "./component-browser";
import { ComponentPreview } from "./component-preview";

export function ComponentGrid({ kind = "interface" }: { kind?: "interface" | "canvas" }) {
  const pages = source
    .getPages()
    .filter((p) => p.url.startsWith("/docs/components/") && p.url !== "/docs/components")
    .filter((p) => (p.data.kind === "canvas" ? "canvas" : "interface") === kind)
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
  return (
    <div className="rm-grid not-prose">
      {pages.map((p) => (
        <Link key={p.url} href={p.url} className="rm-grid-card">
          <ComponentPreview id={p.url.split("/").pop()!} />
          <span className="rm-grid-text">
            <strong>{p.data.title}</strong>
            <span>{p.data.description}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** The pieces that live on the landing pages, as cards linking to where they live. */
export function CatalogueGrid({ group }: { group: keyof typeof CATALOGUE }) {
  return (
    <div className="rm-grid not-prose">
      {CATALOGUE[group].items.map((item) => (
        <Link key={item.id} href={item.href} className="rm-grid-card">
          <ComponentPreview id={item.id} />
          <span className="rm-grid-text">
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/**
 * The order cards appear in: the strongest first, then text, SVG, interface, icons and canvas.
 * Anything not listed goes at the end.
 */
const ORDER = [
  // Lead
  "comment-thread",
  "course-outline",
  "podcast-player",
  // Product UI
  "search-results",
  "pricing-toggle",
  "invite-team",
  "two-factor",
  "upload-flow",
  // Text morphing
  "logo-morph",
  "letters",
  // SVG
  "home/emblem",
  "home/feedback",
  // Interface
  "onboarding-checklist",
  "accounts",
  // Icons
  "morph-icons",
  "home/icons",
  // Canvas
  "voice-orb",
  "edge-delivery",
  "layer-stack",
  "integrations-hub",
  "product-anatomy",
  "living-diagrams",
  "build-anything",
  "canvas-gallery",
  "home/scene",
  "home/world",
  "home/particles",
];

const HIDDEN_EXAMPLE_IDS = new Set(["accounts"]);

/** Every component and every landing-page piece, for the searchable "Browse all" grid. */
export function AllComponents() {
  const pages: BrowserItem[] = source
    .getPages()
    .filter((p) => p.url.startsWith("/docs/components/") && p.url !== "/docs/components")
    .filter((p) => !HIDDEN_EXAMPLE_IDS.has(p.url.split("/").pop()!))
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .map((p) => ({
      id: p.url.split("/").pop()!,
      title: p.data.title,
      description: p.data.description ?? "",
      href: p.url,
      category: p.data.kind === "canvas" ? "Canvas" : "Interface",
    }));
  const rest = [...CATALOGUE.home.items];
  const rank = (id: string) => {
    const i = ORDER.indexOf(id);
    return i === -1 ? ORDER.length : i;
  };
  const items = [...pages, ...rest].sort((a, b) => rank(a.id) - rank(b.id));
  return <ComponentBrowser items={items} />;
}
