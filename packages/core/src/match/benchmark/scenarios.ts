import type { Rgba } from "../nodes";
import { box, control, heading, media, page, text, type Element, type Page } from "./build";

export interface Scenario {
  id: string;
  name: string;
  note: string;
  from: Page;
  to: Page;
}

const MUTED: Rgba = [85, 96, 112, 1];
const BAR: Rgba = [243, 245, 248, 1];
const GHOST = { color: [20, 27, 38, 1], background: [0, 0, 0, 0] } as const;
const CHIP = { color: [20, 27, 38, 1], background: [230, 234, 240, 1], radius: 999, fontWeight: 500 } as const;

const PRODUCTS = [
  { id: "p1", name: "Field Jacket", price: "$128", rating: "4.6", tint: [233, 201, 184, 1] },
  { id: "p2", name: "Merino Beanie", price: "$34", rating: "4.4", tint: [207, 224, 212, 1] },
  { id: "p3", name: "Trail Pack 28L", price: "$96", rating: "4.8", tint: [201, 214, 234, 1] },
  { id: "p4", name: "Camp Mug", price: "$22", rating: "4.2", tint: [234, 224, 194, 1] },
  { id: "p5", name: "Canvas Tote", price: "$48", rating: "4.5", tint: [227, 208, 230, 1] },
  { id: "p6", name: "Wool Socks", price: "$18", rating: "4.7", tint: [217, 222, 226, 1] },
] as const;

const shopBar = (): Element =>
  box(
    "bar",
    [0, 0, 1000, 60],
    [
      text("logo", "Northwind", [20, 18, 120, 24], { fontWeight: 800, fontSize: 18 }),
      control("search", "Search products", [300, 14, 400, 32], { ...GHOST, background: [255, 255, 255, 1] }),
      control("cart", "Cart (2)", [880, 14, 100, 32], GHOST),
    ],
    { background: BAR, radius: 0 },
  );

const shopGrid = page(1000, [
  shopBar(),
  heading("h", "New arrivals", [20, 80, 300, 32]),
  ...["All", "Outerwear", "Bags", "Socks"].map((c, i) => control(`chip.${c}`, c, [600 + i * 95, 82, 85, 28], CHIP)),
  ...PRODUCTS.map((p, i) => {
    const x = 20 + (i % 3) * 330;
    const y = 130 + Math.floor(i / 3) * 300;
    return box(
      p.id,
      [x, y, 310, 280],
      [
        box(`${p.id}.img`, [x + 10, y + 10, 290, 150], [media(`${p.id}.svg`, `glyph-${p.id}`, [x + 125, y + 55, 60, 60])], {
          background: p.tint,
        }),
        text(`${p.id}.name`, p.name, [x + 10, y + 170, 200, 20], { fontWeight: 600 }),
        text(`${p.id}.price`, p.price, [x + 10, y + 200, 60, 20]),
        text(`${p.id}.rating`, `★ ${p.rating}`, [x + 220, y + 200, 60, 20], { color: MUTED }),
        control(`${p.id}.add`, "Add", [x + 10, y + 235, 60, 30]),
      ],
    );
  }),
]);

const detail = PRODUCTS[2];
const shopDetail = page(1000, [
  shopBar(),
  box("p3.img", [20, 90, 460, 360], [media("p3.svg", "glyph-p3", [190, 210, 120, 120])], { background: detail.tint }),
  text("h", "← New arrivals", [520, 90, 200, 20], { color: MUTED }),
  heading("p3.name", detail.name, [520, 120, 400, 40], { fontSize: 32 }),
  text("p3.price", detail.price, [520, 175, 100, 30], { fontSize: 22, fontWeight: 600 }),
  text("p3.rating", `★ ${detail.rating}`, [640, 180, 60, 20], { color: MUTED }),
  text("d.desc", "A roll-top daypack in waxed canvas with a padded laptop sleeve and side bottle pockets.", [520, 220, 440, 60]),
  ...["S", "M", "L"].map((s, i) => control(`size.${s}`, s, [520 + i * 50, 300, 40, 32], CHIP)),
  control("p3.add", "Add to cart", [520, 400, 200, 44]),
  heading("more", "You might also like", [20, 480, 300, 24], { fontSize: 18 }),
  ...[PRODUCTS[0], PRODUCTS[4], PRODUCTS[5]].map((p, i) => {
    const x = 20 + i * 330;
    return box(
      p.id,
      [x, 520, 310, 90],
      [
        box(`${p.id}.img`, [x + 10, 530, 70, 70], [media(`${p.id}.svg`, `glyph-${p.id}`, [x + 25, 545, 40, 40])], {
          background: p.tint,
        }),
        text(`${p.id}.name`, p.name, [x + 90, 540, 200, 20], { fontWeight: 600 }),
        text(`${p.id}.price`, p.price, [x + 90, 570, 60, 20]),
      ],
    );
  }),
]);

