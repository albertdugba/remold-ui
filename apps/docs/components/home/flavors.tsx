"use client";

import { Tabs } from "@base-ui/react/tabs";
import { Copy01Icon, File02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FLAVOR_NAMES as NAMES, FLAVORS, type Flavor } from "./flavors-code";

const COPIED_FOR = 1500;

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_FOR);
  };

  return (
    <button
      type="button"
      className="hmc-copy"
      data-copied={copied || undefined}
      aria-label={copied ? "Code copied" : "Copy code"}
      onClick={copy}
    >
      <Remold.Icon icon={<HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />} strokeWidth={2} aria-hidden="true" />
      <Remold.Text>{copied ? "Copied" : "Copy"}</Remold.Text>
    </button>
  );
}

/** The same job in each layer of the library; switching layers moves the lines the versions share. */
export function Flavors({ highlighted }: { highlighted: Record<Flavor, ReactNode> }) {
  const [flavor, setFlavor] = useState<Flavor>("React");
  const { file, code } = FLAVORS[flavor];

  return (
    <div className="hmc">
      <Tabs.Root value={flavor} onValueChange={(next) => setFlavor(next as Flavor)}>
        <div className="hmc-bar">
          <span className="hmc-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>

          <Tabs.List className="hmc-tabs" aria-label="Interface layer">
            {NAMES.map((name) => (
              <Tabs.Tab key={name} value={name} className="hmc-tab">
                {name}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className="hmc-indicator" />
          </Tabs.List>

          <CopyButton code={code} />
        </div>

        <div className="hmc-file">
          <HugeiconsIcon icon={File02Icon} strokeWidth={1.8} aria-hidden="true" />
          <Remold.Text>{file}</Remold.Text>
        </div>

        <Tabs.Panel value={flavor} className="hmc-panel">
          <Remold.Morph trigger={flavor} className="hmc-code">
            {highlighted[flavor]}
          </Remold.Morph>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
