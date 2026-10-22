import { defineConfig } from "tsup";

const external = ["react", "react-dom", "react/jsx-runtime"];

export default defineConfig([
  // ES modules, one file per source file. `Remold` stays a real module namespace, so a
  // bundler keeps only the parts an app uses: `Remold.Text` doesn't pull in Scene or canvas.
  {
    entry: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.ts", "!src/**/*.test.tsx"],
    format: ["esm"],
    bundle: false,
    outDir: "dist/esm",
    target: "es2022",
    external,
    clean: true,
  },
  // CommonJS for older tools, as one file, with the type declarations for both.
  {
    entry: ["src/index.ts"],
    format: ["cjs"],
    dts: { entry: "src/index.ts", compilerOptions: { composite: false } },
    outDir: "dist",
    target: "es2022",
    external,
    clean: false,
  },
]);
