/**
 * Text that changes in place. `<Remold.Text>` keeps the letters two strings share (runs of
 * two or more, in order) and slides them to their new spots; only the rest fade in or out.
 */
import { springs, Remold } from "@remold-ui/react";
import { useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { Segmented } from "../ui/controls";
import { StaticIcon } from "../ui/MorphIcon";

/* A headline whose last word rotates. */

const AUDIENCES = ["designers", "developers", "writers", "researchers", "storytellers"] as const;
type Audience = (typeof AUDIENCES)[number];

function HeadlineDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [audience, setAudience] = useState<Audience>("designers");
  // On its own page it rotates until you pick a word.
  const [cycling, setCycling] = useState(true);
  useAutoplay(autoplay || (!preview && cycling), 2200, () => setAudience((a) => AUDIENCES[(AUDIENCES.indexOf(a) + 1) % AUDIENCES.length]!));

  return (
    <div className="demo-panel">
      <p className="rotating-headline">
        Made for
        <br />
        <Remold.Text className="rotating-word" spring={springs.bouncy} loop={loop} reducedMotion={reducedMotion}>
          {audience}
        </Remold.Text>
      </p>
      {!preview && (
        <Segmented
          label="Audience"
          options={AUDIENCES}
          value={audience}
          onChange={(a) => {
            setCycling(false);
            setAudience(a);
          }}
        />
      )}
    </div>
  );
}

export const headline: Example = {
  id: "headline",
  category: "Text",
  title: "Rotating headline",
  summary: "The last word of a headline changes; letters both words share slide over instead of retyping.",
  headline: (
    <>
      Change the word,
      <br />
      keep the letters.
    </>
  ),
  lead: "A hero headline that rotates through audiences. “designers” and “developers” share their first two letters and their ending, so those letters move to their new places while the middle is swapped.",
  tries: [
    "Watch “designers” become “developers”: the “de” and the “ers” glide; only the middle changes.",
    "Pick words quickly. Each change starts from the letters on screen, so nothing jumps.",
    "Turn on Reduce motion: the word cross-fades in place instead.",
  ],
  code: `
<h1>
  Made for{" "}
  <Remold.Text spring={springs.bouncy}>
    {audience}
  </Remold.Text>
</h1>
`,
  uses: [{ name: "Remold.Text", role: "Morphs the rotating word letter by letter, keeping the letters both words share." }],
  frame: "panel",
  Demo: HeadlineDemo,
};

/* A pricing card: every figure is text that morphs. */

type Billing = "Monthly" | "Yearly";
const RATE: Record<Billing, number> = { Monthly: 12, Yearly: 10 };
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

function PricingDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [billing, setBilling] = useState<Billing>("Monthly");
  const [seats, setSeats] = useState(5);
  useAutoplay(autoplay, 1800, (count) => {
    const beat = count % 4;
    if (beat === 0) setBilling("Yearly");
    else if (beat === 1) setSeats(12);
    else if (beat === 2) setBilling("Monthly");
    else setSeats(5);
  });

  const perMonth = RATE[billing] * seats;
  const text = { loop, reducedMotion };
  return (
    <div className="demo-panel">
      <div className="surface pricing">
        <div className="pricing-head">
          <p className="pricing-plan">Team</p>
          <Segmented label="Billing" options={["Monthly", "Yearly"] as const} value={billing} onChange={setBilling} />
        </div>
        <p className="pricing-price">
          <Remold.Text {...text}>{money(perMonth)}</Remold.Text>
          <Remold.Text className="pricing-period" {...text}>
            {billing === "Monthly" ? "per month" : "per month, billed yearly"}
          </Remold.Text>
        </p>
        <div className="pricing-seats">
          <button type="button" aria-label="Remove a seat" onClick={() => setSeats((s) => Math.max(1, s - 1))} disabled={preview}>
            <StaticIcon name="minus" />
          </button>
          <Remold.Text className="pricing-count" aria-live="polite" {...text}>
            {`${seats} ${seats === 1 ? "seat" : "seats"}`}
          </Remold.Text>
          <button type="button" aria-label="Add a seat" onClick={() => setSeats((s) => Math.min(99, s + 1))} disabled={preview}>
            <StaticIcon name="plus" />
          </button>
        </div>
        <p className="pricing-total">
          <Remold.Text {...text}>
            {billing === "Monthly"
              ? `${money(perMonth)} every month`
              : `${money(perMonth * 12)} every year · you save ${money(seats * 24)}`}
          </Remold.Text>
        </p>
      </div>
    </div>
  );
}

