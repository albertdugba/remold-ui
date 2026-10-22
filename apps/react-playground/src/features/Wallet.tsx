/**
 * A wallet of payment cards. In the wallet, cards overlap so each shows its top edge; pick one
 * and it rises to the top with its balance and recent payments, while the rest tuck away below.
 * The markup for the two views is written separately; Remold works out which card is which.
 */
import { springs, Remold } from "@remold-ui/react";
import { useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { PayCard as PayCardView, type CardTone } from "../ui/PayCard";

interface PayCard {
  id: string;
  name: string;
  kind: string;
  last4: string;
  expires: string;
  balance: string;
  tone: CardTone;
  payments: { what: string; when: string; amount: string }[];
}

const CARDS: PayCard[] = [
  {
    id: "everyday",
    name: "Everyday",
    kind: "Debit",
    last4: "4821",
    expires: "08/29",
    balance: "$2,140.18",
    tone: "ocean",
    payments: [
      { what: "Corner Market", when: "Today, 9:12", amount: "−$18.40" },
      { what: "Metro top-up", when: "Yesterday", amount: "−$25.00" },
      { what: "Salary", when: "Mon", amount: "+$3,200.00" },
    ],
  },
  {
    id: "travel",
    name: "Travel",
    kind: "Credit",
    last4: "7730",
    expires: "11/28",
    balance: "$612.50",
    tone: "dusk",
    payments: [
      { what: "Harbour Hotel", when: "Sat", amount: "−$184.00" },
      { what: "Seaside Rail", when: "Fri", amount: "−$46.20" },
      { what: "Airport Café", when: "Fri", amount: "−$9.80" },
    ],
  },
  {
    id: "savings",
    name: "Savings",
    kind: "Saver",
    last4: "1196",
    expires: "02/30",
    balance: "$18,420.00",
    tone: "fern",
    payments: [
      { what: "Monthly transfer", when: "1 Oct", amount: "+$500.00" },
      { what: "Interest", when: "30 Sep", amount: "+$61.32" },
      { what: "Monthly transfer", when: "1 Sep", amount: "+$500.00" },
    ],
  },
  {
    id: "business",
    name: "Business",
    kind: "Credit",
    last4: "0058",
    expires: "05/27",
    balance: "$4,876.04",
    tone: "graphite",
    payments: [
      { what: "Cloud hosting", when: "Today", amount: "−$212.00" },
      { what: "Studio rent", when: "1 Oct", amount: "−$1,400.00" },
      { what: "Invoice 1042", when: "28 Sep", amount: "+$2,750.00" },
    ],
  },
];

function Card({ card, onClick, disabled }: { card: PayCard; onClick: () => void; disabled: boolean }) {
  return (
    <PayCardView
      tone={card.tone}
      kind={card.kind}
      number={`•••• •••• •••• ${card.last4}`}
      expires={card.expires}
      onClick={onClick}
      disabled={disabled}
      label={`${card.name} card ending ${card.last4}`}
    />
  );
}

function WalletDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [selected, setSelected] = useState<string | null>(null);
  const tour = [null, "travel", null, "savings", null, "business"];
  useAutoplay(autoplay, 1900, (count) => setSelected(tour[(count + 1) % tour.length]!));

  const open = CARDS.find((c) => c.id === selected) ?? null;
  const rest = CARDS.filter((c) => c !== open);
  return (
    <div className="demo-panel">
      <Remold.Layout
        trigger={selected}
        className="wallet"
        data-open={open ? "" : undefined}
        spring={springs.snappy}
        loop={loop}
        reducedMotion={reducedMotion}
      >
        {open ? (
          <>
            <div className="wallet-open">
              <Card card={open} onClick={() => setSelected(null)} disabled={preview} />
              <div className="wallet-details">
                <p className="wallet-balance-label">{open.kind === "Credit" ? "Current balance" : "Available"}</p>
                <p className="wallet-balance">{open.balance}</p>
                <ul className="wallet-payments">
                  {open.payments.map((p, i) => (
                    <li key={i}>
                      <span>
                        {p.what}
                        <small>{p.when}</small>
                      </span>
                      <span data-in={p.amount.startsWith("+") || undefined}>{p.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="wallet-tucked">
              {rest.map((card) => (
                <Card key={card.id} card={card} onClick={() => setSelected(card.id)} disabled={preview} />
              ))}
            </div>
          </>
        ) : (
          <div className="wallet-stack">
            {CARDS.map((card) => (
              <Card key={card.id} card={card} onClick={() => setSelected(card.id)} disabled={preview} />
            ))}
          </div>
        )}
      </Remold.Layout>
    </div>
  );
}

export const wallet: Example = {
  id: "wallet",
  category: "Fintech",
  title: "Wallet",
  summary: "Payment cards that rise out of a stack to show their balance and payments, then tuck back in.",
  headline: (
    <>
      Pick a card.
      <br />
      It comes to you.
    </>
  ),
  lead: "Four cards overlap in a wallet. Pick one and it rises to the top while its balance and recent payments slide in, and the others tuck away underneath. The two views are separate markup with no shared keys; Remold recognises each card by what's on it.",
  tries: [
    "Tap Travel: it rises to the top and the others tuck in below.",
    "Tap a tucked card: it swaps places with the open one in one movement.",
    "Tap the open card to put it back in the wallet.",
    "Turn on Show matches to see each card matched across the two layouts.",
  ],
  code: `
<Remold.Layout trigger={selected} spring={springs.snappy}>
  {selected ? (
    <>
      <Card card={selected} />
      <Details card={selected} />
      <Tucked cards={others} />
    </>
  ) : (
    <Stack cards={cards} />
  )}
</Remold.Layout>
`,
  uses: [
    { name: "Remold.Layout", role: "Matches every card between the stacked and open layouts and springs it there; details fade in." },
  ],
  frame: "panel",
  Demo: WalletDemo,
};
