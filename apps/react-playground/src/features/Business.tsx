/** Non-developer canvas examples: the same spatial engine can explain a payment, an order, or
 * a customer's data—not only the infrastructure behind a product. */
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { Segmented } from "../ui/controls";

type SceneProps = Remold.Scene.Props;
type Layouts = SceneProps["layouts"];
type Box = Layouts[string]["objects"][string];
const B = (x: number, y: number, z: number, width: number, depth: number, extra: Partial<Box> = {}): Box => ({
  x,
  y,
  z,
  width,
  depth,
  ...extra,
});

interface Journey {
  label: string;
  palette: SceneProps["palette"];
  objects: SceneProps["objects"];
  links: NonNullable<SceneProps["links"]>;
  layouts: Layouts;
  tour: readonly { layout: string; focused?: string }[];
}

function JourneyDemo({ journey, preview, autoplay }: DemoProps & { journey: Journey }) {
  const { loop, reducedMotion } = useMotion();
  const [layout, setLayout] = useState(journey.tour[0]!.layout);
  const [focused, setFocused] = useState<string | null>(null);
  const layouts = Object.keys(journey.layouts);
  useAutoplay(autoplay, 3200, (count) => {
    const next = journey.tour[(count + 1) % journey.tour.length]!;
    setLayout(next.layout);
    setFocused(next.focused ?? null);
  });
  const caption = focused
    ? `${journey.objects[focused]?.label}: ${journey.objects[focused]?.description}`
    : journey.layouts[layout]?.caption;
  return (
    <div className="demo-panel dark">
      <Remold.Scene
        className="scene-canvas journey-canvas"
        label={journey.label}
        objects={journey.objects}
        layouts={journey.layouts}
        links={journey.links}
        palette={journey.palette}
        layout={layout}
        focused={focused}
        onFocusedChange={setFocused}
        loop={loop}
        reducedMotion={reducedMotion}
        interact={preview ? { hover: false, tap: false, drag: false, keyboard: false } : undefined}
      />
      {!preview && (
        <>
          <Segmented
            label="Journey stage"
            tone="dark"
            options={layouts}
            value={layout}
            onChange={(next) => {
              setLayout(next);
              setFocused(null);
            }}
          />
          <p className="scene-caption">{caption}</p>
        </>
      )}
    </div>
  );
}

function journeyExample(
  journey: Journey,
  page: Omit<Example, "category" | "frame" | "Demo" | "uses"> & { uses?: Example["uses"] },
): Example {
  const Demo = (props: DemoProps) => <JourneyDemo journey={journey} {...props} />;
  Demo.displayName = `BusinessJourney(${page.id})`;
  return {
    ...page,
    category: "Canvas",
    frame: "panel",
    uses: page.uses ?? [
      {
        name: "Remold.Scene",
        role: "Keeps the same business entities recognizable while each stage changes their position and role.",
      },
      { name: "links + flow", role: "Shows a meaningful direction of travel instead of a static, unlabeled diagram." },
    ],
    Demo,
  };
}

