/**
 * Fintech pieces for a landing page or an app: a hero of cards that rearrange themselves, a
 * plan picker whose card restyles, a virtual card that reveals its number, and a send-money
 * flow. The bank, the card network and every person here are invented.
 */
import { springs, Remold } from "@remold-ui/react";
import { useState, type CSSProperties } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import type { IconName } from "../icons";
import { useMotion, useRun } from "../motion";
import { Segmented } from "../ui/controls";
import { MorphIcon } from "../ui/MorphIcon";
import { PayCard, type CardTone } from "../ui/PayCard";

/* A hero of cards that rearrange with the message. */

interface Slot {
  x: number;
  y: number;
  width: number;
  z: number;
}

const HERO_CARDS: { tone: CardTone; kind: string; last4: string }[] = [
  { tone: "ocean", kind: "Debit", last4: "4821" },
  { tone: "dusk", kind: "Credit", last4: "7730" },
  { tone: "metal", kind: "Metal", last4: "0001" },
];

/** Where each card sits in a 520 × 300 stage, in each arrangement. */
const ARRANGEMENTS: { name: string; line: string; detail: string; slots: Slot[] }[] = [
  {
    name: "Stack",
    line: "One card for everything.",
    detail: "Spend, save and send from a single account.",
    slots: [0, 1, 2].map((i) => ({ x: 120 + i * 22, y: 40 + i * 26, width: 250, z: i })),
  },
  {
    name: "Fan",
    line: "A card for every plan.",
    detail: "Debit, credit or metal, switch whenever you like.",
    slots: [0, 1, 2].map((i) => ({ x: 6 + i * 128, y: i === 1 ? 50 : 96, width: 250, z: i === 1 ? 3 : i })),
  },
  {
    name: "Spotlight",
    line: "Made of metal.",
    detail: "18 grams of brushed steel, and 1% back on everything.",
    slots: [
      { x: 0, y: 30, width: 190, z: 0 },
      { x: 330, y: 30, width: 190, z: 1 },
      { x: 90, y: 70, width: 340, z: 3 },
    ],
  },
];

function ShowcaseDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [index, setIndex] = useState(0);
  const [cycling, setCycling] = useState(true);
  useAutoplay(autoplay || (!preview && cycling), 2600, () => setIndex((i) => (i + 1) % ARRANGEMENTS.length));
  const arrangement = ARRANGEMENTS[index]!;
  const text = { loop, reducedMotion };

  return (
    <div className="demo-panel">
      <div className="hero-cards">
        <p className="hero-cards-eyebrow">Northwind</p>
        <Remold.Text className="hero-cards-line" spring={springs.bouncy} {...text}>
          {arrangement.line}
        </Remold.Text>
        <Remold.Text className="hero-cards-detail" {...text}>
          {arrangement.detail}
        </Remold.Text>
        <Remold.Layout trigger={index} className="hero-cards-stage" spring={springs.smooth} loop={loop} reducedMotion={reducedMotion}>
          {HERO_CARDS.map((card, i) => {
            const slot = arrangement.slots[i]!;
            const style: CSSProperties = { left: slot.x, top: slot.y, width: slot.width, zIndex: slot.z };
            return (
              <div key={card.last4} className="hero-card" style={style}>
                <PayCard tone={card.tone} kind={card.kind} number={`•••• ${card.last4}`} expires="09/30" />
              </div>
            );
          })}
        </Remold.Layout>
        {!preview && (
          <Segmented
            label="Arrangement"
            options={ARRANGEMENTS.map((a) => a.name)}
            value={arrangement.name}
            onChange={(name) => {
              setCycling(false);
              setIndex(ARRANGEMENTS.findIndex((a) => a.name === name));
            }}
          />
        )}
      </div>
    </div>
  );
}

