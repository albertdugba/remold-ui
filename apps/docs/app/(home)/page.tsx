import Link from "next/link";
import type { ReactNode } from "react";
import { RemoldMark } from "@/components/brand/remold-mark";
import { CopyCommand } from "@/components/copy-command";
import { Faq } from "@/components/home/faq";
import { Flavors } from "@/components/home/flavors";
import { Parts } from "@/components/home/parts";
import { Points } from "@/components/home/points";
import { HeroGrid } from "@/components/home/hero-grid";
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

export default async function HomePage() {
  const highlighted = await highlightFlavors();
  return (
    <main className="hm">
      <div className="hm-hero-band">
        <HeroGrid />
        <div className="hm-frame">
          <section className="hm-hero center">
            <Link href="/docs/components/otp-input" className="hm-new">
              <span>New</span> Watch a code verify itself <span aria-hidden="true">→</span>
            </Link>
            <h1 aria-label="Interfaces that remold themselves.">
              <span aria-hidden="true">Interfaces that</span>
              <br />
              <HeroWord />
            </h1>
            <p className="hm-lead">
              Animated components for the screens you actually ship, ready to copy into your app. Under them, a small engine for layouts,
              text, SVG and canvas. React or plain JavaScript.
            </p>
            <div className="hm-actions">
              <Link className="hm-cta primary" href="/docs/quick-start">
                Get started <span aria-hidden="true">→</span>
              </Link>
              <Link className="hm-cta" href="/docs/components">
                Explore morphs
              </Link>
              <div className="hm-install">
                <CopyCommand command="npm i @remold-ui/react" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="hm-frame">
        <Section kicker="The same idea, in every form" className="first">
          <header className="hm-head row">
            <div>
              <h2>Watch one state become the next.</h2>
              <p>
                Layouts, words, icons and particles can all carry a change. These live examples show the engine at work; pick a state or
                watch them play.
              </p>
            </div>
            <Link className="hm-link" href="/docs/primitives">
              Explore the primitives <span aria-hidden="true">→</span>
            </Link>
          </header>
          <Parts />
        </Section>

        <Section kicker="Build with it">
          <div className="hm-split">
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

        <Section kicker="Questions">
          <div className="hm-split faq">
            <header className="hm-head">
              <h2>Good questions.</h2>
              <p>
                Anything else? The <Link href="/docs">docs</Link> go deeper, and every page is also available as{" "}
                <a href="/llms.txt">plain text for assistants</a>.
              </p>
            </header>
            <Faq />
          </div>
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
          <nav aria-label="For assistants">
            <p>For assistants</p>
            <a href="/llms.txt">llms.txt</a>
            <a href="/llms-full.txt">llms-full.txt</a>
          </nav>
        </div>
        <p className="hm-footer-legal">Products, companies and people in the examples are made up.</p>
      </footer>
    </main>
  );
}