export const pricing: Example = {
  id: "pricing",
  category: "Text",
  title: "Pricing card",
  summary: "Prices, periods and totals change character by character as you switch billing or add seats.",
  headline: (
    <>
      Numbers that
      <br />
      show their working.
    </>
  ),
  lead: "Switch to yearly billing or add a seat and every figure updates in place. Digits that stay the same stay put, so your eye goes straight to the part that changed.",
  tries: [
    "Switch Monthly and Yearly: “per month” keeps its letters and grows “, billed yearly”.",
    "Press + a few times. Only the digits that change move.",
    "Turn on Slow motion and watch “$60” become “$120”.",
  ],
  code: `
<Remold.Text>{formatPrice(perMonth)}</Remold.Text>
<Remold.Text>
  {billing === "monthly" ? "per month" : "per month, billed yearly"}
</Remold.Text>
`,
  uses: [{ name: "Remold.Text", role: "Every figure and label on the card: price, period, seat count and total." }],
  frame: "panel",
  Demo: PricingDemo,
};

/* A greeting in the reader's language. */

const GREETINGS = [
  { lang: "en", name: "English", text: "Welcome back" },
  { lang: "es", name: "Español", text: "Bienvenido de nuevo" },
  { lang: "fr", name: "Français", text: "Bon retour" },
  { lang: "pt", name: "Português", text: "Bem-vindo de volta" },
  { lang: "it", name: "Italiano", text: "Bentornato" },
  { lang: "de", name: "Deutsch", text: "Willkommen zurück" },
] as const;
type Language = (typeof GREETINGS)[number]["name"];

function TranslateDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [name, setName] = useState<Language>("English");
  useAutoplay(autoplay, 1800, () => setName((n) => GREETINGS[(GREETINGS.findIndex((g) => g.name === n) + 1) % GREETINGS.length]!.name));
  const greeting = GREETINGS.find((g) => g.name === name)!;
  return (
    <div className="demo-panel">
      <p className="greeting">
        <Remold.Text lang={greeting.lang} spring={springs.bouncy} loop={loop} reducedMotion={reducedMotion}>
          {greeting.text}
        </Remold.Text>
        <span className="greeting-name">, Sam</span>
      </p>
      {!preview && <Segmented label="Language" options={GREETINGS.map((g) => g.name)} value={name} onChange={setName} />}
    </div>
  );
}

export const translate: Example = {
  id: "translate",
  category: "Text",
  title: "Translated greeting",
  summary: "“Welcome back” in six languages; letters the languages share stay put while the rest change.",
  headline: (
    <>
      Switch language
      <br />
      without a flash.
    </>
  ),
  lead: "Changing language usually blanks the page and redraws it. Here the greeting changes in place: “Bienvenido” and “Bem-vindo” share their start, “Bentornato” keeps the “Ben”, and only the letters that differ move in or out.",
  tries: [
    "Go from Español to Português: “Bienvenido” and “Bem-vindo” keep the letters they share.",
    "Go from Português to Italiano: the “Be” stays and the rest rebuilds around it.",
    "The element's lang changes too, so screen readers pronounce each language properly.",
  ],
  code: `
<Remold.Text lang={language.code} spring={springs.bouncy}>
  {t("welcome_back")}
</Remold.Text>
`,
  uses: [{ name: "Remold.Text", role: "Morphs the greeting between languages, keeping shared letters." }],
  frame: "panel",
  Demo: TranslateDemo,
};

/* A departures board whose statuses, gates and times update. */

const FLIGHTS = [
  {
    code: "TL 204",
    to: "Lisbon",
    times: ["09:40", "09:40", "09:40", "09:40"],
    gates: ["B12", "B12", "B14", "B14"],
    statuses: ["On time", "Boarding", "Gate change", "Departed"],
  },
  {
    code: "TL 318",
    to: "Reykjavík",
    times: ["10:05", "10:25", "10:40", "10:40"],
    gates: ["C3", "C3", "C3", "C7"],
    statuses: ["On time", "Delayed 20 min", "Delayed 35 min", "Boarding"],
  },
  {
    code: "TL 77",
    to: "Nairobi",
    times: ["10:30", "10:30", "10:30", "10:30"],
    gates: ["A2", "A2", "A2", "A2"],
    statuses: ["Check in", "On time", "Go to gate", "Boarding"],
  },
  {
    code: "TL 512",
    to: "Osaka",
    times: ["11:15", "11:15", "11:15", "11:50"],
    gates: ["—", "D9", "D9", "D9"],
    statuses: ["Check in", "On time", "On time", "Delayed 35 min"],
  },
];

function BoardDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [tick, setTick] = useState(0);
  useAutoplay(autoplay, 1700, () => setTick((t) => (t + 1) % 4));
  const text = { loop, reducedMotion };
  return (
    <div className="demo-panel">
      <div className="board" role="table" aria-label="Departures">
        <div className="board-row board-head" role="row">
          <span role="columnheader">Time</span>
          <span role="columnheader">Flight</span>
          <span role="columnheader">To</span>
          <span role="columnheader">Gate</span>
          <span role="columnheader">Status</span>
        </div>
        {FLIGHTS.map((f) => {
          const status = f.statuses[tick]!;
          return (
            <div key={f.code} className="board-row" role="row">
              <Remold.Text role="cell" {...text}>
                {f.times[tick]!}
              </Remold.Text>
              <span role="cell">{f.code}</span>
              <span role="cell">{f.to}</span>
              <Remold.Text role="cell" {...text}>
                {f.gates[tick]!}
              </Remold.Text>
              <Remold.Text
                role="cell"
                className="board-status"
                data-tone={/Delayed|change/.test(status) ? "warn" : /Boarding|Go to/.test(status) ? "go" : undefined}
                {...text}
              >
                {status}
              </Remold.Text>
            </div>
          );
        })}
      </div>
      <button type="button" className="pill-button" onClick={() => setTick((t) => (t + 1) % 4)}>
        Next update
      </button>
    </div>
  );
}

export const board: Example = {
  id: "departures",
  category: "Text",
  title: "Departures board",
  summary: "Statuses, gates and times update in place: “Delayed 20 min” becomes “Delayed 35 min” by changing two digits.",
  headline: (
    <>
      Only the part
      <br />
      that changed moves.
    </>
  ),
  lead: "A live table is hard to scan when every update repaints it. Here each cell morphs from its old text to its new one, so a delay that grows from 20 to 35 minutes changes two digits, and a gate change from B12 to B14 changes one.",
  tries: [
    "Press Next update a few times and watch TL 318's delay grow digit by digit.",
    "Watch TL 204's gate: only the last character changes.",
    "Turn on Slow motion to see shared letters slide between “On time” and “Boarding”.",
  ],
  code: `
<Remold.Text role="cell">{flight.gate}</Remold.Text>
<Remold.Text role="cell">{flight.status}</Remold.Text>
`,
  uses: [{ name: "Remold.Text", role: "Each time, gate and status cell, morphing on every update." }],
  frame: "panel",
  Demo: BoardDemo,
};

/* A delivery tracker. */

const ORDER = [
  { status: "Order confirmed", detail: "We've sent it to the kitchen", eta: "Arrives 12:45", step: 0 },
  { status: "Preparing your order", detail: "Two salads and a lemonade", eta: "Arrives 12:45", step: 1 },
  { status: "Out for delivery", detail: "Sam is on the way by bike", eta: "Arrives 12:38", step: 2 },
  { status: "Arriving in 3 minutes", detail: "Sam is on your street", eta: "Arrives 12:35", step: 2 },
  { status: "Delivered", detail: "Left with you at the door", eta: "Arrived 12:34", step: 3 },
];

function OrderDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [index, setIndex] = useState(0);
  useAutoplay(autoplay, 1600, () => setIndex((i) => (i + 1) % ORDER.length));
  const now = ORDER[index]!;
  const text = { loop, reducedMotion };
  return (
    <div className="demo-panel">
      <div className="surface order">
        <Remold.Text className="order-eta" {...text}>
          {now.eta}
        </Remold.Text>
        <Remold.Text className="order-status" aria-live="polite" {...text}>
          {now.status}
        </Remold.Text>
        <Remold.Text className="order-detail" {...text}>
          {now.detail}
        </Remold.Text>
        <div className="order-steps" aria-hidden="true">
          {[0, 1, 2, 3].map((s) => (
            <i key={s} data-done={s <= now.step || undefined} />
          ))}
        </div>
        <button type="button" className="pill-button" onClick={() => setIndex((i) => (i + 1) % ORDER.length)}>
          Next update
        </button>
      </div>
    </div>
  );
}

export const order: Example = {
  id: "order",
  category: "Text",
  title: "Order tracker",
  summary: "A delivery status that rewrites itself as the order moves, with the arrival time adjusting digit by digit.",
  headline: (
    <>
      Status updates
      <br />
      you can follow.
    </>
  ),
  lead: "Order trackers change the same few lines over and over. Morphing them in place keeps your eye on the message: “Arrives 12:45” becomes “Arrives 12:38” by changing two digits, and “Arriving” grows out of “Arrives”.",
  tries: [
    "Press Next update and watch the arrival time tick down.",
    "Watch “Out for delivery” become “Arriving in 3 minutes”.",
    "The status is a live region, so screen readers hear each update once.",
  ],
  code: `
<Remold.Text>{order.eta}</Remold.Text>
<Remold.Text aria-live="polite">{order.status}</Remold.Text>
`,
  uses: [{ name: "Remold.Text", role: "The arrival time, the status and the detail line." }],
  frame: "panel",
  Demo: OrderDemo,
};
