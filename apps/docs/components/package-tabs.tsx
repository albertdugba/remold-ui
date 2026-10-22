"use client";
/**
 * One command, shown for npm, pnpm, yarn or bun, with a copy button. The chosen package manager
 * is shared by every block on the page and remembered for next time.
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { FrameworkMenu, useFramework, type Framework } from "./framework";
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

/**
 * `npm install <packages>` and the same for the other managers. `vanilla` is what to install for
 * plain JavaScript instead of React (`@remold-ui/dom`, say); `js` marks packages that are
 * JavaScript-only. Other frameworks are listed as coming soon.
 */
export function Install({ packages, vanilla, js = false }: { packages: string; vanilla?: string; js?: boolean }) {
  const available: Framework[] = js ? ["js"] : vanilla ? ["react", "js"] : ["react"];
  const framework = useFramework(available);
  const chosen = framework === "js" && vanilla ? vanilla : packages;
  return (
    <PackageTabs
      menu={<FrameworkMenu available={available} />}
      commands={{
        npm: `npm install ${chosen}`,
        pnpm: `pnpm add ${chosen}`,
        yarn: `yarn add ${chosen}`,
        bun: `bun add ${chosen}`,
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
