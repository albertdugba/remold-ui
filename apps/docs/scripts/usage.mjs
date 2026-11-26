#!/usr/bin/env node
/**
 * Prints how often each component was installed through shadcn or copied from the docs, from the
 * Workers Analytics Engine dataset the site's Worker writes to.
 *
 *   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… pnpm usage [days]
 *
 * The token needs the "Account Analytics: Read" permission.
 */
const DATASET = "remold_usage";

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
  SELECT blob1 AS event, blob2 AS component, SUM(_sample_interval) AS count
  FROM ${DATASET}
  WHERE timestamp > NOW() - INTERVAL '${days}' DAY
  GROUP BY event, component
  ORDER BY count DESC
  LIMIT 200
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
} else {
  console.log(`Last ${days} days`);
  console.table(data.map(({ event, component, count }) => ({ event, component: component || "—", count: Number(count) })));
}
