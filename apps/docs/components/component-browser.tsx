"use client";
/**
 * "Browse all": every component as a card that's mostly its live preview, with just a title and a
 * category under it. Search matches titles and descriptions; the menu narrows to one category.
 */
import { Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { CATEGORIES, type Category } from "./catalogue";
import { ComponentPreview } from "./component-preview";

export interface BrowserItem {
  id: string;
  title: string;
  description: string;
  href: string;
  category: Category;
}

export function ComponentBrowser({ items }: { items: BrowserItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const q = useDeferredValue(query.trim().toLowerCase());

  const shown = useMemo(
    () =>
      items.filter(
        (item) =>
          (category === "All" || item.category === category) &&
          (!q ||
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)),
      ),
    [items, category, q],
  );
  const present = CATEGORIES.filter((c) => items.some((item) => item.category === c));

  return (
    <div className="rm-browser not-prose">
      <div className="rm-browser-bar">
        <p className="rm-browser-count">
          {shown.length === items.length ? `${items.length} components` : `${shown.length} of ${items.length}`}
        </p>
        <label className="rm-browser-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search components"
          />
        </label>
        <select
          className="rm-browser-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "All")}
          aria-label="Category"
        >
          <option value="All">All components</option>
          {present.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="rm-browser-empty">Nothing matches “{query}”.</p>
      ) : (
        <div className="rm-browser-grid">
          {shown.map((item) => (
            <Link key={item.id} href={item.href} className="rm-card" title={item.description}>
              <ComponentPreview id={item.id} />
              <span className="rm-card-meta">
                <strong>{item.title}</strong>
                <span>{item.category}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
