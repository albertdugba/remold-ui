"use client";

import {
  AiSearchIcon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  ChatGptIcon,
  ClaudeIcon,
  GithubIcon,
  TextAlignLeftIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "fumadocs-ui/components/ui/popover";

interface OpenMenuProps {
  prompt: string;
  markdownUrl: string;
  githubUrl: string;
}

interface Destination {
  title: string;
  href: string;
  icon: IconSvgElement;
}

const CursorMarkIcon: IconSvgElement = [
  [
    "path",
    {
      d: "M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23",
      fill: "currentColor",
      stroke: "none",
      key: "0",
    },
  ],
];

const withQuery = (url: string, query: Record<string, string>) => `${url}?${new URLSearchParams(query)}`;

function destinationsFor({ prompt, markdownUrl, githubUrl }: OpenMenuProps): Destination[] {
  return [
    { title: "Open in GitHub", href: githubUrl, icon: GithubIcon },
    { title: "View as Markdown", href: markdownUrl, icon: TextAlignLeftIcon },
    { title: "Open in ChatGPT", href: withQuery("https://chatgpt.com/", { prompt, hints: "search" }), icon: ChatGptIcon },
    { title: "Open in Claude", href: withQuery("https://claude.ai/new", { q: prompt }), icon: ClaudeIcon },
    { title: "Open in Cursor", href: withQuery("https://cursor.com/link/prompt", { text: prompt }), icon: CursorMarkIcon },
    { title: "Open in Scira AI", href: withQuery("https://scira.ai/", { q: prompt }), icon: AiSearchIcon },
  ];
}

export function OpenMenu(props: OpenMenuProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={`${buttonVariants({ variant: "secondary", size: "sm" })} gap-2 data-[popup-open]:bg-fd-accent data-[popup-open]:text-fd-accent-foreground`}
      >
        Open
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} className="text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col">
        {destinationsFor(props).map((destination) => (
          <a
            key={destination.title}
            href={destination.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <HugeiconsIcon icon={destination.icon} size={16} strokeWidth={1.8} />
            {destination.title}
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={1.8} className="ms-auto text-fd-muted-foreground" />
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
