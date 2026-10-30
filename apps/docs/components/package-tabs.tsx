"use client";
/**
 * One command, shown for npm, pnpm, yarn or bun, with a copy button. The chosen package manager
 * is shared by every block on the page and remembered for next time.
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { FrameworkMenu } from "./framework";
import { Code } from "./code";

export const MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
export type Manager = (typeof MANAGERS)[number];

const KEY = "rm-package-manager";
const listeners = new Set<() => void>();
let chosen: Manager | null = null;

function read(): Manager {
  if (chosen) return chosen;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && (MANAGERS as readonly string[]).includes(saved)) chosen = saved as Manager;
  } catch {
    // Storage blocked: fall back to npm for this visit.
  }
  return chosen ?? "npm";
}

function choose(manager: Manager) {
  chosen = manager;
  try {
    localStorage.setItem(KEY, manager);
  } catch {
    // Storage blocked: the choice still holds until the page is closed.
  }
  for (const l of listeners) l();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function PackageTabs({
  commands,
  label = "Package manager",
  menu,
}: {
  commands: Record<Manager, string>;
  label?: string;
  menu?: ReactNode;
}) {
  const manager = useSyncExternalStore(subscribe, read, () => "npm" as Manager);
  const [copied, setCopied] = useState(false);
  const command = commands[manager];
  return (
    <div className="rm-pm not-prose">
      <div className="rm-pm-bar">
        <div role="tablist" aria-label={label}>
          {MANAGERS.map((m) => (
            <button key={m} type="button" role="tab" aria-selected={manager === m} onClick={() => choose(m)}>
              {m}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1">
          {menu}
          <button
            type="button"
            className="rm-pm-copy"
            aria-label="Copy command"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(command);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                // Clipboard blocked: the command can still be selected by hand.
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </div>
      <Code code={command} lang="bash" bare />
    </div>
  );
}

/** `npm install <packages>` and the same for the other managers. Other frameworks are listed as coming soon. */
export function Install({ packages }: { packages: string }) {
  return (
    <PackageTabs
      menu={<FrameworkMenu available={["react"]} />}
      commands={{
        npm: `npm install ${packages}`,
        pnpm: `pnpm add ${packages}`,
        yarn: `yarn add ${packages}`,
        bun: `bun add ${packages}`,
      }}
    />
  );
}

/** The shadcn command that copies registry item `name` into a project, from this site. */
export function AddCommand({ name }: { name: string }) {
  const [origin, setOrigin] = useState("https://your-docs-site");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/r/${name}.json`;
  return (
    <PackageTabs
      // The registry has React components; other frameworks are coming.
      menu={<FrameworkMenu available={["react"]} />}
      commands={{
        npm: `npx shadcn@latest add ${url}`,
        pnpm: `pnpm dlx shadcn@latest add ${url}`,
        yarn: `yarn dlx shadcn@latest add ${url}`,
        bun: `bunx --bun shadcn@latest add ${url}`,
      }}
    />
  );
}
