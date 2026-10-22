import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // The docs were reorganised: building blocks moved to /docs/primitives, and the ready-made
  // examples became /docs/components. Old links keep working.
  async redirects() {
    const primitives = ["root", "text", "icon", "path-group", "scene", "story", "particles", "ignore"];
    const renamed = { diagrams: "living-diagrams", "beyond-diagrams": "canvas-gallery" };
    return [
      ...primitives.map((slug) => ({ source: `/docs/components/${slug}`, destination: `/docs/primitives/${slug}`, permanent: true })),
      ...Object.entries(renamed).map(([from, to]) => ({
        source: `/docs/examples/${from}`,
        destination: `/docs/components/${to}`,
        permanent: true,
      })),
      { source: "/docs/examples/:slug", destination: "/docs/components/:slug", permanent: true },
      { source: "/docs/components/file-tree", destination: "/docs/components/course-outline", permanent: true },
      { source: "/docs/components/wallet", destination: "/docs/components/accounts", permanent: true },
    ];
  },
};

export default withMDX(config);