const paymentJourney: Journey = {
  label: "How a customer card payment becomes a merchant payout",
  palette: "amber",
  objects: {
    customer: { look: "chip", label: "customer", description: "Confirms a purchase with their card or wallet." },
    merchant: { look: "glass", label: "merchant", description: "Receives an approved order immediately." },
    acquirer: { look: "wire", label: "payments", description: "Routes a payment to the correct card network and issuer." },
    issuer: { look: "cylinder", label: "issuer", description: "Checks the card and reserves the customer's funds." },
    ledger: { look: "plate", label: "settlement", description: "Records the approved payment until its settlement window." },
    payout: { look: "tower", label: "payout", description: "Moves cleared funds into the merchant's bank account." },
  },
  links: [
    { from: "customer", to: "merchant", fromPort: "right", toPort: "left", route: "straight", arrow: "end", flow: true },
    {
      from: "merchant",
      to: "acquirer",
      fromPort: "right",
      toPort: "left",
      route: "straight",
      arrow: "end",
      flow: true,
      layouts: ["Authorize", "Settle"],
    },
    {
      from: "acquirer",
      to: "issuer",
      fromPort: "right",
      toPort: "left",
      route: "straight",
      arrow: "both",
      flow: true,
      layouts: ["Authorize"],
    },
    {
      from: "acquirer",
      to: "ledger",
      fromPort: "right",
      toPort: "left",
      route: "straight",
      arrow: "end",
      flow: true,
      layouts: ["Settle", "Pay out"],
    },
    { from: "ledger", to: "payout", fromPort: "right", toPort: "left", route: "straight", arrow: "end", flow: true, layouts: ["Pay out"] },
  ],
  layouts: {
    Authorize: {
      caption: "In seconds, the payment provider asks the card issuer to approve the purchase.",
      camera: "fit",
      objects: {
        customer: B(-360, 0, 0, 110, 70),
        merchant: B(-145, 0, 0, 170, 110),
        acquirer: B(115, 0, 0, 160, 100),
        issuer: B(360, 0, 0, 150, 110),
        ledger: B(360, 0, 0, 180, 120, { opacity: 0 }),
        payout: B(360, 0, 0, 110, 150, { opacity: 0 }),
      },
    },
    Settle: {
      caption: "The purchase is approved for the customer; the payment waits in settlement for the merchant.",
      camera: "fit",
      objects: {
        customer: B(-370, 0, 0, 110, 70, { opacity: 0.42 }),
        merchant: B(-155, 0, 0, 170, 110),
        acquirer: B(105, 0, 0, 160, 100),
        ledger: B(365, 0, 0, 200, 130),
        issuer: B(360, 0, 0, 140, 100, { opacity: 0 }),
        payout: B(360, 0, 0, 110, 150, { opacity: 0 }),
      },
    },
    "Pay out": {
      caption: "After the settlement window, the merchant receives one clear payout instead of a stream of individual purchases.",
      camera: "fit",
      objects: {
        customer: B(-370, 0, 0, 110, 70, { opacity: 0 }),
        merchant: B(-365, 0, 0, 180, 120),
        acquirer: B(-105, 0, 0, 160, 100, { opacity: 0.62 }),
        ledger: B(150, 0, 0, 200, 130),
        payout: B(395, 0, 0, 130, 180),
        issuer: B(360, 0, 0, 140, 100, { opacity: 0 }),
      },
    },
  },
  tour: [
    { layout: "Authorize" },
    { layout: "Authorize", focused: "issuer" },
    { layout: "Settle" },
    { layout: "Pay out", focused: "payout" },
  ],
};

export const payment = journeyExample(paymentJourney, {
  id: "payment-journey",
  title: "Payment journey",
  summary: "A customer purchase travels through authorization and settlement to one clear merchant payout.",
  headline: (
    <>
      A payment is more
      <br />
      than a tap.
    </>
  ),
  lead: "This is a customer-facing fintech explainer, not a developer diagram. The same actors stay visible from the moment someone pays to the moment a merchant is paid out, so the sequence feels trustworthy rather than mysterious.",
  tries: [
    "Move through Authorize, Settle and Pay out.",
    "Tap the issuer or payout to read its role without leaving the explanation.",
    "Use this pattern for cards, wallets, insurance claims, loans or payroll.",
  ],
  code: `
<Remold.Scene
  objects={paymentActors}
  links={paymentLinks}
  layouts={{ authorize, settle, payout }}
  layout={stage}
  palette="amber"
/>
`,
});

