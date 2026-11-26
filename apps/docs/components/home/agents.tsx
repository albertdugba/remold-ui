import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";

import { ClaudeMarkIcon, CodexMarkIcon, CursorMarkIcon, OpenCodeMarkIcon, ShadcnMarkIcon } from "@/components/brand/marks";
import { Kicker } from "@/components/home/drafting";

interface Logo {
  name: string;
  icon: IconSvgElement;
  color: string;
}

const INK = "text-(--hm-ink)";
const CODEX = ["#B1A7FF", "#7A9DFF", "#3941FF"];

const AGENTS: Logo[] = [
  { name: "Claude Code", icon: ClaudeMarkIcon, color: "text-[#D97757]" },
  { name: "Cursor", icon: CursorMarkIcon, color: INK },
  { name: "Codex", icon: CodexMarkIcon, color: "[&_path]:[fill:url(#codex-gradient)]" },
  { name: "OpenCode", icon: OpenCodeMarkIcon, color: INK },
];

const SHADCN: Logo = { name: "shadcn compatible", icon: ShadcnMarkIcon, color: INK };

const BAR =
  "col-span-full row-start-2 m-0 grid list-none grid-cols-5 overflow-hidden rounded-[16px] border border-solid border-(--hm-line) bg-fd-background p-0 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent";
const TILE =
  "grid h-[60px] place-items-center border-r border-solid border-(--hm-line) last:border-r-0 sm:size-10 sm:rounded-[12px] sm:border sm:bg-fd-background sm:last:border-r";
const LINK = "group inline-flex items-center gap-1.5 text-[13.5px] font-medium whitespace-nowrap text-(--hm-ink)";
const UNDERLINE =
  "underline decoration-(--hm-line) underline-offset-4 transition-[text-decoration-color] duration-150 ease-out group-hover:decoration-(--hm-ink) motion-reduce:transition-none";

function Tile({ logo }: { logo: Logo }) {
  return (
    <li className={`${TILE} ${logo.color}`}>
      <span role="img" aria-label={logo.name} title={logo.name} className="grid size-full place-items-center">
        <HugeiconsIcon icon={logo.icon} className="size-[23px] sm:size-[19px]" aria-hidden="true" />
      </span>
    </li>
  );
}

export function Agents() {
  return (
    <div className="hm-hero-agents grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3.5 sm:flex sm:flex-wrap sm:gap-x-5">
      <Kicker className="mb-0">Works with</Kicker>

      <svg aria-hidden="true" className="absolute size-0">
        <linearGradient id="codex-gradient" gradientUnits="userSpaceOnUse" x1="12" x2="12" y1="0" y2="24">
          {CODEX.map((color, index) => (
            <stop key={color} offset={index / (CODEX.length - 1)} stopColor={color} />
          ))}
        </linearGradient>
      </svg>

      <ul aria-label="Works with" className={BAR}>
        {AGENTS.map((agent) => (
          <Tile key={agent.name} logo={agent} />
        ))}

        <li aria-hidden="true" className="mx-1.5 h-5 w-px bg-(--hm-line) max-sm:hidden" />

        <Tile logo={SHADCN} />
      </ul>

      <Link className={`${LINK} col-start-2 row-start-1 min-[900px]:ml-auto`} href="/docs/registry#with-an-ai-assistant">
        <span className={UNDERLINE}>Set up your agent</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