type Task = { id: string; title: string; tag: string; who: string; column: number };
const TASKS_BEFORE: Task[] = [
  { id: "pricing", title: "Update pricing page", tag: "Copy", who: "AL", column: 0 },
  { id: "tokens", title: "Audit colour tokens", tag: "Design", who: "JM", column: 0 },
  { id: "alerts", title: "Set up error alerts", tag: "Infra", who: "RK", column: 0 },
  { id: "login", title: "Fix login redirect", tag: "Bug", who: "AL", column: 1 },
  { id: "hooks", title: "Migrate billing webhooks", tag: "Infra", who: "SN", column: 1 },
  { id: "dark", title: "Ship dark mode", tag: "Feature", who: "JM", column: 2 },
  { id: "onboard", title: "Onboarding checklist", tag: "Feature", who: "RK", column: 2 },
];
const TASKS_AFTER: Task[] = [
  { id: "notes", title: "Write release notes", tag: "Docs", who: "SN", column: 0 },
  { ...TASKS_BEFORE[0]!, title: "Update pricing page copy" },
  TASKS_BEFORE[1]!,
  TASKS_BEFORE[2]!,
  TASKS_BEFORE[4]!,
  { ...TASKS_BEFORE[3]!, column: 2 },
  TASKS_BEFORE[5]!,
  TASKS_BEFORE[6]!,
];
const AVATAR: Record<string, Rgba> = { AL: [110, 86, 207, 1], JM: [194, 65, 12, 1], RK: [21, 128, 61, 1], SN: [14, 116, 144, 1] };

const board = (tasks: Task[]) =>
  page(1000, [
    heading("title", "Sprint 14", [20, 20, 300, 32]),
    ...["To do", "In progress", "Done"].map((name, c) => {
      const x = 20 + c * 325;
      const cards = tasks.filter((t) => t.column === c);
      return box(
        `col.${c}`,
        [x, 70, 310, 560],
        [
          heading(`col.${c}.h`, name, [x + 12, 82, 200, 22], { fontSize: 16 }),
          text(`col.${c}.n`, String(cards.length), [x + 270, 82, 28, 22], CHIP),
          ...cards.map((t, k) => {
            const y = 120 + k * 92;
            return box(
              t.id,
              [x + 10, y, 290, 80],
              [
                text(`${t.id}.t`, t.title, [x + 22, y + 12, 260, 20], { fontWeight: 600 }),
                text(`${t.id}.c`, t.tag, [x + 22, y + 46, 60, 20], CHIP),
                text(`${t.id}.av`, t.who, [x + 262, y + 44, 24, 24], {
                  color: [255, 255, 255, 1],
                  background: AVATAR[t.who]!,
                  radius: 999,
                }),
              ],
            );
          }),
        ],
        { background: BAR },
      );
    }),
  ]);

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
const ROWS = [
  ["acme", "Acme Corp", "US", "$84,200"],
  ["bright", "Brightline", "Europe", "$61,050"],
  ["cobalt", "Cobalt Labs", "Europe", "$44,900"],
  ["dun", "Dunmore", "APAC", "$39,300"],
  ["elk", "Elkhorn", "Europe", "$22,780"],
  ["fjord", "Fjordway", "US", "$18,400"],
];

const dashboard = (europe: boolean) => {
  const kpis = europe ? KPI_EU : KPI_ALL;
  const rows = europe ? ROWS.filter((r) => r[2] === "Europe") : ROWS;
  return page(1000, [
    heading("title", "Revenue overview", [20, 20, 360, 32]),
    ...(europe ? [control("filter", "Region: Europe ✕", [520, 22, 150, 28], CHIP)] : []),
    control("region", europe ? "Europe ▾" : "All regions ▾", [690, 22, 130, 28], GHOST),
    control("range", "Last 12 months ▾", [830, 22, 150, 28], GHOST),
    ...kpis.map(([label, value, delta], i) => {
      const x = 20 + i * 245;
      return box(
        `k${i}`,
        [x, 70, 230, 110],
        [
          text(`k${i}.l`, label!, [x + 14, 84, 150, 18], { color: MUTED, fontSize: 13 }),
          text(`k${i}.v`, value!, [x + 14, 108, 150, 34], { fontSize: 28, fontWeight: 700 }),
          text(`k${i}.d`, delta!, [x + 14, 150, 80, 18], {
            color: delta!.startsWith("+") ? [21, 128, 61, 1] : [194, 65, 12, 1],
            fontSize: 13,
          }),
        ],
      );
    }),
    box(
      "table",
      [20, 200, 960, 60 + rows.length * 44],
      [
        text("th.a", "Account", [36, 214, 200, 20], { color: MUTED, fontWeight: 600 }),
        text("th.r", "Region", [436, 214, 200, 20], { color: MUTED, fontWeight: 600 }),
        text("th.v", "Amount", [836, 214, 120, 20], { color: MUTED, fontWeight: 600 }),
        ...rows.map(([key, name, region, amount], k) => {
          const y = 248 + k * 44;
          return box(
            `r.${key}`,
            [28, y, 944, 40],
            [
              text(`r.${key}.n`, name!, [36, y + 10, 300, 20]),
              text(`r.${key}.r`, region!, [436, y + 10, 200, 20], { color: MUTED }),
              text(`r.${key}.v`, amount!, [836, y + 10, 120, 20]),
            ],
            { background: [0, 0, 0, 0] },
          );
        }),
        text("count", `Showing ${rows.length} of 6`, [36, 252 + rows.length * 44, 200, 18], { color: MUTED, fontSize: 13 }),
      ],
    ),
  ]);
};

