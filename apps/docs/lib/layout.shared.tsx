import { GithubIcon, NewTwitterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { RemoldMark } from "@/components/brand/remold-mark";

/** Albert Dugba, who makes Remold, on X. */
export const X_HANDLE = "albertdugba__";
export const X_URL = `https://x.com/${X_HANDLE}`;

export const GITHUB_OWNER = "albertdugba";
export const GITHUB_REPO = "remold-ui";
export const GITHUB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

function GithubLink() {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`${GITHUB_OWNER}/${GITHUB_REPO} on GitHub`}
      className="inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-[13.5px] whitespace-nowrap text-fd-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-foreground motion-reduce:transition-none"
    >
      <HugeiconsIcon icon={GithubIcon} strokeWidth={1.8} className="size-[18px] flex-none text-fd-foreground" aria-hidden="true" />
      <span>
        {GITHUB_OWNER}
        <span className="mx-px opacity-60">/</span>
        <span className="font-semibold text-fd-foreground">{GITHUB_REPO}</span>
      </span>
    </a>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <RemoldMark size={20} wordmark />,
    },
    links: [
      { text: "Docs", url: "/docs", active: "url" },
      { text: "Components", url: "/docs/components", active: "nested-url" },
      { text: "Building blocks", url: "/docs/primitives", active: "nested-url" },
      {
        type: "icon",
        label: `@${X_HANDLE} on X`,
        text: "X",
        icon: <HugeiconsIcon icon={NewTwitterIcon} strokeWidth={1.8} />,
        url: X_URL,
        external: true,
      },
      { type: "custom", secondary: true, children: <GithubLink /> },
    ],
  };
}
