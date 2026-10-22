import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { Shapes } from "lucide-react";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      // The sections in the sidebar already lead to the docs, components and building blocks.
      links={[{ icon: <Shapes />, text: "Playground", url: "/play", active: "url" }]}
    >
      {children}
    </DocsLayout>
  );
}