const ITEMS = [
  ["Field notebook", "€24"],
  ["Brass pen", "€38"],
  ["Canvas tote", "€86"],
];
const steps = (at: number) =>
  ["Cart", "Shipping", "Review"].map((s, i) =>
    text(
      `step.${s}`,
      `${i + 1}. ${s}`,
      [20 + i * 120, 20, 110, 28],
      i === at ? { ...CHIP, background: [14, 124, 114, 1], color: [255, 255, 255, 1] } : CHIP,
    ),
  );
const summary = (review: boolean): Element =>
  box(
    "sum",
    [640, 70, 340, 380],
    [
      heading("sum.h", "Order summary", [656, 86, 200, 22], { fontSize: 16 }),
      ...(review
        ? [text("items", "Field notebook, Brass pen, Canvas tote", [656, 124, 300, 40])]
        : ITEMS.flatMap(([name, price], i) => [
            text("into:items", name!, [656, 124 + i * 28, 200, 20]),
            text(`i${i}.p`, price!, [920, 124 + i * 28, 44, 20]),
          ])),
      ...[
        ["Subtotal", "€148"],
        ["Shipping", "€6"],
        ["Total", "€154"],
      ].flatMap(([label, value], i) => [
        text(`${label}.l`, label!, [656, 240 + i * 30, 120, 20], label === "Total" ? { fontWeight: 700 } : {}),
        text(`${label}.v`, value!, [910, 240 + i * 30, 54, 20], label === "Total" ? { fontWeight: 700 } : {}),
      ]),
      control("cta", review ? "Place order" : "Continue to review", [656, 380, 308, 44]),
    ],
  );

const checkoutForm = page(1000, [
  ...steps(1),
  heading("h", "Shipping details", [20, 70, 400, 32]),
  heading("contact", "Contact", [20, 120, 200, 22], { fontSize: 16 }),
  text("lb.first", "First name", [20, 152, 140, 18], { color: MUTED, fontSize: 13 }),
  control("into:name", "Ada", [20, 172, 280, 40], { ...GHOST, background: [255, 255, 255, 1], fontWeight: 400 }),
  text("lb.last", "Last name", [320, 152, 140, 18], { color: MUTED, fontSize: 13 }),
  control("into:name", "Lovelace", [320, 172, 280, 40], { ...GHOST, background: [255, 255, 255, 1], fontWeight: 400 }),
  text("lb.email", "Email", [20, 226, 140, 18], { color: MUTED, fontSize: 13 }),
  control("email", "ada@lovelace.dev", [20, 246, 580, 40], { ...GHOST, background: [255, 255, 255, 1], fontWeight: 400 }),
  heading("shipto", "Ship to", [20, 306, 200, 22], { fontSize: 16 }),
  text("lb.addr", "Address", [20, 338, 140, 18], { color: MUTED, fontSize: 13 }),
  control("addr", "12 Rue de Rivoli, 75001 Paris", [20, 358, 580, 40], { ...GHOST, background: [255, 255, 255, 1], fontWeight: 400 }),
  summary(false),
]);

const checkoutReview = page(1000, [
  ...steps(2),
  heading("h", "Review your order", [20, 70, 400, 32]),
  heading("contact", "Contact", [20, 120, 200, 22], { fontSize: 16 }),
  text("edit1", "Edit", [560, 122, 40, 18], { color: [14, 124, 114, 1] }),
  text("name", "Ada Lovelace", [20, 152, 300, 22]),
  text("email", "ada@lovelace.dev", [20, 178, 300, 20], { color: MUTED }),
  heading("shipto", "Ship to", [20, 220, 200, 22], { fontSize: 16 }),
  text("edit2", "Edit", [560, 222, 40, 18], { color: [14, 124, 114, 1] }),
  text("from:addr", "12 Rue de Rivoli", [20, 252, 300, 22]),
  text("from:addr", "75001 Paris", [20, 278, 300, 22]),
  summary(true),
]);

