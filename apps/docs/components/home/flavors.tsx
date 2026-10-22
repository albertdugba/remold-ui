"use client";
/**
 * The same job in each layer of the library. Switching layers animates the code itself with
 * Remold: lines both versions share stay where they are, the rest slide in and out.
 */
import { Remold } from "@remold-ui/react";
import { useState, type ReactNode } from "react";
import { FLAVOR_NAMES as NAMES, FLAVORS, type Flavor } from "./flavors-code";

/** `highlighted` is each tab's code, coloured on the server; its lines move between tabs. */
export function Flavors({ highlighted }: { highlighted: Record<Flavor, ReactNode> }) {
  const [flavor, setFlavor] = useState<Flavor>("React");
  const [copied, setCopied] = useState(false);
  const { file, code } = FLAVORS[flavor];
  return (
    <div className="fx">
      <div className="fx-bar">
        <div className="fx-tabs" role="tablist" aria-label="Layer">
          {NAMES.map((n) => (
            <button key={n} type="button" role="tab" aria-selected={flavor === n} onClick={() => setFlavor(n)}>
              {n}
            </button>
          ))}
        </div>
        <span className="fx-file">{file}</span>
        <button
          type="button"
          className="fx-copy"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {/* Lines both versions share stay put; the rest slide in and out. */}
      <Remold.Layout trigger={flavor} className="fx-code">
        {highlighted[flavor]}
      </Remold.Layout>
    </div>
  );
}
