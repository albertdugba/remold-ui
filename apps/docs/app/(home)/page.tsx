import Link from "next/link";
import type { ReactNode } from "react";
import { RemoldMark } from "@/components/brand/remold-mark";
import { X_HANDLE, X_URL } from "@/lib/layout.shared";
import { FavouriteIcon, StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { InstallCommand } from "@/components/home/install-command";
import { Flavors } from "@/components/home/flavors";
import { Parts } from "@/components/home/parts";
import { Points } from "@/components/home/points";
import { HeroWord } from "@/components/home/hero-word";
import { FLAVOR_NAMES, FLAVORS, type Flavor } from "@/components/home/flavors-code";
import { highlight } from "fumadocs-core/highlight";

export const metadata = {
  title: "Remold UI · Change you can follow",
  description:
    "An open-source morph engine that finds what persists between interface states and animates what changes, across layouts, text, SVG and canvas.",
};

function Section({ kicker, className, children }: { kicker?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`hm-section${className ? ` ${className}` : ""}`}>
      {kicker && <p className="hm-kicker">{kicker}</p>}
      {children}
    </section>
  );
}

/** Each layer tab's code, coloured once on the server so switching tabs is instant. */
async function highlightFlavors(): Promise<Record<Flavor, ReactNode>> {
  const entries = await Promise.all(
    FLAVOR_NAMES.map(
      async (name) =>
        [
          name,
          await highlight(FLAVORS[name].code, { lang: "tsx", defaultColor: false, themes: { light: "github-light", dark: "github-dark" } }),
        ] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<Flavor, ReactNode>;
}

const REPO_URL = "https://github.com/albertdugba/remold-ui";
const CREDIT_LINK =
  "font-medium text-fd-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:decoration-fd-foreground";

export default async function HomePage() {
  const highlighted = await highlightFlavors();
  return (
    <main className="hm">
      <div className="hm-hero-band">
        <div className="hm-frame">
          <section className="hm-hero split">
            <div className="hm-hero-title">
              <h1 aria-label="Interfaces that remold themselves.">
                <span aria-hidden="true">Interfaces that</span>
                <br />
                <HeroWord />
              </h1>
            </div>
            <div className="hm-hero-side">
              <p className="hm-lead">
                React components for the screens you actually ship, animated with Motion and Remold and ready to copy into your app.
                Underneath sits the Remold engine, which morphs one state into the next in React, the DOM, SVG and canvas.
              </p>
              <div className="hm-actions">
                <Link className="hm-cta primary" href="/docs/quick-start">
                  Get started <span aria-hidden="true">→</span>
                </Link>
                <Link className="hm-cta" href="/docs/components">
                  Browse components
                </Link>
              </div>
              <div className="hm-install">
                <InstallCommand />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="hm-frame">
        <Section className="first">
          <Parts />
        </Section>

        <Section kicker="Build with it">
          <div className="hm-split code">
            <div className="hm-head">
              <h2>Use the engine at the level you need.</h2>
              <p>
                Start with a React component, call it from plain JavaScript on any element, or build a canvas scene. The matching and spring logic underneath is available on its own, too.
              </p>
              <Link className="hm-link" href="/docs/installation">
                Installation <span aria-hidden="true">→</span>
              </Link>
            </div>
            <Flavors highlighted={highlighted} />
          </div>
        </Section>

        <Section kicker="Why Remold">
          <header className="hm-head">
            <h2>Made for interfaces that change.</h2>
            <p>Wrap what changes and keep building. The rest is handled for you.</p>
          </header>
          <Points />
        </Section>
      </div>

      <footer className="hm-end">
        <div className="hm-end-cta">
          <h2>Make the change feel connected.</h2>
          <p>Bring your own interface. Remold finds what carries over and animates the rest.</p>
          <div className="hm-actions">
            <Link className="hm-cta primary" href="/docs/quick-start">
              Get started <span aria-hidden="true">→</span>
            </Link>
            <Link className="hm-cta" href="/docs/components">
              See examples
            </Link>
          </div>
        </div>
        <div className="hm-footer">
          <div>
            <RemoldMark size={20} wordmark />
            <p className="hm-footer-note">Change you can follow. The engine is open source under the MIT licence.</p>
          </div>
          <nav aria-label="Footer">
            <p>Navigate</p>
            <Link href="/docs">Docs</Link>
            <Link href="/docs/components">Examples</Link>
          </nav>
          <nav aria-label="Follow">
            <p>Follow</p>
            <a href={X_URL} target="_blank" rel="noreferrer">
              @{X_HANDLE} on X
            </a>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
          <nav aria-label="For assistants">
            <p>For assistants</p>
            <a href="/llms.txt">llms.txt</a>
            <a href="/llms-full.txt">llms-full.txt</a>
          </nav>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-fd-border pt-6 text-[13px] text-fd-muted-foreground">
          <p className="m-0 max-w-[60ch] leading-relaxed">
            Made with{" "}
            <HugeiconsIcon
              icon={FavouriteIcon}
              size={14}
              className="inline align-[-2px] text-rose-500"
              aria-label="love"
            />{" "}
            by{" "}
            <a className={CREDIT_LINK} href={X_URL} target="_blank" rel="noreferrer">
              @{X_HANDLE}
            </a>
            . If Remold is useful to you, a{" "}
            <a className={CREDIT_LINK} href={REPO_URL} target="_blank" rel="noreferrer">
              <HugeiconsIcon icon={StarIcon} size={13} className="mr-1 inline align-[-2px]" aria-hidden="true" />
              star on GitHub
            </a>{" "}
            would mean a lot.
          </p>
          <p className="m-0 text-[12px]">Products, companies and people in the examples are made up.</p>
        </div>
      </footer>
    </main>
  );
}
