import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
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
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="hg-arrow" aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
  );
}