export const showcase: Example = {
  id: "card-hero",
  category: "Fintech",
  title: "Card hero",
  summary: "A landing-page hero whose cards stack, fan out and step into the spotlight as the headline changes.",
  headline: (
    <>
      A hero that
      <br />
      deals the cards.
    </>
  ),
  lead: "Three cards and a headline for the top of a fintech landing page. Each message has its own arrangement, and moving between them is a single transition: the cards travel and resize to their new places while the headline rewrites itself around the letters it keeps.",
  tries: [
    "Watch it cycle, then pick an arrangement. Every card travels from wherever it is.",
    "Pick Spotlight: the metal card grows to the front while the others step aside.",
    "Turn on Slow motion to see the cards and the headline move together.",
  ],
  code: `
<Remold.Text>{arrangement.line}</Remold.Text>
<Remold.Layout trigger={arrangement.name}>
  {cards.map((card, i) => (
    <div style={arrangement.slots[i]}>
      <Card {...card} />
    </div>
  ))}
</Remold.Layout>
`,
  uses: [
    { name: "Remold.Layout", role: "Moves and resizes each card to its place in the next arrangement." },
    { name: "Remold.Text", role: "The headline and the line under it." },
  ],
  frame: "panel",
  Demo: ShowcaseDemo,
};

/* A plan picker: the card restyles and the perks list grows. */

const PLANS = {
  Standard: { tone: "ocean" as CardTone, price: "Free", perks: ["Free debit card", "Spend in 150 currencies", "Instant notifications"] },
  Plus: {
    tone: "dusk" as CardTone,
    price: "$9 a month",
    perks: ["Free debit card", "Spend in 150 currencies", "Instant notifications", "No foreign fees", "Travel insurance"],
  },
  Metal: {
    tone: "metal" as CardTone,
    price: "$19 a month",
    perks: [
      "Steel card",
      "Spend in 150 currencies",
      "Instant notifications",
      "No foreign fees",
      "Travel insurance",
      "Airport lounges",
      "1% back on everything",
    ],
  },
};
type Plan = keyof typeof PLANS;
const PLAN_NAMES = Object.keys(PLANS) as Plan[];

function PlansDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [plan, setPlan] = useState<Plan>("Standard");
  useAutoplay(autoplay, 2200, () => setPlan((p) => PLAN_NAMES[(PLAN_NAMES.indexOf(p) + 1) % PLAN_NAMES.length]!));
  const now = PLANS[plan];
  return (
    <div className="demo-panel">
      <div className="plans">
        <Segmented label="Plan" options={PLAN_NAMES} value={plan} onChange={setPlan} />
        <div className="plans-card">
          <PayCard
            tone={now.tone}
            kind={
              <Remold.Text loop={loop} reducedMotion={reducedMotion}>
                {plan}
              </Remold.Text>
            }
            number="•••• 4821"
            expires="09/30"
          />
        </div>
        <Remold.Text className="plans-price" loop={loop} reducedMotion={reducedMotion}>
          {now.price}
        </Remold.Text>
        <Remold.Layout trigger={plan} className="plans-perks" spring={springs.snappy} loop={loop} reducedMotion={reducedMotion}>
          <ul>
            {now.perks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        </Remold.Layout>
      </div>
    </div>
  );
}

export const plans: Example = {
  id: "plans",
  category: "Fintech",
  title: "Plan picker",
  summary: "Pick a plan: the card changes finish, the price rewrites itself and new perks slide into the list.",
  headline: (
    <>
      Upgrade you
      <br />
      can see.
    </>
  ),
  lead: "Choosing a plan should feel like getting something. The card's finish blends to the new plan's colours, the price changes in place, and the perks you gain slide into the list while the ones you keep stay exactly where they were.",
  tries: [
    "Pick Plus: two perks join the end of the list; the first three don't move.",
    "Pick Metal: the card turns to steel and the list grows again.",
    "Go back to Standard: the extra perks fade away and the list closes up.",
  ],
  code: `
<Card tone={plan.tone} kind={<Remold.Text>{plan.name}</Remold.Text>} />
<Remold.Text>{plan.price}</Remold.Text>
<Remold.Layout trigger={plan.name}>
  <ul>{plan.perks.map((p) => <li key={p}>{p}</li>)}</ul>
</Remold.Layout>
`,
  uses: [
    { name: "Remold.Layout", role: "Keeps perks you already have in place and slides new ones in." },
    { name: "Remold.Text", role: "The plan name on the card and the price." },
  ],
  frame: "panel",
  Demo: PlansDemo,
};

