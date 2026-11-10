import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { RemoldMark } from "@/components/brand/remold-mark";

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
    ],
  };
}
