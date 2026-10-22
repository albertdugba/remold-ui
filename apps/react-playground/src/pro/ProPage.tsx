/**
 * Remold Pro: flagship demos for real kinds of product, what the paid kits contain, and
 * pricing. Brands, products and numbers are made up. Prices are placeholders, and the waitlist
 * form isn't connected to anything yet.
 */
import { useState, type FormEvent } from "react";
import "./pro.css";
import { LaunchReveal } from "./LaunchReveal";
import { ProductDrop } from "./ProductDrop";
import { YearInMoney } from "./YearInMoney";

const KITS = [
  { name: "Hero kit", detail: "Your logo and headline built from thousands of dots, a dotted globe, headlines that rewrite themselves." },
  { name: "Data stories", detail: "Year-in-review and report pages where every dot is a real record that regroups as the story moves on." },
  { name: "Commerce kit", detail: "Product drops, colourway pickers, cart and checkout states that change in place." },
  { name: "AI interface kit", detail: "A voice orb that listens, thinks and speaks; an agent-at-work timeline; streaming answers." },
  { name: "Fintech kit", detail: "Payment cards, wallets, plan pickers, virtual card reveals and balances that count." },
  { name: "Product stories", detail: "Isometric scenes that explain how your product works, step by step, as people scroll." },
];

const PLANS = [
  {
    name: "Pro",
    price: "$149",
    note: "one-off, for one developer",
    points: [
      "Every kit, as React + TypeScript",
      "Themeable, with reduced motion built in",
      "A year of new templates and updates",
      "Use on unlimited personal and client sites",
    ],
    cta: "Join the waitlist",
    featured: false,
  },
  {
    name: "Team",
    price: "$349",
    note: "one-off, for up to 10 developers",
    points: ["Everything in Pro", "Shared licence for your whole team", "Priority requests for new templates", "Private Discord channel"],
    cta: "Join the waitlist",
    featured: true,
  },
  {
    name: "Custom build",
    price: "From $2,500",
    note: "a hero, product tour or launch film, made for you",
    points: [
      "Designed around your product and brand",
      "Delivered as code you own",
      "Exported as video for your launch posts",
      "Usually ready in one to two weeks",
    ],
    cta: "Start a project",
    featured: false,
  },
];

const DEMOS = [
  {
    id: "year",
    eyebrow: "Fintech · Data stories",
    title: "A year of spending, told with every payment.",
    body: "Each dot is one card payment. They sort themselves into categories, months and days, then into the year's total, finding their own way and colour each time. Built for year-in-review pages, reports and onboarding.",
    Demo: YearInMoney,
  },
  {
    id: "drop",
    eyebrow: "Commerce",
    title: "A product page where the product moves.",
    body: "The product is drawn in dots. Switch products and they rebuild into the next one while the name and price change letter by letter. Pick a colour and every dot repaints on its way. Hover to push them around.",
    Demo: ProductDrop,
  },
  {
    id: "launch",
    eyebrow: "Launches",
    title: "A launch that assembles itself.",
    body: "Dust gathers into your mark, opens out into your name, then into the line you're launching with. Loop it on your landing page, or export it as video for your launch posts.",
    Demo: LaunchReveal,
  },
];

function Waitlist() {
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };
  return sent ? (
    <p className="pro-waitlist-done" role="status">
      Thanks. We'll email you when Pro opens.
    </p>
  ) : (
    <form className="pro-waitlist" onSubmit={submit}>
      <label className="visually-hidden" htmlFor="pro-email">
        Email
      </label>
      <input id="pro-email" type="email" required placeholder="you@company.com" autoComplete="email" />
      <button type="submit">Join the waitlist</button>
    </form>
  );
}

/** The site routes by hash, so jump to the waitlist by hand rather than with a link. */
const toWaitlist = () => {
  const input = document.getElementById("pro-email");
  input?.scrollIntoView({ behavior: "smooth", block: "center" });
  input?.focus({ preventScroll: true });
};

export function ProPage() {
  return (
    <div className="pro">
      <section className="pro-hero">
        <h1>Remold Pro</h1>
        <p className="pro-lead">
          Ready-made React components for landing pages, product pages and data stories, built on the open-source engine. Copy them into
          your project and change the data, colours and copy.
        </p>
        <Waitlist />
      </section>

      {DEMOS.map(({ id, eyebrow, title, body, Demo }) => (
        <section key={id} className="pro-demo" id={`pro-${id}`}>
          <div className="pro-demo-copy">
            <p className="pro-eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{body}</p>
          </div>
          <Demo />
        </section>
      ))}

      <section className="pro-kits">
        <h2>What's in Pro</h2>
        <ul>
          {KITS.map((kit) => (
            <li key={kit.name}>
              <h3>{kit.name}</h3>
              <p>{kit.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pro-pricing" id="pricing">
        <h2>Pricing</h2>
        <p className="pro-lead">The engine stays free and open source. Pro is the finished work on top.</p>
        <div className="pro-plans">
          {PLANS.map((plan) => (
            <article key={plan.name} className={`pro-plan${plan.featured ? " featured" : ""}`}>
              <h3>{plan.name}</h3>
              <p className="pro-price">{plan.price}</p>
              <p className="pro-note">{plan.note}</p>
              <ul>
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              {plan.name === "Custom build" ? (
                <a className="pro-plan-cta" href="mailto:hello@example.com?subject=Custom%20build">
                  {plan.cta}
                </a>
              ) : (
                <button type="button" className="pro-plan-cta" onClick={toWaitlist}>
                  {plan.cta}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
