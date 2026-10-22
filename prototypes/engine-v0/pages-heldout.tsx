/**
 * pages-heldout.tsx — five page pairs written after the matcher's weights were frozen.
 * Nothing in correspond.ts was changed after seeing how these score. Same labelling scheme as pages.tsx.
 */
import React from "react";
import type { PagePair } from "./pages";

const g = (k: string) => ({ "data-gt": k });
const from = (k: string) => ({ "data-gt-from": k });

/* ───────────── Music: playlist → now playing ───────────── */
const TRACKS = [
  { id: "t1", title: "Low Tide", artist: "Mirelle", len: "3:41", c1: "#1F4E79", c2: "#7FB3D5" },
  { id: "t2", title: "Paper Lanterns", artist: "The Overlook", len: "4:12", c1: "#7B2D26", c2: "#E8A87C" },
  { id: "t3", title: "Northbound", artist: "Kasa Duo", len: "2:58", c1: "#2D5A27", c2: "#A8D5A2" },
  { id: "t4", title: "Glass Harbour", artist: "Mirelle", len: "5:03", c1: "#4A2C6E", c2: "#C3A6E0" },
  { id: "t5", title: "Afterlight", artist: "Juno Field", len: "3:27", c1: "#6B5B1E", c2: "#E6D38A" },
];
const Art = ({ t, k, cls }: { t: (typeof TRACKS)[number]; k: string; cls: string }) => (
  <svg className={cls} viewBox="0 0 40 40" aria-hidden="true" {...g(k)}>
    <rect width="40" height="40" fill={t.c1} />
    <circle cx="26" cy="15" r="9" fill={t.c2} />
    <path d="M0 32 L14 22 L24 30 L40 20 V40 H0Z" fill={t.c2} opacity=".6" />
  </svg>
);
function Playlist() {
  return (
    <div className="pg">
      <div className="pg-body">
        <div className="pg-row start">
          <div className="ho-cover" {...g("pl.cover")}>
            Mix
          </div>
          <div className="pg-col">
            <span className="pg-tag" {...g("pl.kind")}>
              Playlist
            </span>
            <h2 className="pg-h2" {...g("pl.name")}>
              Evening Drive
            </h2>
            <span className="muted" {...g("pl.meta")}>
              5 songs, 19 min
            </span>
          </div>
        </div>
        <div className="pg-row start">
          <button type="button" className="pg-btn primary" tabIndex={-1} {...g("play")}>
            ▶ Play
          </button>
          <button type="button" className="pg-btn ghost" tabIndex={-1} {...g("shuffle")}>
            Shuffle
          </button>
        </div>
        <ol className="ho-tracks">
          {TRACKS.map((t, i) => (
            <li key={t.id} className={i === 1 ? "ho-track on" : "ho-track"} {...g(t.id)}>
              <span className="mono muted" {...g(t.id + ".n")}>
                {i + 1}
              </span>
              <Art t={t} k={t.id + ".art"} cls="ho-art" />
              <span className="pg-col grow">
                <span className="ho-title" {...g(t.id + ".title")}>
                  {t.title}
                </span>
                <span className="muted" {...g(t.id + ".artist")}>
                  {t.artist}
                </span>
              </span>
              <span className="mono muted" {...g(t.id + ".len")}>
                {t.len}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
function NowPlaying() {
  const t = TRACKS[1];
  return (
    <div className="pg">
      <div className="pg-body ho-np">
        <span className="pg-crumb" {...g("np.back")}>
          ⌄ Now playing
        </span>
        <Art t={t} k="t2.art" cls="ho-art big" />
        <div className="pg-col center">
          <h1 className="pg-h1" {...g("t2.title")}>
            {t.title}
          </h1>
          <span className="muted" {...g("t2.artist")}>
            {t.artist}
          </span>
        </div>
        <div className="ho-progress" {...g("np.bar")}>
          <i {...g("np.fill")} />
        </div>
        <div className="pg-row">
          <span className="mono muted" {...g("np.pos")}>
            1:24
          </span>
          <span className="mono muted" {...g("t2.len")}>
            {t.len}
          </span>
        </div>
        <div className="pg-row center">
          <button type="button" className="pg-btn ghost" tabIndex={-1} {...g("np.prev")}>
            ⏮
          </button>
          <button type="button" className="pg-btn primary" tabIndex={-1} {...g("play")}>
            ❚❚ Pause
          </button>
          <button type="button" className="pg-btn ghost" tabIndex={-1} {...g("np.next")}>
            ⏭
          </button>
        </div>
        <span className="pg-tag" {...g("np.up")}>
          Up next
        </span>
        <div className="ho-next" {...g("t3")}>
          <Art t={TRACKS[2]} k="t3.art" cls="ho-art" />
          <span className="pg-col">
            <span className="ho-title" {...g("t3.title")}>
              {TRACKS[2].title}
            </span>
            <span className="muted" {...g("t3.artist")}>
              {TRACKS[2].artist}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Calendar: week view → event detail (time range splits) ───────────── */
const DAYS = ["Mon 6", "Tue 7", "Wed 8", "Thu 9", "Fri 10"];
const EVENTS = [
  { id: "ev1", day: 0, top: 10, h: 18, title: "Standup", time: "09:30 – 09:45", c: "#3B82F6" },
  { id: "ev2", day: 1, top: 30, h: 36, title: "Design review", time: "10:00 – 11:00", c: "#8B5CF6" },
  { id: "ev3", day: 2, top: 10, h: 18, title: "Standup", time: "09:30 – 09:45", c: "#3B82F6" },
  { id: "ev4", day: 3, top: 60, h: 30, title: "1:1 with Sam", time: "13:00 – 13:30", c: "#10B981" },
  { id: "ev5", day: 4, top: 40, h: 46, title: "Planning", time: "11:00 – 12:30", c: "#F59E0B" },
];
const Week = () => (
  <div className="ho-week">
    {DAYS.map((d, i) => (
      <div key={d} className="ho-day">
        <span className="ho-dayh" {...g("d" + i)}>
          {d}
        </span>
        <div className="ho-col" {...g("col" + i)}>
          {EVENTS.filter((e) => e.day === i).map((e) => (
            <div key={e.id} className="ho-ev" style={{ top: e.top * 2, height: e.h * 2, background: e.c }} {...g(e.id)}>
              <span className="ho-evt" {...g(e.id + ".t")}>
                {e.title}
              </span>
              <span className="ho-evtime" {...g(e.id + ".time")}>
                {e.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
function CalendarWeek() {
  return (
    <div className="pg">
      <div className="pg-body">
        <div className="pg-row">
          <h2 className="pg-h2" {...g("month")}>
            October 2026
          </h2>
          <button type="button" className="pg-btn ghost small" tabIndex={-1} {...g("today")}>
            Today
          </button>
        </div>
        <Week />
      </div>
    </div>
  );
}
function CalendarEvent() {
  const e = EVENTS[1];
  return (
    <div className="pg">
      <div className="pg-body">
        <div className="pg-row">
          <h2 className="pg-h2" {...g("month")}>
            October 2026
          </h2>
          <button type="button" className="pg-btn ghost small" tabIndex={-1} {...g("today")}>
            Today
          </button>
        </div>
        <div className="ho-sheet" {...g("ev2")}>
          <i className="ho-swatch" style={{ background: e.c }} {...g("swatch")} />
          <h1 className="pg-h1" {...g("ev2.t")}>
            {e.title}
          </h1>
          <span className="muted" {...g("d1")}>
            Tue 7
          </span>
          <div className="ho-times">
            <span className="co-l" {...g("lbl.from")}>
              From
            </span>
            <span className="ho-big" {...from("ev2.time")}>
              10:00
            </span>
            <span className="co-l" {...g("lbl.to")}>
              To
            </span>
            <span className="ho-big" {...from("ev2.time")}>
              11:00
            </span>
          </div>
          <span {...g("loc")}>Room 4B · Zoom link in invite</span>
          <div className="pg-row start">
            {[
              ["AK", "#C2410C"],
              ["SN", "#0E7490"],
              ["JL", "#3D6B5A"],
            ].map(([a, c]) => (
              <span key={a} className="pg-av" style={{ background: c }} {...g("att." + a)}>
                {a}
              </span>
            ))}
          </div>
          <div className="pg-row start">
            <button type="button" className="pg-btn primary" tabIndex={-1} {...g("join")}>
              Join call
            </button>
            <button type="button" className="pg-btn ghost" tabIndex={-1} {...g("edit")}>
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Pricing: monthly → annual ───────────── */
const PLANS = [
  { id: "free", name: "Free", m: "$0", y: "$0", f: ["1 project", "Community support"] },
  { id: "pro", name: "Pro", m: "$24", y: "$19", f: ["Unlimited projects", "Version history", "Email support"] },
  { id: "team", name: "Team", m: "$48", y: "$38", f: ["Everything in Pro", "Shared workspaces", "SSO"] },
];
function Pricing({ annual }: { annual: boolean }) {
  return (
    <div className="pg">
      <div className="pg-body">
        <div className="pg-col center">
          <h2 className="pg-h2" {...g("h")}>
            Simple pricing
          </h2>
          <div className="seg ho-seg" {...g("toggle")}>
            <span className={annual ? "" : "on"} {...g("tg.m")}>
              Monthly
            </span>
            <span className={annual ? "on" : ""} {...g("tg.y")}>
              Annual
            </span>
          </div>
          {annual && (
            <span className="pg-tag" {...g("save")}>
              Save 20% with annual billing
            </span>
          )}
        </div>
        <div className="ho-plans">
          {PLANS.map((p) => (
            <div key={p.id} className={p.id === "pro" ? "ho-plan hl" : "ho-plan"} {...g(p.id)}>
              <span className="pg-h3" {...g(p.id + ".n")}>
                {p.name}
              </span>
              <span className="ho-price" {...g(p.id + ".p")}>
                {annual ? p.y : p.m}
              </span>
              <span className="muted" {...g(p.id + ".per")}>
                {annual ? "per month, billed yearly" : "per month"}
              </span>
              <ul className="ho-feats">
                {p.f.map((f, i) => (
                  <li key={f} {...g(p.id + ".f" + i)}>
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" className={p.id === "pro" ? "pg-btn primary" : "pg-btn ghost"} tabIndex={-1} {...g(p.id + ".cta")}>
                {p.id === "free" ? "Start free" : "Choose " + p.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Chat: conversation list → thread ───────────── */
const CONVOS = [
  { id: "c1", name: "Design team", av: "DT", c: "#8B5CF6", last: "Rui: pushed the new tokens", time: "2m" },
  { id: "c2", name: "Amara Osei", av: "AO", c: "#C2410C", last: "Can we move the sync to 3pm?", time: "14m" },
  { id: "c3", name: "Release crew", av: "RC", c: "#0E7490", last: "v2.4 is live on staging", time: "1h" },
  { id: "c4", name: "Leo Hart", av: "LH", c: "#15803D", last: "Thanks, that fixed it", time: "3h" },
];
function ChatList() {
  return (
    <div className="pg">
      <div className="pg-body">
        <div className="pg-row">
          <h2 className="pg-h2" {...g("h")}>
            Messages
          </h2>
          <button type="button" className="pg-btn small" tabIndex={-1} {...g("new")}>
            New
          </button>
        </div>
        <input className="pg-search" readOnly placeholder="Search messages" aria-label="Search" {...g("search")} />
        <div className="ho-convos">
          {CONVOS.map((c) => (
            <div key={c.id} className="ho-convo" {...g(c.id)}>
              <span className="pg-av" style={{ background: c.c }} {...g(c.id + ".av")}>
                {c.av}
              </span>
              <span className="pg-col grow">
                <span className="ho-title" {...g(c.id + ".name")}>
                  {c.name}
                </span>
                <span className="muted ho-ell" {...g(c.id + ".last")}>
                  {c.last}
                </span>
              </span>
              <span className="muted small" {...g(c.id + ".time")}>
                {c.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function ChatThread() {
  const c = CONVOS[1];
  return (
    <div className="pg ho-thread">
      <div className="ho-threadhead" {...g("c2")}>
        <span className="pg-crumb" {...g("back")}>
          ←
        </span>
        <span className="pg-av" style={{ background: c.c }} {...g("c2.av")}>
          {c.av}
        </span>
        <span className="pg-col grow">
          <span className="ho-title" {...g("c2.name")}>
            {c.name}
          </span>
          <span className="muted small" {...g("status")}>
            Active now
          </span>
        </span>
      </div>
      <div className="ho-msgs">
        <span className="ho-day" {...g("today")}>
          Today
        </span>
        <div className="ho-bubble me" {...g("m1")}>
          The deck is in the shared folder.
        </div>
        <div className="ho-bubble" {...g("m2")}>
          Great, I'll look tonight.
        </div>
        <div className="ho-bubble" {...g("c2.last")}>
          Can we move the sync to 3pm?
        </div>
        <span className="muted small ho-right" {...g("c2.time")}>
          14m
        </span>
      </div>
      <div className="ho-compose" {...g("compose")}>
        <input className="pg-search" readOnly placeholder="Message Amara" aria-label="Message" {...g("input")} />
        <button type="button" className="pg-btn primary small" tabIndex={-1} {...g("send")}>
          Send
        </button>
      </div>
    </div>
  );
}

/* ───────────── Files: grid view → list view ───────────── */
const FILES = [
  { id: "f1", name: "Q3 report.pdf", size: "2.4 MB", date: "Oct 1", c: "#DC2626", ext: "PDF" },
  { id: "f2", name: "Roadmap.fig", size: "18 MB", date: "Sep 28", c: "#8B5CF6", ext: "FIG" },
  { id: "f3", name: "Budget 2027.xlsx", size: "340 KB", date: "Sep 26", c: "#16A34A", ext: "XLS" },
  { id: "f4", name: "Logo final.svg", size: "12 KB", date: "Sep 20", c: "#F59E0B", ext: "SVG" },
  { id: "f5", name: "Interview notes.md", size: "8 KB", date: "Sep 18", c: "#475569", ext: "MD" },
  { id: "f6", name: "Launch video.mp4", size: "212 MB", date: "Sep 12", c: "#0EA5E9", ext: "MP4" },
];
function Files({ list }: { list: boolean }) {
  return (
    <div className="pg">
      <div className="pg-body">
        <div className="pg-row">
          <h2 className="pg-h2" {...g("h")}>
            Shared with me
          </h2>
          <div className="seg ho-seg" {...g("view")}>
            <span className={list ? "" : "on"} {...g("v.grid")}>
              Grid
            </span>
            <span className={list ? "on" : ""} {...g("v.list")}>
              List
            </span>
          </div>
        </div>
        {list ? (
          <table className="ho-table">
            <thead>
              <tr>
                <th {...g("th.n")}>Name</th>
                <th {...g("th.s")}>Size</th>
                <th {...g("th.d")}>Modified</th>
              </tr>
            </thead>
            <tbody>
              {FILES.map((f) => (
                <tr key={f.id} {...g(f.id)}>
                  <td>
                    <span className="ho-ext sm" style={{ background: f.c }} {...g(f.id + ".ext")}>
                      {f.ext}
                    </span>{" "}
                    <span {...g(f.id + ".n")}>{f.name}</span>
                  </td>
                  <td className="mono" {...g(f.id + ".s")}>
                    {f.size}
                  </td>
                  <td {...g(f.id + ".d")}>{f.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="ho-files">
            {FILES.map((f) => (
              <div key={f.id} className="ho-file" {...g(f.id)}>
                <span className="ho-ext" style={{ background: f.c }} {...g(f.id + ".ext")}>
                  {f.ext}
                </span>
                <span className="ho-title" {...g(f.id + ".n")}>
                  {f.name}
                </span>
                <span className="muted small" {...g(f.id + ".s")}>
                  {f.size}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const HELDOUT: PagePair[] = [
  {
    id: "music",
    name: "Music",
    a: "Playlist",
    b: "Now playing",
    note: "A track row becomes the player; the next track appears as Up next.",
    A: Playlist,
    B: NowPlaying,
  },
  {
    id: "calendar",
    name: "Calendar",
    a: "Week",
    b: "Event",
    note: "An event block becomes a detail sheet; its time range splits into From and To.",
    A: CalendarWeek,
    B: CalendarEvent,
  },
  {
    id: "pricing",
    name: "Pricing",
    a: "Monthly",
    b: "Annual",
    note: "Every price changes; a banner appears; the toggle moves.",
    A: () => <Pricing annual={false} />,
    B: () => <Pricing annual />,
  },
  {
    id: "chat",
    name: "Chat",
    a: "Conversations",
    b: "Thread",
    note: "A conversation row becomes the thread header; its last message becomes the newest bubble.",
    A: ChatList,
    B: ChatThread,
  },
  {
    id: "files",
    name: "Files",
    a: "Grid view",
    b: "List view",
    note: "Same six files, rebuilt as a table.",
    A: () => <Files list={false} />,
    B: () => <Files list />,
  },
];
