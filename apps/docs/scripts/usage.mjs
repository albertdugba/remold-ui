#!/usr/bin/env node
/**
 * Prints a usage report for the docs site: how many components were installed through shadcn, which
 * ones, on which days and from where, plus what was copied from the docs. It reads the Workers
 * Analytics Engine dataset the site's Worker writes to.
 *
 *   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… pnpm usage [days]
 *
 * The token needs the "Account Analytics: Read" permission.
 *
 * An install is one component fetched by the shadcn CLI, which asks for each file twice. Repeat
 * fetches of a component from one country within the same minute therefore count once, and "runs"
 * groups everything one country fetched in a minute, so someone adding ten components at once is
 * ten installs in one run.
 *
 * The Worker records who asked: "shadcn" is the CLI, anything else (curl, a script, a crawler) is
 * listed apart and left out of the installs. Rows from before that was recorded say "cli" and
 * can't be told apart, so they all count as installs.
 */
const DATASET = "remold_usage";
const INSTALL = "Registry install";
const CLI = ["shadcn", "cli"];
const ROW_LIMIT = 10_000;

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const days = Number.parseInt(process.argv[2] ?? "30", 10);

if (!accountId || !token) {
  console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (with Account Analytics: Read).");
  process.exit(1);
}

if (!Number.isInteger(days) || days < 1 || days > 90) {
  console.error("Days must be a whole number from 1 to 90 (Analytics Engine keeps three months).");
  process.exit(1);
}

const query = `
  SELECT toStartOfMinute(timestamp) AS minute, blob1 AS event, blob2 AS component, blob4 AS client, blob5 AS country, SUM(_sample_interval) AS count
  FROM ${DATASET}
  WHERE timestamp > NOW() - INTERVAL '${days}' DAY
  GROUP BY minute, event, component, client, country
  ORDER BY minute DESC
  LIMIT ${ROW_LIMIT}
  FORMAT JSON`;

const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: query,
});

if (!response.ok) {
  console.error(`Cloudflare answered ${response.status}: ${await response.text()}`);
  process.exit(1);
}

const { data } = await response.json();

if (data.length === 0) {
  console.log(`Nothing recorded in the last ${days} days.`);
  process.exit(0);
}

const all = data.map((row) => ({
  event: row.event,
  client: row.client || "—",
  component: row.component || "—",
  country: row.country || "—",
  minute: String(row.minute),
  day: String(row.minute).slice(0, 10),
  count: Number(row.count),
}));

const strangers = all.filter((row) => row.event === INSTALL && !CLI.includes(row.client));
const rows = all.filter((row) => !strangers.includes(row));
const installs = rows.filter((row) => row.event === INSTALL);
const copies = rows.filter((row) => row.event !== INSTALL);

const sum = (list) => list.reduce((total, row) => total + row.count, 0);
const distinct = (list, key) => new Set(list.map(key)).size;
const runKey = (row) => `${row.minute} ${row.country}`;

/** Groups rows by a field and builds one table line per group, ordered by its first count, then the next. */
function table(list, field, columns, limit = 25) {
  const groups = Map.groupBy(list, (row) => row[field]);
  const lines = [...groups].map(([name, group]) => ({ [field]: name, ...columns(group) }));
  const counts = (line) => Object.values(line).filter((value) => typeof value === "number");
  const order = (a, b) => counts(b).reduce((result, value, index) => result || value - counts(a)[index], 0);

  return lines.sort(order).slice(0, limit);
}

const split = (group) => ({
  installs: group.filter((row) => row.event === INSTALL).length,
  "copied install": sum(group.filter((row) => row.event === "Copy install")),
  "copied code": sum(group.filter((row) => row.event === "Copy code")),
});

console.log(`\nLast ${days} days`);
console.table([
  { measure: "Component installs", count: installs.length },
  { measure: "Install runs", count: distinct(installs, runKey) },
  { measure: "Components installed at least once", count: distinct(installs, (row) => row.component) },
  { measure: "Fetches by the CLI, before removing repeats", count: sum(installs) },
  { measure: "Fetches by anything else, not counted", count: sum(strangers) },
  ...table(copies, "event", (group) => ({ count: sum(group) })).map(({ event, count }) => ({ measure: event, count })),
]);

console.log("By component");
console.table(table(rows.filter((row) => row.component !== "—"), "component", split));

console.log("By day");
console.table(
  table(rows, "day", (group) => ({ installs: split(group).installs, "copy clicks": sum(group.filter((row) => row.event !== INSTALL)) }), days).sort((a, b) =>
    b.day.localeCompare(a.day),
  ),
);

console.log("Installs by country");
console.table(table(installs, "country", (group) => ({ installs: group.length, runs: distinct(group, runKey) })));

if (strangers.length > 0) {
  console.log("Fetches that weren't the shadcn CLI");
  console.table(table(strangers, "client", (group) => ({ fetches: sum(group), components: distinct(group, (row) => row.component) })));
}

if (data.length === ROW_LIMIT) console.warn(`Only the newest ${ROW_LIMIT} rows were read, so these totals are low. Ask for fewer days.`);