/* A virtual card: reveal its details, or freeze it. */

const NUMBER = { masked: "•••• •••• •••• 4821", shown: "4532 8812 0937 4821" };

function RevealDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [shown, setShown] = useState(false);
  const [frozen, setFrozen] = useState(false);
  useAutoplay(autoplay, 1800, (count) => {
    const beat = count % 4;
    if (beat === 0) setShown(true);
    else if (beat === 1) setShown(false);
    else if (beat === 2) setFrozen(true);
    else setFrozen(false);
  });
  const text = { loop, reducedMotion };
  return (
    <div className="demo-panel">
      <div className="reveal">
        <PayCard
          tone="coral"
          kind="Virtual"
          className={frozen ? "frozen" : ""}
          number={<Remold.Text {...text}>{shown ? NUMBER.shown : NUMBER.masked}</Remold.Text>}
          expires={<Remold.Text {...text}>{shown ? "04/28" : "••/••"}</Remold.Text>}
        >
          {frozen && <span className="pay-frozen">Frozen</span>}
        </PayCard>
        <p className="reveal-cvv">
          Security code <Remold.Text {...text}>{shown ? "381" : "•••"}</Remold.Text>
        </p>
        <div className="reveal-actions">
          <button type="button" onClick={() => setShown((s) => !s)} aria-pressed={shown}>
            <MorphIcon name={shown ? "eyeOff" : "eye"} />
            <Remold.Text {...text}>{shown ? "Hide details" : "Show details"}</Remold.Text>
          </button>
          <button type="button" onClick={() => setFrozen((f) => !f)} aria-pressed={frozen}>
            <MorphIcon name={frozen ? "lock" : "unlock"} />
            <Remold.Text {...text}>{frozen ? "Unfreeze" : "Freeze"}</Remold.Text>
          </button>
        </div>
      </div>
    </div>
  );
}

export const reveal: Example = {
  id: "virtual-card",
  category: "Fintech",
  title: "Virtual card",
  summary: "Masked dots turn into the card number with the last four digits staying put; freezing frosts the card.",
  headline: (
    <>
      Reveal the number,
      <br />
      keep your place.
    </>
  ),
  lead: "Showing card details usually swaps one string for another. Here the dots turn into digits in place and the last four, which were never hidden, don't move at all. The eye and lock icons morph with their labels, and freezing frosts the card over.",
  tries: [
    "Press Show details: the dots become digits and the 4821 at the end stays still.",
    "Press Freeze: the lock closes and the card frosts over.",
    "Turn on Show matches to see which characters carried over.",
  ],
  code: `
<Remold.Text>{shown ? card.number : masked(card.number)}</Remold.Text>
<button onClick={toggleFrozen}>
  <Remold.Icon d={frozen ? icons.lock : icons.unlock} />
  <Remold.Text>{frozen ? "Unfreeze" : "Freeze"}</Remold.Text>
</button>
`,
  uses: [
    { name: "Remold.Text", role: "The card number, expiry and security code, and both button labels." },
    { name: "Remold.Icon", role: "Eye to crossed-out eye, and the padlock opening and closing." },
  ],
  frame: "panel",
  Demo: RevealDemo,
};

/* Send money: type an amount, pick someone, send. */

