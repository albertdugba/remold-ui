// What each common import costs an app, measured the way an app's bundler would see it: every case
// is bundled against the built packages (run `pnpm build` first), minified, with React and Motion
// left out, then gzipped. Code that's only loaded on demand (such as the particles matching worker)
// is counted separately. Run `pnpm size`, or `pnpm size --why` to see which files fill each bundle.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "packages/canvas/package.json"));
// esbuild comes with tsup, which every package builds with.
const esbuild = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsup/package.json"))] }));

const CASES = [
  ["Remold.Morph", `import { Remold } from "@remold-ui/react"; export const C = () => <Remold.Morph trigger={1}><div /></Remold.Morph>;`],
  ["Remold.Text", `import { Remold } from "@remold-ui/react"; export const C = () => <Remold.Text>hi</Remold.Text>;`],
  ["useAutoplay", `import { useAutoplay } from "@remold-ui/react"; export const C = () => useAutoplay(3);`],
  ["Remold.Particles (react/canvas)", `import { Remold } from "@remold-ui/react/canvas"; export const C = () => <Remold.Particles shape="Hi" />;`],
  ["transition() (dom)", `import { transition } from "@remold-ui/dom"; export const f = transition;`],
  ["createMorph() (core)", `import { createMorph } from "@remold-ui/core"; export const f = createMorph;`],
  ["shapes (core)", `import { shapes } from "@remold-ui/core"; export const f = shapes.sphere;`],
  ["particles() (canvas)", `import { particles } from "@remold-ui/canvas"; export const f = particles;`],
  ["painter() (canvas)", `import { painter } from "@remold-ui/canvas"; export const f = painter;`],
];

const why = process.argv.includes("--why");
// Resolved through the docs app, where the workspace packages are linked, so their `exports` apply as in an app.
const nodePaths = [path.join(root, "apps/docs/node_modules")];
const kilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const work = await mkdtemp(path.join(tmpdir(), "remold-size-"));

try {
  console.log(`${"Import".padEnd(34)}${"min".padStart(10)}${"gzip".padStart(10)}  on demand (gzip)`);
  for (const [index, [name, code]] of CASES.entries()) {
    const entry = path.join(work, `case-${index}.tsx`);
    await writeFile(entry, code);
    const result = await esbuild.build({
      entryPoints: [entry],
      outdir: path.join(work, `out-${index}`),
      bundle: true,
      splitting: true,
      minify: true,
      format: "esm",
      platform: "browser",
      jsx: "automatic",
      external: ["react", "react-dom", "react/jsx-runtime", "motion", "motion/react"],
      nodePaths,
      metafile: true,
      write: true,
      logLevel: "error",
    });
    const outputs = Object.entries(result.metafile.outputs).filter(([file]) => file.endsWith(".js"));
    const sizes = await Promise.all(
      outputs.map(async ([file, output]) => ({ file, output, gzip: gzipSync(await readFile(file)).length, min: output.bytes })),
    );
    const main = sizes.find(({ output }) => output.entryPoint);
    const lazy = sizes.filter((size) => size !== main && size.gzip > 200);
    console.log(
      `${name.padEnd(34)}${kilobytes(main.min).padStart(10)}${kilobytes(main.gzip).padStart(10)}  ${lazy.map(({ gzip }) => kilobytes(gzip)).join(", ")}`,
    );
    if (why) {
      const inputs = Object.entries(main.output.inputs)
        .sort(([, a], [, b]) => b.bytesInOutput - a.bytesInOutput)
        .slice(0, 6);
      for (const [file, { bytesInOutput }] of inputs) console.log(`    ${kilobytes(bytesInOutput).padStart(9)}  ${path.relative(root, file)}`);
    }
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
