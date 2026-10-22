/**
 * pages.tsx — seven before/after page pairs for the correspondence demo and benchmark.
 *
 * Ground truth is hand-labelled in data attributes the matcher never reads:
 *   data-gt="k"       this element is k (same k on both pages = same element)
 *   data-gt-from="k"  (new page) this element is one part of old element k that split
 *   data-gt-into="k"  (old page) this element is one part of what merged into new element k
 * Every element the extractor picks up carries one of them; the benchmark reports any it misses.
 */
import React from "react";

const g = (k: string) => ({ "data-gt": k });
const from = (k: string) => ({ "data-gt-from": k });
const into = (k: string) => ({ "data-gt-into": k });

export interface PagePair {
  id: string;
  name: string;
  a: string;
  b: string;
  note: string;
  A: React.ComponentType;
  B: React.ComponentType;
}

/* ───────────── Shop: grid → product detail ───────────── */

const PRODUCTS = [
  { id: "p1", name: "Field Jacket", price: "$128", rating: "4.6", tint: "#E9C9B8", fill: "#B5523A", d: "M8 30 L20 8 L32 30 Z" },
  { id: "p2", name: "Merino Beanie", price: "$34", rating: "4.4", tint: "#CFE0D4", fill: "#2F7A55", d: "M8 28 A12 12 0 0 1 32 28 Z" },
  { id: "p3", name: "Trail Pack 28L", price: "$96", rating: "4.8", tint: "#C9D6EA", fill: "#2E5C9E", d: "M12 8 H28 V32 H12 Z M16 14 H24" },
  {
    id: "p4",
    name: "Camp Mug",
    price: "$22",
    rating: "4.2",
    tint: "#EAE0C2",
    fill: "#9C7A14",
    d: "M10 12 H26 V30 H10 Z M26 16 H31 V24 H26",
  },
  {
    id: "p5",
    name: "Canvas Tote",
    price: "$48",
    rating: "4.5",
    tint: "#E3D0E6",
    fill: "#7D3F8A",
    d: "M9 14 H31 L28 32 H12 Z M15 14 V10 H25 V14",
  },
  {
    id: "p6",
    name: "Wool Socks",
    price: "$18",
    rating: "4.7",
    tint: "#D9DEE2",
    fill: "#4A5864",
    d: "M14 6 H24 V22 L30 28 L24 34 L14 26 Z",
  },
];
const Glyph = ({ p, k }: { p: (typeof PRODUCTS)[number]; k: string }) => (
  <svg viewBox="0 0 40 40" aria-hidden="true" {...g(k)}>
    <path d={p.d} fill={p.fill} stroke={p.fill} strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
const ShopBar = () => (
  <header className="pg-bar" {...g("bar")}>
    <b className="pg-logo" {...g("logo")}>
      Northwind
    </b>
    <input className="pg-search" readOnly placeholder="Search products" aria-label="Search" {...g("search")} />
    <button type="button" className="pg-btn ghost" tabIndex={-1} {...g("cart")}>
      Cart (2)
    </button>
  </header>
);
function ShopGrid() {
  return (
    <div className="pg">
      <ShopBar />
      <div className="pg-body">
        <div className="pg-row">
          <h2 className="pg-h2" {...g("h")}>
            New arrivals
          </h2>
          <div className="pg-chips">
            {["All", "Outerwear", "Bags", "Socks"].map((c, i) => (
              <span key={c} className={i ? "pg-chip" : "pg-chip on"} {...g("chip." + c)}>
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="shop-grid">
          {PRODUCTS.map((p) => (
            <article key={p.id} className="shop-card" {...g(p.id)}>
              <div className="shop-img" style={{ background: p.tint }} {...g(p.id + ".img")}>
                <Glyph p={p} k={p.id + ".svg"} />
              </div>
              <span className="shop-name" {...g(p.id + ".name")}>
                {p.name}
              </span>
              <div className="pg-row tight">
                <span className="shop-price" {...g(p.id + ".price")}>
                  {p.price}
                </span>
                <span className="shop-rate" {...g(p.id + ".rating")}>
                  ★ {p.rating}
                </span>
              </div>
              <button type="button" className="pg-btn small" tabIndex={-1} {...g(p.id + ".add")}>
                Add
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
function ShopDetail() {
  const p = PRODUCTS[2];
  return (
    <div className="pg">
      <ShopBar />
      <div className="pg-body">
        <div className="shop-detail">
          <div className="shop-img big" style={{ background: p.tint }} {...g("p3.img")}>
            <Glyph p={p} k="p3.svg" />
          </div>
          <div className="shop-info">
            <span className="pg-crumb" {...g("h")}>
              ← New arrivals
            </span>
            <h1 className="pg-h1" {...g("p3.name")}>
              {p.name}
            </h1>
            <div className="pg-row tight">
              <span className="shop-price big" {...g("p3.price")}>
                {p.price}
              </span>
              <span className="shop-rate" {...g("p3.rating")}>
                ★ {p.rating}
              </span>
            </div>
            <p className="pg-p" {...g("d.desc")}>
              A roll-top daypack in waxed canvas with a padded laptop sleeve, side bottle pockets and a removable hip belt.
            </p>
            <div className="pg-chips">
              {["S", "M", "L"].map((s, i) => (
                <span key={s} className={i === 1 ? "pg-chip on" : "pg-chip"} {...g("size." + s)}>
                  {s}
                </span>
              ))}
            </div>
            <button type="button" className="pg-btn primary" tabIndex={-1} {...g("p3.add")}>
              Add to cart
            </button>
          </div>
        </div>
        <h3 className="pg-h3" {...g("more")}>
          You might also like
        </h3>
        <div className="shop-mini">
          {[PRODUCTS[0], PRODUCTS[4], PRODUCTS[5]].map((q) => (
            <article key={q.id} className="shop-card row" {...g(q.id)}>
              <div className="shop-img sm" style={{ background: q.tint }} {...g(q.id + ".img")}>
                <Glyph p={q} k={q.id + ".svg"} />
              </div>
              <div className="pg-col">
                <span className="shop-name" {...g(q.id + ".name")}>
                  {q.name}
                </span>
                <span className="shop-price" {...g(q.id + ".price")}>
                  {q.price}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Inbox: list → open message ───────────── */

const MAILS = [
  {
    id: "e1",
    from: "Priya Raman",
    av: "PR",
    c: "#6E56CF",
    time: "09:41",
    subj: "Q3 roadmap review",
    snip: "Sharing the draft before Thursday, mainly the sequencing of the billing work.",
    unread: true,
  },
  {
    id: "e2",
    from: "Tomás Ortega",
    av: "TO",
    c: "#C2410C",
    time: "08:15",
    subj: "Deck feedback",
    snip: "The deck looks great. Two small notes on the pricing slide before we send it.",
    unread: true,
  },
  {
    id: "e3",
    from: "Linear",
    av: "Li",
    c: "#3B82F6",
    time: "Yesterday",
    subj: "3 issues assigned to you",
    snip: "ENG-412 Fix login redirect, ENG-415 Migrate billing webhooks and one more.",
    unread: false,
  },
  {
    id: "e4",
    from: "Hannah Becker",
    av: "HB",
    c: "#15803D",
    time: "Yesterday",
    subj: "Offsite dates",
    snip: "Does the week of the 14th work for everyone? Venue holds them until Friday.",
    unread: false,
  },
  {
    id: "e5",
    from: "Stripe",
    av: "St",
    c: "#4F46E5",
    time: "Mon",
    subj: "Your September invoice",
    snip: "Invoice INV-0932 for $1,240.00 is now available in your dashboard.",
    unread: false,
  },
];
const Folders = ({ inbox }: { inbox: string }) => (
  <nav className="mail-rail" {...g("rail")}>
    {[
      ["Inbox", inbox],
      ["Starred", ""],
      ["Sent", ""],
      ["Drafts", "2"],
    ].map(([f, n]) => (
      <button key={f} type="button" tabIndex={-1} className={f === "Inbox" ? "mail-folder on" : "mail-folder"} {...g("f." + f)}>
        <span {...g("f." + f + ".l")}>{f}</span>
        {n && (
          <span className="mail-count" {...g("f." + f + ".n")}>
            {n}
          </span>
        )}
      </button>
    ))}
  </nav>
);
const Av = ({ t, c, k, big }: { t: string; c: string; k: string; big?: boolean }) => (
  <span className={big ? "pg-av big" : "pg-av"} style={{ background: c }} {...g(k)}>
    {t}
  </span>
);
function InboxList() {
  return (
    <div className="pg mail">
      <Folders inbox="12" />
      <div className="mail-list">
        {MAILS.map((m) => (
          <div key={m.id} className={m.unread ? "mail-row unread" : "mail-row"} {...g(m.id)}>
            <Av t={m.av} c={m.c} k={m.id + ".av"} />
            <div className="pg-col grow">
              <div className="pg-row">
                <span className="mail-from" {...g(m.id + ".from")}>
                  {m.from}
                </span>
                <span className="mail-time" {...g(m.id + ".time")}>
                  {m.time}
                </span>
              </div>
              <span className="mail-subj" {...g(m.id + ".subj")}>
                {m.subj}
              </span>
              <span className="mail-snip" {...g(m.id + ".snip")}>
                {m.snip}
              </span>
            </div>
            {m.unread && <i className="mail-dot" {...g(m.id + ".dot")} />}
          </div>
        ))}
      </div>
    </div>
  );
}
function InboxMessage() {
  const m = MAILS[1];
  return (
    <div className="pg mail">
      <Folders inbox="11" />
      <div className="mail-open" {...g("e2")}>
        <button type="button" className="pg-btn ghost small" tabIndex={-1} {...g("back")}>
          ← Back
        </button>
        <h1 className="pg-h1" {...g("e2.subj")}>
          {m.subj}
        </h1>
        <div className="pg-row start">
          <Av t={m.av} c={m.c} k="e2.av" big />
          <div className="pg-col grow">
            <span className="mail-from" {...g("e2.from")}>
              {m.from}
            </span>
            <span className="mail-time" {...g("to")}>
              to me
            </span>
          </div>
          <span className="mail-time" {...g("e2.time")}>
            {m.time}
          </span>
        </div>
        <p className="pg-p" {...g("e2.snip")}>
          Hi Albert — the deck looks great. Two small notes on the pricing slide before we send it to the board on Friday.
        </p>
        <p className="pg-p" {...g("p2")}>
          First, the annual discount reads as 20% in the table but 15% in the footnote. Second, I'd move the enterprise tier to the right so
          the eye lands on Team.
        </p>
        <p className="pg-p" {...g("p3")}>
          Otherwise ready to go. Nice work.
        </p>
        <div className="pg-row start">
          <button type="button" className="pg-btn" tabIndex={-1} {...g("reply")}>
            Reply
          </button>
          <button type="button" className="pg-btn ghost" tabIndex={-1} {...g("fwd")}>
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Dashboard: all regions → filtered ───────────── */

const KPI_ALL = [
  ["Revenue", "$1.24M", "+8.2%"],
  ["Orders", "18,402", "+3.1%"],
  ["Avg order", "$67.40", "+4.9%"],
  ["Refund rate", "1.8%", "−0.4%"],
];
const KPI_EU = [
  ["Revenue", "$412K", "+11.6%"],
  ["Orders", "6,108", "+5.0%"],
  ["Avg order", "$67.45", "+6.2%"],
  ["Refund rate", "1.2%", "−0.9%"],
];
const BARS_ALL = [62, 58, 70, 66, 74, 80, 77, 85, 90, 88, 96, 100];
const BARS_EU = [30, 34, 28, 40, 38, 45, 52, 49, 55, 61, 58, 66];
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const ROWS = [
  ["acme", "Acme Corp", "US", "$84,200"],
  ["bright", "Brightline", "Europe", "$61,050"],
  ["cobalt", "Cobalt Labs", "Europe", "$44,900"],
  ["dun", "Dunmore", "APAC", "$39,300"],
  ["elk", "Elkhorn", "Europe", "$22,780"],
  ["fjord", "Fjordway", "US", "$18,400"],
];
function Dash({ eu }: { eu: boolean }) {
  const kpi = eu ? KPI_EU : KPI_ALL,
    bars = eu ? BARS_EU : BARS_ALL;
  const rows = eu ? ROWS.filter((r) => r[2] === "Europe") : ROWS;
  return (
    <div className="pg">
      <div className="pg-body">
        <div className="pg-row">
          <h2 className="pg-h2" {...g("title")}>
            Revenue overview
          </h2>
          <div className="pg-row start">
            {eu && (
              <span className="pg-chip on" {...g("filter")}>
                Region: Europe ✕
              </span>
            )}
            <button type="button" className="pg-btn ghost small" tabIndex={-1} {...g("region")}>
              {eu ? "Europe" : "All regions"} ▾
            </button>
            <button type="button" className="pg-btn ghost small" tabIndex={-1} {...g("range")}>
              Last 12 months ▾
            </button>
          </div>
        </div>
        <div className="dash-kpis">
          {kpi.map(([l, v, d], i) => (
            <div key={l} className="dash-kpi" {...g("k" + i)}>
              <span className="dash-l" {...g("k" + i + ".l")}>
                {l}
              </span>
              <span className="dash-v" {...g("k" + i + ".v")}>
                {v}
              </span>
              <span className={d.startsWith("+") ? "dash-d up" : "dash-d down"} {...g("k" + i + ".d")}>
                {d}
              </span>
            </div>
          ))}
        </div>
        <div className="dash-split">
          <div className="dash-card" {...g("chart")}>
            <h3 className="pg-h3" {...g("chart.h")}>
              Monthly revenue
            </h3>
            <div className="dash-bars">
              {bars.map((h, i) => (
                <div key={i} className="dash-barcol">
                  <i className="dash-bar" style={{ height: h + "%" }} {...g("bar" + i)} />
                  <span className="dash-m" {...g("m" + i)}>
                    {MONTHS[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-card" {...g("table")}>
            <div className="dash-tr head" {...g("thead")}>
              <span {...g("th.a")}>Account</span>
              <span {...g("th.r")}>Region</span>
              <span {...g("th.v")}>Amount</span>
            </div>
            {rows.map(([k, n, r, v]) => (
              <div key={k} className="dash-tr" {...g("r." + k)}>
                <span {...g("r." + k + ".n")}>{n}</span>
                <span className="muted" {...g("r." + k + ".r")}>
                  {r}
                </span>
                <span className="mono" {...g("r." + k + ".v")}>
                  {v}
                </span>
              </div>
            ))}
            <span className="dash-foot" {...g("count")}>
              Showing {rows.length} of 6
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Blog: index → article ───────────── */

const POSTS = [
  {
    id: "p1",
    title: "Designing for interruption",
    date: "Sep 30",
    tag: "Essays",
    fill: "#2E5C9E",
    tint: "#C9D6EA",
    d: "M6 30 C14 6 26 6 34 30",
  },
  {
    id: "p2",
    title: "A field guide to empty states",
    date: "Sep 24",
    tag: "Guides",
    fill: "#B5523A",
    tint: "#E9C9B8",
    d: "M8 8 H32 V32 H8 Z M14 20 H26",
  },
  {
    id: "p3",
    title: "What we learned shipping offline mode",
    date: "Sep 17",
    tag: "Essays",
    fill: "#2F7A55",
    tint: "#CFE0D4",
    d: "M20 6 L34 32 H6 Z",
  },
  {
    id: "p4",
    title: "Motion that explains itself",
    date: "Sep 09",
    tag: "Guides",
    fill: "#7D3F8A",
    tint: "#E3D0E6",
    d: "M6 20 Q13 6 20 20 T34 20",
  },
];
const Cover = ({ p, k, cls }: { p: (typeof POSTS)[number] | { fill: string; tint: string; d: string }; k: string; cls: string }) => (
  <div className={cls} style={{ background: p.tint }} {...g(k)}>
    <svg viewBox="0 0 40 40" aria-hidden="true" {...g(k + ".svg")}>
      <path d={p.d} fill="none" stroke={p.fill} strokeWidth="3" strokeLinecap="round" />
    </svg>
  </div>
);
const FEAT = {
  title: "The quiet interface",
  date: "Oct 02",
  tag: "Essays",
  author: "Mara Okafor",
  ex: "Most software shouts. A case for interfaces that stay out of the way until they are needed.",
  fill: "#9C7A14",
  tint: "#EAE0C2",
  d: "M6 26 H34 M10 18 H30 M14 10 H26",
};
const BlogBar = () => (
  <header className="pg-bar" {...g("bar")}>
    <b className="pg-logo" {...g("logo")}>
      Field Notes
    </b>
    <div className="pg-row start">
      {["Essays", "Guides", "About"].map((n) => (
        <span key={n} className="pg-nav" {...g("nav." + n)}>
          {n}
        </span>
      ))}
    </div>
  </header>
);
function BlogIndex() {
  return (
    <div className="pg">
      <BlogBar />
      <div className="pg-body">
        <article className="blog-feat" {...g("f")}>
          <Cover p={FEAT} k="f.cover" cls="blog-cover" />
          <div className="pg-col">
            <span className="pg-tag" {...g("f.tag")}>
              {FEAT.tag}
            </span>
            <h2 className="pg-h2" {...g("f.title")}>
              {FEAT.title}
            </h2>
            <p className="pg-p" {...g("f.ex")}>
              {FEAT.ex}
            </p>
            <div className="pg-row start">
              <span className="blog-meta" {...g("f.au")}>
                {FEAT.author}
              </span>
              <span className="blog-meta" {...g("f.date")}>
                {FEAT.date}
              </span>
            </div>
          </div>
        </article>
        <div className="blog-list">
          {POSTS.map((p) => (
            <article key={p.id} className="blog-item" {...g(p.id)}>
              <Cover p={p} k={p.id + ".cover"} cls="blog-thumb" />
              <div className="pg-col">
                <span className="pg-tag" {...g(p.id + ".tag")}>
                  {p.tag}
                </span>
                <span className="blog-title" {...g(p.id + ".title")}>
                  {p.title}
                </span>
                <span className="blog-meta" {...g(p.id + ".date")}>
                  {p.date}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
function BlogArticle() {
  const p = POSTS[1];
  return (
    <div className="pg">
      <BlogBar />
      <div className="pg-body narrow">
        <span className="pg-crumb" {...g("back")}>
          ← All posts
        </span>
        <span className="pg-tag" {...g("p2.tag")}>
          {p.tag}
        </span>
        <h1 className="pg-h1" {...g("p2.title")}>
          {p.title}
        </h1>
        <div className="pg-row start">
          <span className="pg-av" style={{ background: "#3D6B5A" }} {...g("au.av")}>
            JL
          </span>
          <span className="blog-meta" {...g("au")}>
            June Lindqvist
          </span>
          <span className="blog-meta" {...g("p2.date")}>
            {p.date}
          </span>
        </div>
        <Cover p={p} k="p2.cover" cls="blog-hero" />
        <p className="pg-p" {...g("b1")}>
          An empty screen is the first thing many people see. It is also the screen teams design last, usually as a grey illustration and a
          sentence nobody reads.
        </p>
        <p className="pg-p" {...g("b2")}>
          Treat it as onboarding instead: say what will appear here, show one example, and give one action that makes it appear.
        </p>
        <h3 className="pg-h3" {...g("rel")}>
          Related
        </h3>
        <div className="blog-rel">
          {[
            { id: "f", title: FEAT.title, date: FEAT.date },
            { id: "p4", title: POSTS[3].title, date: POSTS[3].date },
          ].map((r) => (
            <div key={r.id} className="blog-relitem" {...g(r.id)}>
              <span className="blog-title" {...g(r.id + ".title")}>
                {r.title}
              </span>
              <span className="blog-meta" {...g(r.id + ".date")}>
                {r.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Board: a card moves, one is added, one is edited ───────────── */

type Task = { id: string; t: string; c: string; av: string; col: string };
const TASKS_A: Task[] = [
  { id: "pricing", t: "Update pricing page", c: "Copy", av: "AL", col: "todo" },
  { id: "tokens", t: "Audit colour tokens", c: "Design", av: "JM", col: "todo" },
  { id: "alerts", t: "Set up error alerts", c: "Infra", av: "RK", col: "todo" },
  { id: "login", t: "Fix login redirect", c: "Bug", av: "AL", col: "doing" },
  { id: "hooks", t: "Migrate billing webhooks", c: "Infra", av: "SN", col: "doing" },
  { id: "dark", t: "Ship dark mode", c: "Feature", av: "JM", col: "done" },
  { id: "onb", t: "Onboarding checklist", c: "Feature", av: "RK", col: "done" },
];
const TASKS_B: Task[] = [
  { id: "notes", t: "Write release notes", c: "Docs", av: "SN", col: "todo" },
  { id: "pricing", t: "Update pricing page copy", c: "Copy", av: "AL", col: "todo" },
  ...TASKS_A.slice(1, 3),
  TASKS_A[4],
  { ...TASKS_A[3], col: "done" },
  ...TASKS_A.slice(5),
];
const AV_C: Record<string, string> = { AL: "#6E56CF", JM: "#C2410C", RK: "#15803D", SN: "#0E7490" };
function Board({ tasks }: { tasks: Task[] }) {
  const cols = [
    ["todo", "To do"],
    ["doing", "In progress"],
    ["done", "Done"],
  ];
  return (
    <div className="pg">
      <div className="pg-body">
        <h2 className="pg-h2" {...g("title")}>
          Sprint 14
        </h2>
        <div className="kb">
          {cols.map(([id, name]) => {
            const ts = tasks.filter((t) => t.col === id);
            return (
              <section key={id} className="kb-col" {...g("c." + id)}>
                <div className="pg-row">
                  <h3 className="pg-h3" {...g("c." + id + ".h")}>
                    {name}
                  </h3>
                  <span className="mail-count" {...g("c." + id + ".n")}>
                    {ts.length}
                  </span>
                </div>
                {ts.map((t) => (
                  <div key={t.id} className="kb-card" {...g(t.id)}>
                    <span className="kb-t" {...g(t.id + ".t")}>
                      {t.t}
                    </span>
                    <div className="pg-row">
                      <span className="pg-tag" {...g(t.id + ".c")}>
                        {t.c}
                      </span>
                      <span className="pg-av xs" style={{ background: AV_C[t.av] }} {...g(t.id + ".av")}>
                        {t.av}
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Checkout: shipping form → review (splits and merges) ───────────── */

const ITEMS = [
  ["Field notebook", "€24"],
  ["Brass pen", "€38"],
  ["Canvas tote", "€86"],
];
const Steps = ({ at }: { at: number }) => (
  <div className="pg-row start">
    {["Cart", "Shipping", "Review"].map((s, i) => (
      <span key={s} className={i === at ? "pg-chip on" : "pg-chip"} {...g("step." + s)}>
        {i + 1}. {s}
      </span>
    ))}
  </div>
);
function Summary({ review }: { review: boolean }) {
  return (
    <aside className="dash-card" {...g("sum")}>
      <h3 className="pg-h3" {...g("sum.h")}>
        Order summary
      </h3>
      {review ? (
        <span className="pg-p" {...g("items")}>
          Field notebook, Brass pen, Canvas tote
        </span>
      ) : (
        ITEMS.map(([n, p], i) => (
          <div key={n} className="pg-row">
            <span {...into("items")}>{n}</span>
            <span className="mono" {...g("i" + i + ".p")}>
              {p}
            </span>
          </div>
        ))
      )}
      {[
        ["Subtotal", "€148"],
        ["Shipping", "€6"],
        ["Total", "€154"],
      ].map(([l, v]) => (
        <div key={l} className={l === "Total" ? "pg-row total" : "pg-row"}>
          <span {...g(l + ".l")}>{l}</span>
          <span className="mono" {...g(l + ".v")}>
            {v}
          </span>
        </div>
      ))}
      <button type="button" className="pg-btn primary" tabIndex={-1} {...g("cta")}>
        {review ? "Place order" : "Continue to review"}
      </button>
    </aside>
  );
}
function CheckoutForm() {
  const F = ({ l, v, k, gt }: { l: string; v: string; k: string; gt: Record<string, string> }) => (
    <label className="co-field">
      <span className="co-l" {...g("lb." + k)}>
        {l}
      </span>
      <input className="co-in" readOnly value={v} tabIndex={-1} {...gt} />
    </label>
  );
  return (
    <div className="pg">
      <div className="pg-body">
        <Steps at={1} />
        <div className="co">
          <div className="pg-col">
            <h2 className="pg-h2" {...g("h")}>
              Shipping details
            </h2>
            <h3 className="pg-h3" {...g("contact")}>
              Contact
            </h3>
            <div className="co-two">
              <F l="First name" v="Ada" k="first" gt={into("name")} />
              <F l="Last name" v="Lovelace" k="last" gt={into("name")} />
            </div>
            <F l="Email" v="ada@lovelace.dev" k="email" gt={g("email")} />
            <h3 className="pg-h3" {...g("shipto")}>
              Ship to
            </h3>
            <F l="Address" v="12 Rue de Rivoli, 75001 Paris" k="addr" gt={g("addr")} />
          </div>
          <Summary review={false} />
        </div>
      </div>
    </div>
  );
}
function CheckoutReview() {
  return (
    <div className="pg">
      <div className="pg-body">
        <Steps at={2} />
        <div className="co">
          <div className="pg-col">
            <h2 className="pg-h2" {...g("h")}>
              Review your order
            </h2>
            <div className="pg-row">
              <h3 className="pg-h3" {...g("contact")}>
                Contact
              </h3>
              <span className="pg-crumb" {...g("edit1")}>
                Edit
              </span>
            </div>
            <span className="co-val" {...g("name")}>
              Ada Lovelace
            </span>
            <span className="co-val muted" {...g("email")}>
              ada@lovelace.dev
            </span>
            <div className="pg-row">
              <h3 className="pg-h3" {...g("shipto")}>
                Ship to
              </h3>
              <span className="pg-crumb" {...g("edit2")}>
                Edit
              </span>
            </div>
            <span className="co-val" {...from("addr")}>
              12 Rue de Rivoli
            </span>
            <span className="co-val" {...from("addr")}>
              75001 Paris
            </span>
          </div>
          <Summary review />
        </div>
      </div>
    </div>
  );
}

/* ───────────── Settings: desktop markup → mobile markup (same content, new DOM) ───────────── */

const NAV = ["Profile", "Notifications", "Billing", "Security"];
const TOGGLES = [
  ["t1", "Email digests", true],
  ["t2", "Mentions", true],
  ["t3", "Product updates", false],
] as const;
const Switch = ({ k, on }: { k: string; on: boolean }) => (
  <span className={on ? "set-sw on" : "set-sw"} role="switch" aria-checked={on} {...g(k + ".s")}>
    <i className="set-knob" {...g(k + ".k")} />
  </span>
);
function SettingsDesktop() {
  return (
    <div className="pg set-desk">
      <nav className="set-nav" {...g("nav")}>
        {NAV.map((n, i) => (
          <button key={n} type="button" tabIndex={-1} className={i ? "set-tab" : "set-tab on"} {...g("n." + n)}>
            {n}
          </button>
        ))}
      </nav>
      <div className="pg-body">
        <h2 className="pg-h2" {...g("h")}>
          Profile
        </h2>
        <div className="pg-row start">
          <span className="pg-av big" style={{ background: "#6E56CF" }} {...g("av")}>
            AL
          </span>
          <button type="button" className="pg-btn ghost small" tabIndex={-1} {...g("photo")}>
            Change photo
          </button>
        </div>
        <label className="co-field">
          <span className="co-l" {...g("l.name")}>
            Display name
          </span>
          <input className="co-in" readOnly value="Ada Lovelace" tabIndex={-1} {...g("name")} />
        </label>
        <label className="co-field">
          <span className="co-l" {...g("l.bio")}>
            Bio
          </span>
          <textarea
            className="co-in"
            readOnly
            rows={2}
            value="Analyst. Writes about engines and the people who build them."
            tabIndex={-1}
            {...g("bio")}
          />
        </label>
        <div className="set-toggles" {...g("tg")}>
          {TOGGLES.map(([k, l, on]) => (
            <div key={k} className="pg-row">
              <span {...g(k + ".l")}>{l}</span>
              <Switch k={k} on={on} />
            </div>
          ))}
        </div>
        <div className="pg-row end">
          <button type="button" className="pg-btn primary" tabIndex={-1} {...g("save")}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
function SettingsMobile() {
  return (
    <div className="pg set-mob">
      <div className="set-mobhead">
        <div>
          <h2 className="pg-h2" {...g("h")}>
            Profile
          </h2>
        </div>
      </div>
      <div>
        <div className="set-strip" {...g("nav")}>
          {NAV.map((n, i) => (
            <div key={n}>
              <button type="button" tabIndex={-1} className={i ? "set-tab" : "set-tab on"} {...g("n." + n)}>
                {n}
              </button>
            </div>
          ))}
        </div>
      </div>
      <section className="pg-body">
        <div className="pg-col center">
          <div>
            <span className="pg-av big" style={{ background: "#6E56CF" }} {...g("av")}>
              AL
            </span>
          </div>
          <div>
            <button type="button" className="pg-btn ghost small" tabIndex={-1} {...g("photo")}>
              Change photo
            </button>
          </div>
        </div>
        <div>
          <div className="co-field">
            <span className="co-l" {...g("l.name")}>
              Display name
            </span>
            <input className="co-in" readOnly value="Ada Lovelace" tabIndex={-1} {...g("name")} />
          </div>
        </div>
        <div>
          <div className="co-field">
            <span className="co-l" {...g("l.bio")}>
              Bio
            </span>
            <textarea
              className="co-in"
              readOnly
              rows={3}
              value="Analyst. Writes about engines and the people who build them."
              tabIndex={-1}
              {...g("bio")}
            />
          </div>
        </div>
        <ul className="set-toggles list" {...g("tg")}>
          {TOGGLES.map(([k, l, on]) => (
            <li key={k}>
              <div className="pg-row">
                <div>
                  <span {...g(k + ".l")}>{l}</span>
                </div>
                <div>
                  <Switch k={k} on={on} />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div>
          <button type="button" className="pg-btn primary wide" tabIndex={-1} {...g("save")}>
            Save changes
          </button>
        </div>
      </section>
    </div>
  );
}

export const PAIRS: PagePair[] = [
  {
    id: "shop",
    name: "Shop",
    a: "Product grid",
    b: "Product detail",
    note: "Card image, title, price and button become the detail page; three other cards reappear as recommendations.",
    A: ShopGrid,
    B: ShopDetail,
  },
  {
    id: "inbox",
    name: "Inbox",
    a: "Message list",
    b: "Open message",
    note: "The row opens into the message; the snippet becomes the first paragraph; the unread count drops.",
    A: InboxList,
    B: InboxMessage,
  },
  {
    id: "dash",
    name: "Dashboard",
    a: "All regions",
    b: "Europe",
    note: "Every number changes and half the table goes. Values are matched by slot, not by text.",
    A: () => <Dash eu={false} />,
    B: () => <Dash eu />,
  },
  {
    id: "blog",
    name: "Blog",
    a: "Index",
    b: "Article",
    note: "A list item becomes the article; the featured post reappears as a related link.",
    A: BlogIndex,
    B: BlogArticle,
  },
  {
    id: "board",
    name: "Board",
    a: "Before",
    b: "After",
    note: "A card moves to Done, one is added, one is renamed, and the column counts change.",
    A: () => <Board tasks={TASKS_A} />,
    B: () => <Board tasks={TASKS_B} />,
  },
  {
    id: "checkout",
    name: "Checkout",
    a: "Shipping",
    b: "Review",
    note: "First and last name merge into one line; the address splits into two; three items merge into one.",
    A: CheckoutForm,
    B: CheckoutReview,
  },
  {
    id: "settings",
    name: "Settings",
    a: "Desktop markup",
    b: "Mobile markup",
    note: "Same content, rebuilt DOM: new wrappers, new order, tabs instead of a sidebar.",
    A: SettingsDesktop,
    B: SettingsMobile,
  },
];

/* ───────────── ground truth ───────────── */

export interface Truth {
  rel: Set<string>;
  unlabelled: number;
}
/** Read the hand labels from the elements the extractor picked up (by index). */
export function readTruth(elsA: Element[], elsB: Element[]): Truth {
  const keyA = new Map<string, number>(),
    keyB = new Map<string, number>();
  let unlabelled = 0;
  elsA.forEach((el, i) => {
    const k = el.getAttribute("data-gt");
    if (k) keyA.set(k, i);
    else if (!el.hasAttribute("data-gt-into")) unlabelled++;
  });
  elsB.forEach((el, j) => {
    const k = el.getAttribute("data-gt");
    if (k) keyB.set(k, j);
    else if (!el.hasAttribute("data-gt-from")) unlabelled++;
  });
  const rel = new Set<string>();
  for (const [k, i] of keyA) {
    const j = keyB.get(k);
    if (j !== undefined) rel.add(`${i}>${j}`);
  }
  elsB.forEach((el, j) => {
    const k = el.getAttribute("data-gt-from");
    const i = k ? keyA.get(k) : undefined;
    if (i !== undefined) rel.add(`${i}>${j}`);
  });
  elsA.forEach((el, i) => {
    const k = el.getAttribute("data-gt-into");
    const j = k ? keyB.get(k) : undefined;
    if (j !== undefined) rel.add(`${i}>${j}`);
  });
  return { rel, unlabelled };
}
/** Reverse a truth set for the B → A direction. */
export const flipRel = (s: Set<string>) => new Set([...s].map((r) => r.split(">").reverse().join(">")));
