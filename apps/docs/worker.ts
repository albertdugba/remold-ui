import { EVENTS, type EventProps, type UsageEvent } from "./lib/analytics";

type DataPoint = { blobs?: string[]; doubles?: number[]; indexes?: string[] };

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  USAGE: { writeDataPoint: (point: DataPoint) => void };
};

const REGISTRY_ITEM = /^\/r\/([\w-]+)\.json$/;
const MAX_FIELD = 80;
const MAX_BODY = 1024;

const field = (value: unknown) => (typeof value === "string" ? value.slice(0, MAX_FIELD) : "");

const isEvent = (value: unknown): value is UsageEvent => (EVENTS as readonly unknown[]).includes(value);

// The first word of the user agent: "shadcn" for the CLI, and "curl", "node" or a crawler's name for the rest.
const clientOf = (request: Request) => field(request.headers.get("User-Agent")?.split(/[\s/]/)[0]) || "unknown";

function record(env: Env, request: Request, event: string, { component = "", source = "", detail = "" }: EventProps) {
  env.USAGE.writeDataPoint({
    indexes: [event],
    blobs: [event, component, source, detail, request.headers.get("CF-IPCountry") ?? ""],
    doubles: [1],
  });
}

async function recordInstall(request: Request, env: Env) {
  const response = await env.ASSETS.fetch(request);
  const component = new URL(request.url).pathname.match(REGISTRY_ITEM)?.[1];

  const openedInBrowser = request.headers.get("Sec-Fetch-Mode") === "navigate";

  if (request.method === "GET" && response.ok && component && component !== "registry" && !openedInBrowser) {
    record(env, request, "Registry install", { component, source: "shadcn", detail: clientOf(request) });
  }

  return response;
}

async function recordEvent(request: Request, env: Env) {
  if (request.method !== "POST") return new Response(null, { status: 405 });

  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!isEvent(body.event)) return new Response(null, { status: 400 });

  record(env, request, body.event, { component: field(body.component), source: field(body.source), detail: field(body.detail) });
  return new Response(null, { status: 204 });
}

export default {
  fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/event") return recordEvent(request, env);
    return recordInstall(request, env);
  },
};
