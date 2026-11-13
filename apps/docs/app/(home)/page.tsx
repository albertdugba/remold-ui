import Link from "next/link";
import type { ReactNode } from "react";
import { RemoldMark } from "@/components/brand/remold-mark";
import { X_HANDLE, X_URL } from "@/lib/layout.shared";
import { FavouriteIcon, GithubIcon, StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { InstallCommand } from "@/components/home/install-command";
import { Flavors } from "@/components/home/flavors";
import { Parts } from "@/components/home/parts";
import { Kicker, Rail, Rails, Selected, SpecSheet, SpringSpecimen } from "@/components/home/drafting";
import { HeroWord } from "@/components/home/hero-word";
import { FLAVOR_NAMES, FLAVORS, type Flavor } from "@/components/home/flavors-code";
import { highlight } from "fumadocs-core/highlight";
import type { Metadata } from "next";
import { siteDescription, socialImage, socialImageAlt } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Remold UI · Change you can follow" },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Remold UI · Change you can follow",
    description: siteDescription,
    images: [{ url: socialImage, width: 1200, height: 630, alt: socialImageAlt }],
  },
  twitter: { card: "summary_large_image", images: [socialImage] },
};

function Section({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`hm-section scroll-mt-20${className ? ` ${className}` : ""}`}>
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

const FOOTER = [
  {
    title: "Navigate",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Examples", href: "/docs/components" },
    ],
  },
  {
    title: "Follow",
    links: [
      { label: `@${X_HANDLE} on X`, href: X_URL },
      { label: "GitHub", href: REPO_URL },
    ],
  },
  {
    title: "For assistants",
    links: [
      { label: "llms.txt", href: "/llms.txt" },
      { label: "llms-full.txt", href: "/llms-full.txt" },
    ],
  },
];
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
              <Kicker className="mb-0">
                100% free and open source
                <span aria-hidden="true">·</span>
                <a
                  className="inline-flex items-center gap-1.5 text-(--hm-ink) underline decoration-(--hm-line) underline-offset-4 transition-colors duration-150 ease-out hover:decoration-(--hm-ink)"
                  href={REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <HugeiconsIcon icon={GithubIcon} size={14} strokeWidth={2} aria-hidden="true" />
                  Star on GitHub
                </a>
              </Kicker>
              <h1 aria-label="Components that remold themselves.">
                <span aria-hidden="true">Components that</span>
                <br />
                <HeroWord />
              </h1>
            </div>
            <div className="hm-hero-side">
              <p className="hm-lead">
                Animated React components for the screens you actually ship, ready to copy into your app. Built with Motion and
                Base UI, with Remold for the morphing: text, icons, shapes and particles.
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

      </div>

      <div className="hm-frame pb-10">
        <Rails>
          <Rail id="build-with-it">
            <div className="hm-split code">
              <div className="hm-head">
                <Kicker>Build with it</Kicker>
                <h2>Use Remold at the level you need.</h2>
                <p>
                  Reach for it where a morph says more than a fade: as a React component, from plain JavaScript on any element, or in a canvas scene. The matching and spring maths underneath are available on their own, too.
                </p>
                <Link className="hm-link" href="/docs/installation">
                  Installation <span aria-hidden="true">→</span>
                </Link>
              </div>
              <Flavors highlighted={highlighted} />
            </div>
          </Rail>

          <Rail id="why-remold">
            <header className="hm-head mb-12">
              <Kicker>Why Remold</Kicker>
              <h2>Made for interfaces that change.</h2>
              <p>Remold handles the moments one thing turns into another, and leaves the rest to the tools you already use.</p>
            </header>
            <div className="grid items-start gap-x-[clamp(32px,6vw,96px)] gap-y-12 min-[1000px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="[container-type:inline-size] min-[1000px]:sticky min-[1000px]:top-24">
                <SpringSpecimen />
              </div>
              <SpecSheet />
            </div>
          </Rail>

          <Rail id="start-here">
            <div className="relative grid justify-items-start overflow-hidden rounded-[28px] border border-solid border-(--hm-line) px-[clamp(24px,5vw,72px)] py-[clamp(64px,9vw,120px)] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--hm-line)_55%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--hm-line)_55%,transparent)_1px,transparent_1px)] [background-size:40px_40px]">
              <Kicker>Start here</Kicker>
              <h2 className="m-0 text-[clamp(34px,5.4vw,72px)] leading-[1.04] font-semibold tracking-[-0.045em]">
                Make the change feel <Selected>connected</Selected>.
              </h2>
              <p className="mt-6 mb-0 max-w-[52ch] text-[17px] leading-[1.6] text-(--hm-muted)">
                Copy a component as it is, or bring your own interface and let Remold morph what carries over.
              </p>
              <div className="hm-actions">
                <Link className="hm-cta primary" href="/docs/quick-start">
                  Get started <span aria-hidden="true">→</span>
                </Link>
                <Link className="hm-cta" href="/docs/components">
                  See examples
                </Link>
              </div>
            </div>
          </Rail>

          <Rail as="footer" className="py-[clamp(40px,5vw,64px)]!">
            <div className="grid gap-x-8 gap-y-10 min-[760px]:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
              <div>
                <RemoldMark size={20} wordmark />
                <p className="hm-footer-note">Change you can follow. Free and open source under the MIT licence.</p>
              </div>
              {FOOTER.map((column) => (
                <nav key={column.title} aria-label={column.title} className="grid content-start gap-2.5 text-[14px]">
                  <p className="m-0 mb-1.5 font-mono text-[12px] tracking-[0.08em] text-(--hm-muted) uppercase">{column.title}</p>
                  {column.links.map((link) => (
                    <a
                      key={link.href}
                      className="text-(--hm-ink) hover:underline hover:underline-offset-4"
                      href={link.href}
                      {...(link.href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              ))}
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
          </Rail>
        </Rails>
      </div>
    </main>
  );
}