const PEOPLE = ["Priya", "Ola", "Sam"];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
const BALANCE = 2140.18;
const dollars = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SendDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion, wait } = useMotion();
  const nextRun = useRun();
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("Priya");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent">("idle");
  const [balance, setBalance] = useState(BALANCE);

  const press = (key: string) => {
    if (phase !== "idle") return;
    setAmount((a) => {
      if (key === "⌫") return a.slice(0, -1);
      if (key === "." && a.includes(".")) return a;
      if (/\.\d\d$/.test(a) || a.length >= 7) return a;
      return a === "0" && key !== "." ? key : a + key;
    });
  };
  const send = async () => {
    const value = Number(amount);
    if (!value || phase !== "idle") return;
    const signal = nextRun();
    setPhase("sending");
    if (!(await wait(1100, signal))) return;
    setPhase("sent");
    setBalance((b) => b - value);
    if (!(await wait(1700, signal))) return;
    setPhase("idle");
    setAmount("");
  };

  useAutoplay(autoplay, 650, (count) => {
    const script = ["4", "2", ".", "5", "0", "send", "", "", "", "", "person"];
    const step = script[count % script.length]!;
    if (step === "send") void send();
    else if (step === "person") {
      setTo((p) => PEOPLE[(PEOPLE.indexOf(p) + 1) % PEOPLE.length]!);
      if (balance < 1900) setBalance(BALANCE);
    } else if (step) press(step);
  });

  const icon: IconName = phase === "sending" ? "dots" : phase === "sent" ? "check" : "arrowUp";
  const label = phase === "sending" ? "Sending…" : phase === "sent" ? `Sent to ${to}` : `Send to ${to}`;
  const text = { loop, reducedMotion };
  return (
    <div className="demo-panel">
      <div className="surface send">
        <Remold.Text className="send-balance" {...text}>
          {`Balance ${dollars(balance)}`}
        </Remold.Text>
        <Remold.Text className="send-amount" aria-live="polite" {...text}>
          {`$${amount || "0"}`}
        </Remold.Text>
        <div className="send-people" role="group" aria-label="Send to">
          {PEOPLE.map((p) => (
            <button key={p} type="button" aria-pressed={p === to} onClick={() => setTo(p)}>
              <span aria-hidden="true">{p[0]}</span>
              {p}
            </button>
          ))}
        </div>
        <div className="send-keys">
          {KEYS.map((k) => (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === "⌫" ? "Delete" : k}>
              {k}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="status-button send-go"
          data-tone={phase === "sent" ? "done" : phase === "sending" ? "busy" : undefined}
          onClick={() => void send()}
          disabled={!Number(amount) && phase === "idle"}
        >
          <MorphIcon name={icon} />
          <Remold.Text {...text}>{label}</Remold.Text>
        </button>
      </div>
    </div>
  );
}

export const send: Example = {
  id: "send-money",
  category: "Fintech",
  title: "Send money",
  summary: "Type an amount and send it: digits arrive one at a time, the button works through sending to sent, the balance updates.",
  headline: (
    <>
      Every digit,
      <br />
      every step.
    </>
  ),
  lead: "A payment flow where nothing jumps. The amount grows a digit at a time, the send button's arrow folds into dots while it works and opens into a tick when it's done, and the balance above changes only in the digits that moved.",
  tries: [
    "Type an amount on the keypad. Each digit slides in; delete takes them back out.",
    "Pick someone and press Send: the arrow becomes dots, then a tick, and “Send to” becomes “Sent to”.",
    "Watch the balance: only the changed digits move.",
  ],
  code: `
<Remold.Text>{"$" + amount}</Remold.Text>
<button onClick={send}>
  <Remold.Icon d={icons[phase]} />
  <Remold.Text>{phase === "sent" ? "Sent to " + name : "Send to " + name}</Remold.Text>
</button>
`,
  uses: [
    { name: "Remold.Text", role: "The amount, the balance and the button label." },
    { name: "Remold.Icon", role: "The send button's arrow, dots and tick." },
  ],
  frame: "panel",
  Demo: SendDemo,
};
