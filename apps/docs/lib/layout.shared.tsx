import { NewTwitterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { RemoldMark } from "@/components/brand/remold-mark";

/** Albert Dugba, who makes Remold, on X. */
export const X_HANDLE = "albertdugba__";
export const X_URL = `https://x.com/${X_HANDLE}`;

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/albertdugba/remold-ui",
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
    ],
  };
}
