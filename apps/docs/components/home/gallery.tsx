/**
 * The landing page's galleries: real components, live and usable, in cards of mixed sizes. Each
 * one is shown whole, scaled to fit its card, and its title links to its page.
 */
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ComponentPreview } from "../component-preview";

export interface GalleryItem {
  id: string;
  title: string;
  body: string;
  href: string;
  /** How many of the grid's columns it spans. */
  span?: 1 | 2;
}

export function Gallery({ items, small = false }: { items: GalleryItem[]; small?: boolean }) {
  return (
    <div className={`hg${small ? " small" : ""}`}>
      {items.map((item) => (
        <article key={item.id} className={`hg-card${item.span === 2 ? " wide" : ""}`}>
          <ComponentPreview id={item.id} interactive />
          <Link href={item.href} className="hg-meta">
            <span>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </span>
            <ArrowUpRight className="hg-arrow" aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
  );
}