const fulfilmentJourney: Journey = {
  label: "How an online order moves from a storefront to a customer's doorstep",
  palette: "teal",
  objects: {
    store: { look: "glass", label: "store", description: "Where a customer places an order." },
    order: { look: "chip", label: "order", description: "The order record that follows the purchase through fulfilment." },
    warehouse: { look: "plate", label: "warehouse", description: "Where stock is found and packed." },
    courier: { look: "tower", label: "courier", description: "Collects the parcel after it is packed." },
    doorstep: { look: "chip", label: "doorstep", description: "The customer's chosen delivery address." },
    returns: { look: "wire", label: "returns", description: "An optional path back into the warehouse." },
  },
  links: [
    { from: "store", to: "order", fromPort: "right", toPort: "left", route: "straight", arrow: "end", flow: true },
    {
      from: "order",
      to: "warehouse",
      fromPort: "right",
      toPort: "left",
      route: "straight",
      arrow: "end",
      flow: true,
      layouts: ["Pick & pack", "Deliver"],
    },
    {
      from: "warehouse",
      to: "courier",
      fromPort: "right",
      toPort: "left",
      route: "straight",
      arrow: "end",
      flow: true,
      layouts: ["Deliver"],
    },
    {
      from: "courier",
      to: "doorstep",
      fromPort: "right",
      toPort: "left",
      route: "straight",
      arrow: "end",
      flow: true,
      layouts: ["Deliver"],
    },
    {
      from: "doorstep",
      to: "returns",
      fromPort: "front",
      toPort: "back",
      route: "orthogonal",
      arrow: "both",
      dashed: true,
      layouts: ["Returns"],
    },
    {
      from: "returns",
      to: "warehouse",
      fromPort: "left",
      toPort: "right",
      route: "curve",
      arrow: "end",
      dashed: true,
      layouts: ["Returns"],
    },
  ],
  layouts: {
    Ordered: {
      caption: "A customer gets a quick confirmation; the physical journey has not begun yet.",
      camera: "fit",
      objects: {
        store: B(-170, 0, 0, 180, 115),
        order: B(150, 0, 0, 120, 75),
        warehouse: B(250, 0, 0, 240, 150, { opacity: 0 }),
        courier: B(250, 0, 0, 110, 160, { opacity: 0 }),
        doorstep: B(250, 0, 0, 110, 70, { opacity: 0 }),
        returns: B(250, 0, 0, 130, 80, { opacity: 0 }),
      },
    },
    "Pick & pack": {
      caption: "The order reaches a warehouse, where stock is picked and packed for collection.",
      camera: "fit",
      objects: {
        store: B(-350, 0, 0, 170, 110, { opacity: 0.55 }),
        order: B(-100, 0, 0, 120, 75),
        warehouse: B(210, 0, 0, 270, 170),
        courier: B(250, 0, 0, 110, 160, { opacity: 0 }),
        doorstep: B(250, 0, 0, 110, 70, { opacity: 0 }),
        returns: B(250, 0, 0, 130, 80, { opacity: 0 }),
      },
    },
    Deliver: {
      caption: "The parcel leaves the warehouse, becomes a delivery route and arrives at the customer's doorstep.",
      camera: "fit",
      objects: {
        store: B(-380, 0, 0, 160, 105, { opacity: 0.25 }),
        order: B(-190, 0, 0, 120, 75, { opacity: 0.7 }),
        warehouse: B(45, 0, 0, 250, 160),
        courier: B(305, 0, 0, 130, 180),
        doorstep: B(510, 0, 0, 130, 80),
        returns: B(510, 0, 0, 130, 80, { opacity: 0 }),
      },
    },
    Returns: {
      caption: "A clear return path reassures the customer and makes the reverse journey visible too.",
      camera: "fit",
      objects: {
        store: B(-380, 0, 0, 160, 105, { opacity: 0.2 }),
        order: B(-190, 0, 0, 120, 75, { opacity: 0.35 }),
        warehouse: B(45, 0, 0, 250, 160),
        courier: B(305, 0, 0, 130, 180, { opacity: 0.4 }),
        doorstep: B(505, -105, 0, 130, 80),
        returns: B(500, 120, 0, 170, 100),
      },
    },
  },
  tour: [
    { layout: "Ordered" },
    { layout: "Pick & pack", focused: "warehouse" },
    { layout: "Deliver" },
    { layout: "Returns", focused: "returns" },
  ],
};

export const fulfilment = journeyExample(fulfilmentJourney, {
  id: "fulfilment-map",
  title: "Fulfilment map",
  summary: "An order transforms from a confirmation into a parcel, delivery route and—when needed—a return.",
  headline: (
    <>
      Turn “where is my
      <br />
      order?” into clarity.
    </>
  ),
  lead: "A fulfilment journey is a consumer explanation for marketplaces, retail and logistics brands. It uses the canvas as a shared mental model for customers and operations teams, including the often-hidden reverse path of returns.",
  tries: [
    "Choose Ordered, Pick & pack, Deliver and Returns.",
    "Tap the warehouse, courier or return path to explain a particular part of the journey.",
    "Reuse the shape for food delivery, service bookings, repair flows or patient logistics.",
  ],
  code: `
<Remold.Scene
  objects={fulfilmentActors}
  links={fulfilmentLinks}
  layouts={{ ordered, packing, deliver, returns }}
  layout={stage}
  palette="teal"
/>
`,
});

const dataChapters: Remold.Story.Props["chapters"] = [
  {
    id: "collect",
    layout: "Collect",
    focused: "app",
    title: "Collect",
    description: "A person shares the minimum information the product needs to provide a useful service.",
    annotation: { object: "app", port: "top" },
  },
  {
    id: "protect",
    layout: "Protect",
    focused: "vault",
    title: "Protect",
    description: "The information moves into a protected store; access is deliberately separated from the product experience.",
    annotation: { object: "vault", port: "top" },
  },
  {
    id: "control",
    layout: "Control",
    focused: "controls",
    title: "Control",
    description: "A person can inspect, export or delete their data. The control path is as visible as the collection path.",
    annotation: { object: "controls", port: "top" },
  },
];

// The chapter drives camera, focus and keyboard navigation. Its explanation lives below the
// picture so a customer can read it without the diagram being covered by a tooltip.
const dataStoryChapters = dataChapters.map(({ annotation: _annotation, focused: _focused, ...chapter }) => chapter);

function DataJourneyDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [chapter, setChapter] = useState("collect");
  useAutoplay(autoplay, 3800, (count) => setChapter(dataChapters[(count + 1) % dataChapters.length]!.id));
  const activeChapter = dataChapters.find((item) => item.id === chapter) ?? dataChapters[0]!;
  return (
    <div className="demo-panel dark">
      <Remold.Story
        className="scene-story"
        canvasClassName="scene-canvas journey-canvas"
        label="A person’s data journey through collection, protection and customer controls"
        chapters={dataStoryChapters}
        chapter={chapter}
        onChapterChange={setChapter}
        palette="violet"
        objects={{
          person: { look: "chip", label: "you", description: "The person whose data belongs to them." },
          app: { look: "glass", label: "product", description: "The service someone chose to use." },
          vault: { look: "plate", label: "protected data", description: "A secured store with defined retention and access boundaries." },
          analyst: { look: "chip", label: "insights", description: "A privacy-preserving view used to improve the product." },
          controls: { look: "wire", label: "your controls", description: "Download, correction and deletion choices." },
        }}
        links={[
          { from: "person", to: "app", fromPort: "right", toPort: "left", route: "straight", arrow: "end", flow: true },
          {
            from: "app",
            to: "vault",
            fromPort: "right",
            toPort: "left",
            route: "straight",
            arrow: "end",
            flow: true,
            layouts: ["Collect", "Protect", "Control"],
          },
          {
            from: "vault",
            to: "analyst",
            fromPort: "right",
            toPort: "left",
            route: "straight",
            arrow: "end",
            dashed: true,
            layouts: ["Protect"],
          },
          {
            from: "vault",
            to: "controls",
            fromPort: "right",
            toPort: "left",
            route: "straight",
            arrow: "both",
            flow: true,
            layouts: ["Control"],
          },
        ]}
        layouts={{
          Collect: {
            camera: "fit",
            objects: {
              person: B(-345, 0, 0, 110, 70),
              app: B(-65, 0, 0, 190, 125),
              vault: B(240, 0, 0, 210, 140, { opacity: 0.25 }),
              analyst: B(360, 0, 0, 120, 70, { opacity: 0 }),
              controls: B(360, 0, 0, 150, 90, { opacity: 0 }),
            },
          },
          Protect: {
            camera: "fit",
            objects: {
              person: B(-390, 0, 0, 110, 70, { opacity: 0.45 }),
              app: B(-165, 0, 0, 190, 125),
              vault: B(130, 0, 0, 230, 150),
              analyst: B(410, 0, 0, 140, 90),
              controls: B(420, 0, 0, 150, 90, { opacity: 0 }),
            },
          },
          Control: {
            camera: "fit",
            objects: {
              person: B(-390, 0, 0, 120, 75),
              app: B(-165, 0, 0, 180, 115, { opacity: 0.55 }),
              vault: B(115, 0, 0, 230, 150),
              analyst: B(410, 0, 0, 120, 70, { opacity: 0 }),
              controls: B(400, 0, 0, 190, 110),
            },
          },
        }}
        loop={loop}
        reducedMotion={reducedMotion}
        interact={preview ? { hover: false, tap: false, drag: false, keyboard: false } : undefined}
      />
      {!preview && (
        <>
          <Segmented
            label="Data journey chapter"
            tone="dark"
            options={dataChapters.map((item) => ({ value: item.id, label: String(item.title) }))}
            value={chapter}
            onChange={setChapter}
          />
          <div className="journey-narration" aria-live="polite">
            <span>
              Chapter {dataChapters.findIndex((item) => item.id === activeChapter.id) + 1} · {activeChapter.title}
            </span>
            <p>{activeChapter.description}</p>
          </div>
        </>
      )}
    </div>
  );
}

export const dataJourney: Example = {
  id: "data-journey",
  category: "Canvas",
  title: "Data journey",
  summary: "A Trust Center story of collection, protection and the controls a person keeps over their data.",
  headline: (
    <>
      Privacy is a journey
      <br />
      people should see.
    </>
  ),
  lead: "A customer-facing data journey gives privacy, security and legal teams a more human explanation than a wall of policy text. Story makes person, product, protection and control part of one coherent model.",
  tries: [
    "Read the Collect, Protect and Control chapters in sequence.",
    "Notice that customer control is a first-class route, rather than a disclaimer off the edge of the diagram.",
    "Use the pattern for consent, identity, permissions, security or sustainability reporting.",
  ],
  code: `
<Remold.Story
  chapters={dataChapters}
  objects={dataActors}
  layouts={dataLayouts}
  links={dataLinks}
  palette="violet"
/>
`,
  uses: [
    { name: "Remold.Story", role: "Pairs an accessible written explanation with each spatial chapter." },
    { name: "named ports", role: "Keeps each collection, protection and control action anchored to the correct endpoint." },
  ],
  frame: "panel",
  Demo: DataJourneyDemo,
};