const NAV = ["Profile", "Notifications", "Billing", "Security"];
const TOGGLES = [
  ["t1", "Email digests", true],
  ["t2", "Mentions", true],
  ["t3", "Product updates", false],
] as const;
const ON: Rgba = [14, 124, 114, 1];
const OFF: Rgba = [203, 210, 220, 1];
const toggle = (key: string, on: boolean, x: number, y: number): Element =>
  box(`${key}.s`, [x, y, 44, 26], [box(`${key}.k`, [on ? x + 20 : x + 2, y + 2, 22, 22], [], { radius: 999 })], {
    background: on ? ON : OFF,
    radius: 999,
  });
const AV = { color: [255, 255, 255, 1], background: [110, 86, 207, 1], radius: 999, fontWeight: 700 } as const;
const FIELD = { ...GHOST, background: [255, 255, 255, 1], fontWeight: 400 } as const;
const BIO = "Analyst. Writes about engines and the people who build them.";

const settingsDesktop = page(1000, [
  box(
    "nav",
    [0, 0, 220, 700],
    NAV.map((n, i) => control(`n.${n}`, n, [12, 20 + i * 44, 196, 36], i === 0 ? CHIP : GHOST)),
    {
      background: BAR,
      radius: 0,
    },
  ),
  heading("h", "Profile", [260, 24, 300, 32]),
  text("av", "AL", [260, 80, 64, 64], AV),
  control("photo", "Change photo", [340, 96, 140, 32], GHOST),
  text("l.name", "Display name", [260, 170, 200, 18], { color: MUTED, fontSize: 13 }),
  control("name", "Ada Lovelace", [260, 190, 480, 40], FIELD),
  text("l.bio", "Bio", [260, 246, 200, 18], { color: MUTED, fontSize: 13 }),
  control("bio", BIO, [260, 266, 480, 64], FIELD),
  box(
    "tg",
    [260, 350, 480, 150],
    TOGGLES.flatMap(([key, label, on], i) => [text(`${key}.l`, label, [276, 366 + i * 44, 240, 22]), toggle(key, on, 680, 364 + i * 44)]),
  ),
  control("save", "Save changes", [600, 530, 140, 40]),
]);

const settingsMobile = page(400, [
  heading("h", "Profile", [16, 16, 300, 32]),
  box(
    "nav",
    [0, 60, 400, 48],
    NAV.map((n, i) => control(`n.${n}`, n, [8 + i * 98, 66, 92, 36], i === 0 ? CHIP : GHOST)),
    {
      background: BAR,
      radius: 0,
    },
  ),
  text("av", "AL", [168, 128, 64, 64], AV),
  control("photo", "Change photo", [130, 204, 140, 32], GHOST),
  text("l.name", "Display name", [16, 256, 200, 18], { color: MUTED, fontSize: 13 }),
  control("name", "Ada Lovelace", [16, 276, 368, 40], FIELD),
  text("l.bio", "Bio", [16, 332, 200, 18], { color: MUTED, fontSize: 13 }),
  control("bio", BIO, [16, 352, 368, 88], FIELD),
  box(
    "tg",
    [16, 460, 368, 150],
    TOGGLES.flatMap(([key, label, on], i) => [text(`${key}.l`, label, [32, 476 + i * 44, 240, 22]), toggle(key, on, 324, 474 + i * 44)]),
  ),
  control("save", "Save changes", [16, 630, 368, 44]),
]);

export const scenarios: Scenario[] = [
  {
    id: "shop",
    name: "Shop",
    note: "A grid card becomes the detail page; three other cards come back as smaller recommendations.",
    from: shopGrid,
    to: shopDetail,
  },
  {
    id: "board",
    name: "Board",
    note: "A card moves to Done, one is added, one is renamed, and every column count changes.",
    from: board(TASKS_BEFORE),
    to: board(TASKS_AFTER),
  },
  {
    id: "dashboard",
    name: "Dashboard",
    note: "Every number changes and half the table goes: values must be matched by their slot, not their text.",
    from: dashboard(false),
    to: dashboard(true),
  },
  {
    id: "checkout",
    name: "Checkout",
    note: "First and last name merge, the address splits in two, and three items merge into one line.",
    from: checkoutForm,
    to: checkoutReview,
  },
  {
    id: "settings",
    name: "Settings",
    note: "The same content rebuilt for mobile: different layout, order and widths, with identical switches.",
    from: settingsDesktop,
    to: settingsMobile,
  },
];
