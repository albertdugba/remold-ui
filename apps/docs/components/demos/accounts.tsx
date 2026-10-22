"use client";
/**
 * A bank's accounts page, all ordinary React state:
 *
 * - **Open an account.** Its card grows into the page header, the other accounts shrink into a row
 *   of switches, and its transactions take over the list. Different markup in different parents,
 *   nothing keyed across views: `Remold.Layout` matches by what things show.
 * - **Move money** between your own accounts. The button opens into the transfer form; confirm and
 *   the amount leaves one card and lands in the other while both balances count to their new
 *   values (`Remold.Text`, only the digits that change). The new rows say "Pending", then
 *   settle.
 * - **Switch accounts** from the detail page: shops both accounts were used at stay put and only
 *   their amounts change.
 *
 * Every number adds up: the total is the sum of the accounts, and a transfer moves exactly what it
 * says. "Northwind", the shops and the accounts are made up.
 */
import { Remold } from "@remold-ui/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./accounts.css";

type Kind = "coffee" | "cart" | "train" | "plane" | "bed" | "gym" | "pen" | "spark" | "move";

interface Account {
  id: string;
  name: string;
  last4: string;
  color: string;
  balance: number;
}

interface Tx {
  id: string;
  title: string;
  kind: Kind;
  amount: number;
  when: string;
  /** Money coming in. */
  in?: boolean;
  /** A transfer that hasn't settled yet. */
  pending?: boolean;
}

const ACCOUNTS: Account[] = [
  { id: "everyday", name: "Everyday", last4: "0391", color: "#ff4f40", balance: 4274 },
  { id: "travel", name: "Travel", last4: "6204", color: "#6d5dfc", balance: 1199.4 },
  { id: "savings", name: "Savings", last4: "7714", color: "#0e9f8a", balance: 9162 },
];

/** Shops repeat across accounts on purpose: switching keeps those rows and changes only the amount. */
const START: Record<string, Tx[]> = {
  everyday: [
    { id: "e1", title: "Corner Coffee", kind: "coffee", amount: 4.8, when: "Today, 8:12" },
    { id: "e2", title: "Harbor Market", kind: "cart", amount: 62.15, when: "Yesterday" },
    { id: "e3", title: "City Transit", kind: "train", amount: 2.9, when: "Yesterday" },
    { id: "e4", title: "Fieldhouse", kind: "gym", amount: 39, when: "Monday" },
  ],
  travel: [
    { id: "t1", title: "Skyline Air", kind: "plane", amount: 412, when: "Today, 6:40" },
    { id: "t2", title: "Corner Coffee", kind: "coffee", amount: 9.6, when: "Today, 6:05" },
    { id: "t3", title: "City Transit", kind: "train", amount: 5.8, when: "Sunday" },
    { id: "t4", title: "Harbour Hotel", kind: "bed", amount: 228.4, when: "Sunday" },
  ],
  savings: [
    { id: "s1", title: "Interest", kind: "spark", amount: 24.1, when: "1 Oct", in: true },
    { id: "s2", title: "From Everyday", kind: "move", amount: 300, when: "28 Sep", in: true },
    { id: "s3", title: "Night Owl Books", kind: "pen", amount: 18, when: "21 Sep" },
  ],
};

const AMOUNTS = [50, 200, 500];

const ICONS: Record<Kind, string> = {
  coffee: "M5 9h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5ZM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5v2.5M12 3.5v2.5",
  cart: "M3 4.5h2.5l2 10.5h10l2-7.5H6.4M9 19.5h.01M17 19.5h.01",
  train:
    "M7.5 3h9a2.5 2.5 0 0 1 2.5 2.5V14a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5.5A2.5 2.5 0 0 1 7.5 3ZM5 10.5h14M9 13.5h.01M15 13.5h.01M8.5 21l1.5-4M15.5 21 14 17",
  plane: "M3 13.5 21 6l-4.5 13-4-5.5ZM12.5 13.5 21 6",
  bed: "M3 18.5V6.5M3 14h18v4.5M21 14a3 3 0 0 0-3-3h-7v3M7 11.5h.01",
  gym: "M6.5 7.5v9M3.5 10v4M17.5 7.5v9M20.5 10v4M6.5 12h11",
  pen: "M4.5 19.5 5.5 15 16 4.5l3.5 3.5L9 18.5ZM13.5 7l3.5 3.5",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  move: "M4 8h14l-3.5-3.5M20 16H6l3.5 3.5",
};
const BACK = "M14.5 5.5 8 12l6.5 6.5";

