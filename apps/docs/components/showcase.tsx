"use client";
/**
 * A grid of live examples, each linking to its component page. Used on the landing page and on
 * the Components overview.
 */
import Link from "next/link";
import type { ComponentType } from "react";
import { FilesDemo, IconsDemo, ParticlesDemo, PriceDemo, SceneDemo } from "./demos";
import { ReleaseStatusDemo } from "./demos/release-status";

interface Item {
  title: string;
  description: string;
  href: string;
  Demo: ComponentType<{ framed?: boolean }>;
  wide?: boolean;
  dark?: boolean;
}

const ITEMS: Item[] = [
  {
    title: "Morph",
    description: "Lists, grids and pages that rearrange. Sort and filter this one.",
    href: "/docs/primitives/morph",
    Demo: FilesDemo,
    wide: true,
  },
  {
    title: "Text",
    description: "Prices, counts and status lines that change letter by letter.",
    href: "/docs/primitives/text",
    Demo: PriceDemo,
  },
  { title: "Icon", description: "Icons that reshape from one state into the next.", href: "/docs/primitives/icon", Demo: IconsDemo },
  {
    title: "PathGroup",
    description: "A multi-part SVG whose pieces morph together.",
    href: "/docs/primitives/path-group",
    Demo: ReleaseStatusDemo,
    wide: true,
  },
  {
    title: "Scene",
    description: "Diagrams on canvas that spring between layouts.",
    href: "/docs/primitives/scene",
    Demo: SceneDemo,
    dark: true,
  },
  {
    title: "Particles",
    description: "Thousands of dots that rebuild into any shape or word.",
    href: "/docs/primitives/particles",
    Demo: ParticlesDemo,
  },
];

export function Showcase({ only }: { only?: string[] }) {
  const items = only ? ITEMS.filter((i) => only.includes(i.title)) : ITEMS;
  return (
    <div className="rm-showcase not-prose">
      {items.map(({ title, description, href, Demo, wide, dark }) => (
        <article key={title} className={`rm-showcase-card${wide ? " wide" : ""}`}>
          <div className={`rm-showcase-preview${dark ? " dark-stage" : ""}`}>
            <Demo framed={false} />
          </div>
          <div className="rm-showcase-meta">
            <h3>
              <Link href={href}>{title}</Link>
            </h3>
            <p>{description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
