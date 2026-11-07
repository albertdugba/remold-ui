import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  // Lets a phone on the same Wi-Fi open the dev server by its local address.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default withMDX(config);