const pounds = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const whole = (n: number) => `£${n.toLocaleString("en-GB")}`;
const byId = (id: string) => ACCOUNTS.find((a) => a.id === id)!;

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="ac-glyph" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Mark({ account }: { account: Account }) {
  return (
    <span className="ac-mark" aria-hidden="true">
      {account.name[0]}
    </span>
  );
}

/** The amount in flight: one element that sits in the sending card, then in the receiving one. */
function Coin({ amount }: { amount: number }) {
  return <span className="ac-coin">{whole(amount)}</span>;
}

function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: (value: T) => boolean;
}) {
  return (
    <div className="ac-field">
      <span className="ac-field-label">{label}</span>
      <div className="ac-choice" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            disabled={disabled?.(o.value)}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SCENES = 5;

/**
 * `scene` steps it from outside: 0 the overview (money reset), 1 the transfer form open, 2 £200
 * moved from Everyday to Travel, 3 the Travel account open, 4 switched to Everyday. Leave it out
 * and only its own controls drive it.
 */
export function AccountsDemo({ scene }: { scene?: number } = {}) {
  const [open, setOpen] = useState<string | null>(null);
  const [balances, setBalances] = useState(() => Object.fromEntries(ACCOUNTS.map((a) => [a.id, a.balance])));
  const [txs, setTxs] = useState(START);
  const [panel, setPanel] = useState(false);
  const [from, setFrom] = useState("everyday");
  const [to, setTo] = useState("travel");
  const [amount, setAmount] = useState(200);
  const [flight, setFlight] = useState<{ stage: "from" | "to"; from: string; to: string; amount: number } | null>(null);
  const count = useRef(0);
  const timers = useRef<number[]>([]);

  const later = (ms: number, run: () => void) => timers.current.push(window.setTimeout(run, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const openAccount = (id: string | null) => {
    setPanel(false);
    setOpen(id);
  };

  const transfer = (src = from, dst = to, value = amount) => {
    if (src === dst || value > balances[src]!) return;
    const n = ++count.current;
    const out: Tx = { id: `m${n}-out`, title: `To ${byId(dst).name}`, kind: "move", amount: value, when: "Just now", pending: true };
    const into: Tx = { id: `m${n}-in`, title: `From ${byId(src).name}`, kind: "move", amount: value, when: "Just now", in: true, pending: true };
    setPanel(false);
    // The amount leaves the sending card…
    setFlight({ stage: "from", from: src, to: dst, amount: value });
    setBalances((b) => ({ ...b, [src]: b[src]! - value }));
    setTxs((t) => ({ ...t, [src]: [out, ...t[src]!] }));
    // …lands in the receiving one…
    later(520, () => {
      setFlight({ stage: "to", from: src, to: dst, amount: value });
      setBalances((b) => ({ ...b, [dst]: b[dst]! + value }));
      setTxs((t) => ({ ...t, [dst]: [into, ...t[dst]!] }));
    });
    later(1300, () => setFlight(null));
    // …and both rows settle.
    later(2200, () =>
      setTxs((t) => ({
        ...t,
        [src]: t[src]!.map((x) => (x.id === out.id ? { ...x, pending: false } : x)),
        [dst]: t[dst]!.map((x) => (x.id === into.id ? { ...x, pending: false } : x)),
      })),
    );
  };

  // Stepped from outside: each scene is a whole state, and the first starts the money over.
  useEffect(() => {
    if (scene === undefined) return;
    const step = scene % SCENES;
    if (step === 0) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setOpen(null);
      setPanel(false);
      setFlight(null);
      setBalances(Object.fromEntries(ACCOUNTS.map((a) => [a.id, a.balance])));
      setTxs(START);
      setFrom("everyday");
      setTo("travel");
      setAmount(200);
    } else if (step === 1) {
      setOpen(null);
      setPanel(true);
    } else if (step === 2) transfer("everyday", "travel", 200);
    else openAccount(step === 3 ? "travel" : "everyday");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    if (!open && !panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (panel) setPanel(false);
      else setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Mid-transfer the money has left one account but not reached the other: it's still yours.
  const total = ACCOUNTS.reduce((sum, a) => sum + balances[a.id]!, 0) + (flight?.stage === "from" ? flight.amount : 0);
  const account = open ? byId(open) : null;
  const recent = ACCOUNTS.flatMap((a) => txs[a.id]!.slice(0, 2).map((tx) => ({ tx, account: a }))).sort(
    (x, y) => Number(y.tx.when === "Just now") - Number(x.tx.when === "Just now"),
  );
  const rows = account ? txs[account.id]!.map((tx) => ({ tx, account })) : recent.slice(0, 5);
  const canMove = from !== to && amount <= balances[from]!;
  const options = ACCOUNTS.map((a) => ({ value: a.id, label: a.name }));

  const action = panel ? (
    <div className="ac-panel" role="group" aria-label="Move money">
      <Choice label="From" value={from} options={options} onChange={setFrom} />
      <Choice label="To" value={to} options={options} onChange={setTo} disabled={(v) => v === from} />
      <Choice
        label="Amount"
        value={amount}
        options={AMOUNTS.map((v) => ({ value: v, label: whole(v) }))}
        onChange={setAmount}
        disabled={(v) => v > balances[from]!}
      />
      <div className="ac-panel-foot">
        <button type="button" className="ac-quiet" onClick={() => setPanel(false)}>
          Cancel
        </button>
        <button type="button" className="ac-primary" disabled={!canMove} onClick={() => transfer()}>
          {canMove ? `Move ${whole(amount)}` : from === to ? "Pick two accounts" : "Not enough money"}
        </button>
      </div>
    </div>
  ) : (
    <button type="button" className="ac-primary" onClick={() => setPanel(true)}>
      <Glyph d={ICONS.move} />
      Move money
    </button>
  );

  return (
    <div className="ac not-prose">
      <Remold.Layout
        trigger={[open, panel, flight?.stage ?? null, ...ACCOUNTS.map((a) => txs[a.id]!.length)]}
        spring={{ duration: 0.5, bounce: 0.08 }}
        className="ac-stage"
      >
        {account ? (
          <div className="ac-page">
            <div className="ac-top">
              <button type="button" className="ac-back" onClick={() => openAccount(null)}>
                <Glyph d={BACK} />
                All accounts
              </button>
              {action}
            </div>

            <section className="ac-hero" style={{ "--c": account.color } as CSSProperties} aria-label={`${account.name} account`}>
              <span className="ac-tile-head">
                <Mark account={account} />
                <span className="ac-tile-name">{account.name}</span>
                <span className="ac-tile-num">•• {account.last4}</span>
              </span>
              <Remold.Text className="ac-hero-balance">{pounds(balances[account.id]!)}</Remold.Text>
              <span className="ac-hero-meta">Available · Sort code 40-17-62</span>
            </section>

            <div className="ac-switch" aria-label="Other accounts">
              {ACCOUNTS.filter((a) => a.id !== account.id).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="ac-pill"
                  style={{ "--c": a.color } as CSSProperties}
                  onClick={() => openAccount(a.id)}
                >
                  <Mark account={a} />
                  <span className="ac-tile-name">{a.name}</span>
                  <Remold.Text className="ac-pill-balance">{pounds(balances[a.id]!)}</Remold.Text>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ac-page">
            <div className="ac-top">
              <div className="ac-total">
                <span>Total balance</span>
                <Remold.Text className="ac-total-amount">{pounds(total)}</Remold.Text>
              </div>
              {action}
            </div>

            <div className="ac-tiles">
              {ACCOUNTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="ac-tile"
                  style={{ "--c": a.color } as CSSProperties}
                  onClick={() => openAccount(a.id)}
                  aria-label={`Open ${a.name}, ${pounds(balances[a.id]!)}`}
                >
                  <span className="ac-tile-head">
                    <Mark account={a} />
                    <span className="ac-tile-name">{a.name}</span>
                    <span className="ac-tile-num">•• {a.last4}</span>
                  </span>
                  <Remold.Text className="ac-tile-balance">{pounds(balances[a.id]!)}</Remold.Text>
                  {flight && flight[flight.stage] === a.id && <Coin amount={flight.amount} />}
                </button>
              ))}
            </div>
          </div>
        )}

        <section className="ac-list" aria-label={account ? `${account.name} transactions` : "Recent activity"}>
          <h3>{account ? "Transactions" : "Recent activity"}</h3>
          <ol>
            {rows.map(({ tx, account: a }) => (
              <li key={tx.id}>
                <span className="ac-row-icon" style={{ "--c": a.color } as CSSProperties}>
                  <Glyph d={ICONS[tx.kind]} />
                </span>
                <span className="ac-row-name">
                  <strong>{tx.title}</strong>
                  <span>
                    {account ? "" : `${a.name} · `}
                    <Remold.Text>{tx.pending ? "Pending" : tx.when}</Remold.Text>
                  </span>
                </span>
                <span className={`ac-row-amount${tx.in ? " in" : ""}${tx.pending ? " pending" : ""}`}>
                  {tx.in ? "+" : "−"}
                  {pounds(tx.amount)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </Remold.Layout>
    </div>
  );
}
