"use client";

import type { Diagram, DiagramNode, DiagramOptions } from "@remold-ui/canvas";
import { PAPER, SUN } from "./day-stage";
import { DiagramStage, STAGE_BUTTON, type Say } from "./diagram-stage";

const CAPACITY = 8;
const SPARE = 6;
const REFILL_SECONDS = 0.8;
const BURST = 10;
const BURST_GAP = 0.12;

const CLIENT_AT = [-400, 130] as const;
const BUCKET_AT = [-70, -150] as const;
const API_AT = [310, 70] as const;
const BUCKET_TOP = 16;
const COIN_STEP = 7;
const API_TOP = 36;
const DROP_Z = 190;
const FLIGHT_ARC = 150;
const FLIGHT_SECONDS = 0.8;
const RETURN_SECONDS = 1;

const ACCENT = "212, 160, 23";
const ERROR = "220, 38, 38";

const coinId = (index: number) => `coin${index}`;
const COINS = Array.from({ length: CAPACITY + SPARE }, (_, index) => coinId(index));
const stackZ = (height: number) => BUCKET_TOP + height * COIN_STEP;

interface Bucket {
  diagram: Diagram;
  say: Say;
  stack: string[];
  spare: string[];
  driving: boolean;
}

const buckets = new WeakMap<Diagram, Bucket>();

const coins = (): Record<string, DiagramNode> =>
  Object.fromEntries(
    COINS.map((id, index) => [
      id,
      {
        look: "coin",
        at: BUCKET_AT,
        size: 74,
        z: index < CAPACITY ? stackZ(index) : DROP_Z,
        hidden: index >= CAPACITY,
        palette: SUN,
      },
    ]),
  );

const options = (): DiagramOptions => ({
  label: `Rate limiting with a token bucket: it holds ${CAPACITY} tokens and refills one every ${REFILL_SECONDS} seconds. Each request spends a token; with none left, requests get a 429.`,
  palette: PAPER,
  camera: { zoom: 1.05, yaw: 45, pitch: 58, centerX: -20, centerY: -40 },
  nodes: {
    client: { look: "browser", label: "Your client", at: CLIENT_AT, size: [150, 110] },
    bucket: { look: "plate", label: `Token bucket · ${CAPACITY}/${CAPACITY}`, at: BUCKET_AT, size: 170, height: BUCKET_TOP },
    api: { look: "server", label: "API", at: API_AT, size: 130 },
    ...coins(),
  },
  links: [
    ["client", "bucket"],
    ["bucket", "api"],
    { from: "api", to: "client", dashed: true },
  ],
  colors: { packet: ACCENT, label: "#27272a", surface: "255, 255, 255" },
});

const count = (bucket: Bucket) => bucket.diagram.relabel("bucket", `Token bucket · ${bucket.stack.length}/${CAPACITY}`);

const ignoreReset = (work: Promise<void>) => void work.catch(() => undefined);

async function spend(bucket: Bucket, coin: string) {
  const { diagram } = bucket;

  diagram.move(coin, API_AT, { arc: FLIGHT_ARC });
  diagram.lift(coin, API_TOP);
  await diagram.wait(FLIGHT_SECONDS);
  diagram.hide(coin);

  const response = diagram.send("api", "client", { label: "200 OK", duration: 0.7 });

  diagram.move(coin, BUCKET_AT);
  diagram.lift(coin, DROP_Z);
  await diagram.wait(RETURN_SECONDS);
  bucket.spare.push(coin);
  await response;
}

async function refuse(bucket: Bucket) {
  const { diagram, say } = bucket;

  say("429 Too Many Requests · the bucket is empty");
  diagram.status("bucket", "error");
  await diagram.send("bucket", "client", { label: "429", color: ERROR, duration: 0.6 });

  if (bucket.stack.length > 0) diagram.status("bucket", null);
}

async function request(bucket: Bucket) {
  await bucket.diagram.send("client", "bucket", { label: "GET /api", duration: 0.55 });

  const coin = bucket.stack.pop();

  if (!coin) {
    await refuse(bucket);
    return;
  }

  count(bucket);
  bucket.say(`200 OK · one token spent, ${bucket.stack.length} left`);
  await spend(bucket, coin);
}

async function refill(bucket: Bucket): Promise<void> {
  const { diagram } = bucket;

  for (;;) {
    await diagram.wait(REFILL_SECONDS);

    const coin = bucket.stack.length < CAPACITY ? bucket.spare.shift() : undefined;

    if (!coin) continue;

    diagram.show(coin);
    diagram.lift(coin, stackZ(bucket.stack.length));
    bucket.stack.push(coin);
    count(bucket);
    diagram.status("bucket", null);
  }
}

async function burst(bucket: Bucket) {
  for (let index = 0; index < BURST; index++) {
    ignoreReset(request(bucket));
    await bucket.diagram.wait(BURST_GAP);
  }
}

async function demo(bucket: Bucket) {
  const { diagram, say } = bucket;
  const unlessDriving = async (seconds: number) => {
    await diagram.wait(seconds);

    return !bucket.driving;
  };

  while (!bucket.driving) {
    say(`The bucket holds ${CAPACITY} tokens and drips one back every ${REFILL_SECONDS}s`);
    if (!(await unlessDriving(1.6))) return;

    for (let index = 0; index < 3; index++) {
      ignoreReset(request(bucket));
      if (!(await unlessDriving(1.1))) return;
    }

    say("A burst spends them all at once");
    await burst(bucket);
    if (!(await unlessDriving(3.2))) return;

    say("Then it fills back up, a token at a time");
    if (!(await unlessDriving(4.5))) return;
  }
}

async function run(diagram: Diagram, say: Say) {
  const bucket: Bucket = { diagram, say, stack: COINS.slice(0, CAPACITY), spare: COINS.slice(CAPACITY), driving: false };

  buckets.set(diagram, bucket);
  diagram.light(COINS, "on");
  await Promise.all([refill(bucket), demo(bucket)]);
}

function takeOver(diagram: Diagram | null, act: (bucket: Bucket) => Promise<void>) {
  const bucket = diagram ? buckets.get(diagram) : undefined;

  if (!bucket) return;

  bucket.driving = true;
  ignoreReset(act(bucket));
}

function Controls({ diagram }: { diagram: Diagram | null }) {
  return (
    <>
      <button type="button" className={STAGE_BUTTON} onClick={() => takeOver(diagram, request)}>
        Send request
      </button>
      <button type="button" className={STAGE_BUTTON} onClick={() => takeOver(diagram, burst)}>
        Burst ×{BURST}
      </button>
    </>
  );
}

export function TokenBucket() {
  return (
    <DiagramStage
      figure="1.0"
      title="Rate limiting"
      tag="Rate limits"
      options={options}
      script={run}
      first={`The bucket holds ${CAPACITY} tokens and drips one back every ${REFILL_SECONDS}s`}
      controls={(diagram) => <Controls diagram={diagram} />}
    />
  );
}
