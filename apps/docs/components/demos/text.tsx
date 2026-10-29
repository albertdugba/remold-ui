"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame, Segmented } from "./frame";
import "./text.css";

const STATUSES = [
  "Uploading 3 files",
  "Uploading 2 files",
  "Processing",
  "Upload complete",
];

export function StatusDemo() {
  const [index, setIndex] = useState(0);
  return (
    <Frame>
      <div className="rm-status">
        <Remold.Text className="rm-status-text">{STATUSES[index]!}</Remold.Text>
        <button
          type="button"
          className="rm-button"
          onClick={() => setIndex((i) => (i + 1) % STATUSES.length)}
        >
          Next status
        </button>
      </div>
    </Frame>
  );
}

const PLANS = {
  Monthly: { price: "£12", per: "per month", note: "Billed monthly" },
  Yearly: { price: "£120", per: "per year", note: "Two months free" },
} as const;

export function PriceDemo({
  framed = true,
  index,
}: {
  framed?: boolean;
  index?: number;
}) {
  const [own, setBilling] = useState<keyof typeof PLANS>("Monthly");

  const billing =
    index === undefined ? own : (["Monthly", "Yearly"] as const)[index % 2]!;
  const plan = PLANS[billing];
  const body = (
    <div className="rm-price">
      {index === undefined && (
        <Segmented
          label="Billing"
          value={billing}
          onChange={setBilling}
          options={["Monthly", "Yearly"] as const}
        />
      )}
      <p className="rm-price-name">Team</p>
      <p className="rm-price-amount">
        <Remold.Text>{plan.price}</Remold.Text>
        <Remold.Text className="rm-price-per">{plan.per}</Remold.Text>
      </p>
      <Remold.Text className="rm-price-note">{plan.note}</Remold.Text>
    </div>
  );
  return framed ? <Frame>{body}</Frame> : body;
}
