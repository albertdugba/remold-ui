/**
 * The docs shell: a header, a sidebar of every page, the page itself with previous and next
 * links, and an "On this page" list that follows your reading position.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useMotion } from "../motion";
import { NAV, PAGES, type DocPage } from "./routes";

const href = (page: DocPage) => `#/${page.path}`;

function Logo() {
  return (
    <a className="docs-logo" href="#/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M3 17C7 17 8 7 12 7S17 17 21 17" />
      </svg>
      Remold
      <span className="docs-version">0.1</span>
    </a>
  );
}

/** Page-wide playback settings for the demos, tucked into a menu. */
function PlaybackMenu() {
  const { slow, setSlow, showMatches, setShowMatches, reduce, setReduce } = useMotion();
  const options = [
    { label: "Slow motion", checked: slow, set: setSlow },
    { label: "Show matches", checked: showMatches, set: setShowMatches },
    { label: "Reduce motion", checked: reduce, set: setReduce },
  ];
  const on = options.filter((o) => o.checked).length;
  return (
    <details className="docs-menu">
      <summary>Playback{on > 0 && <span className="docs-menu-count">{on}</span>}</summary>
      <div className="docs-menu-panel">
        {options.map((o) => (
          <label key={o.label} className="doc-check">
            <input type="checkbox" checked={o.checked} onChange={(e) => o.set(e.target.checked)} />
            {o.label}
          </label>
        ))}
      </div>
    </details>
  );
}

export function Header({ onMenu, current }: { onMenu?: () => void; current: "docs" | "examples" | "pro" }) {
  return (
    <header className="docs-header">
      {onMenu && (
        <button type="button" className="docs-menu-button" aria-label="Open navigation" onClick={onMenu}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}
      <Logo />
      <nav className="docs-top-nav" aria-label="Site">
        <a href="#/" aria-current={current === "docs" ? "page" : undefined}>
          Docs
        </a>
        <a href="#/examples/interfaces" aria-current={current === "examples" ? "page" : undefined}>
          Examples
        </a>
        <a href="#/pro" aria-current={current === "pro" ? "page" : undefined}>
          Pro
        </a>
      </nav>
      <PlaybackMenu />
    </header>
  );
}

function Sidebar({ current, open, onClose }: { current: DocPage; open: boolean; onClose: () => void }) {
  const [filter, setFilter] = useState("");
  // Escape closes the drawer on small screens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const query = filter.trim().toLowerCase();
  const groups = NAV.map((g) => ({
    ...g,
    pages: g.pages.filter((p) => !query || `${g.title} ${p.title}`.toLowerCase().includes(query)),
  })).filter((g) => g.pages.length > 0);
  return (
    <>
      {open && <div className="docs-scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={`docs-sidebar${open ? " open" : ""}`} aria-label="Documentation">
        <input
          className="docs-filter"
          type="search"
          placeholder="Filter pages"
          aria-label="Filter pages"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <nav>
          {groups.map((g) => (
            <div key={g.title} className="docs-group">
              <p className="docs-group-title">{g.title}</p>
              <ul>
                {g.pages.map((p) => (
                  <li key={p.path}>
                    <a href={href(p)} aria-current={p === current ? "page" : undefined} onClick={onClose}>
                      {p.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {groups.length === 0 && <p className="docs-empty">No pages match.</p>}
        </nav>
        <a className="docs-sidebar-pro" href="#/pro" onClick={onClose}>
          Remold Pro
          <span>Ready-made components and templates</span>
        </a>
      </aside>
    </>
  );
}

/** The page's sections, highlighting the one being read. */
function Contents({ page, article }: { page: DocPage; article: React.RefObject<HTMLElement | null> }) {
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useLayoutEffect(() => {
    const found = [...(article.current?.querySelectorAll<HTMLElement>("h2[id]") ?? [])];
    setHeadings(found.map((h) => ({ id: h.id, text: h.textContent ?? "" })));
    setActive(found[0]?.id ?? null);
    if (found.length === 0) return;
    // The active section is the last heading that has scrolled past the top third of the screen.
    const update = () => {
      const line = window.innerHeight / 3;
      let current = found[0]!.id;
      for (const h of found) if (h.getBoundingClientRect().top < line) current = h.id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [page, article]);

  if (headings.length < 2) return <aside className="docs-contents" aria-hidden="true" />;
  return (
    <aside className="docs-contents" aria-label="On this page">
      <p className="docs-group-title">On this page</p>
      <ul>
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#/${page.path}`}
              aria-current={h.id === active ? "location" : undefined}
              onClick={(e) => {
                // The site routes by hash, so scroll by hand instead of changing it.
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Pager({ page }: { page: DocPage }) {
  const index = PAGES.indexOf(page);
  const previous = PAGES[index - 1];
  const next = PAGES[index + 1];
  return (
    <nav className="docs-pager" aria-label="Previous and next">
      {previous ? (
        <a href={href(previous)}>
          <span>Previous</span>
          {previous.title}
        </a>
      ) : (
        <span />
      )}
      {next && (
        <a href={href(next)} className="next">
          <span>Next</span>
          {next.title}
        </a>
      )}
    </nav>
  );
}

export function DocsLayout({ page, anchor }: { page: DocPage; anchor: string | null }) {
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const article = useRef<HTMLElement>(null);
  const heading = useRef(true);

  // A new page starts at the top (or at the section asked for), with focus on its title.
  useLayoutEffect(() => {
    const target = anchor ? document.getElementById(anchor) : null;
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
    if (heading.current) {
      heading.current = false;
      return;
    }
    article.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [page, anchor]);

  useEffect(() => {
    document.title = page.path === "" ? "Remold · Documentation" : `${page.title} · Remold`;
  }, [page]);

  const isExamples = page.path.startsWith("examples/");
  return (
    <div className="docs">
      <Header current={isExamples ? "examples" : "docs"} onMenu={() => setMenu(true)} />
      <div className="docs-body">
        <Sidebar current={page} open={menu} onClose={closeMenu} />
        <main className="docs-main">
          <article ref={article} className="docs-article" key={page.path}>
            {page.render()}
            <Pager page={page} />
          </article>
        </main>
        <Contents page={page} article={article} />
      </div>
    </div>
  );
}

export function ProLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.title = "Remold Pro";
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return (
    <div className="docs">
      <Header current="pro" />
      {children}
    </div>
  );
}
