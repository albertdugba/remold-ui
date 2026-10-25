// Builds the shadcn registry in public/r from the live demos, so `npx shadcn add <url>/r/<name>.json`
// copies a demo, every local file it imports and its CSS into a project. Run before dev and build.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const demos = path.join(app, "components/demos");
const out = path.join(app, "public/r");
const TARGET = "components/remold";
const EXTENSIONS = [".tsx", ".ts", ".js", ".css"];

/** The items people can install: the demo file each one starts from, and how it's described. */
const ITEMS = [
  [
    "course-outline",
    "Course outline",
    "Modules and lessons joined by lines that stay attached as modules open and lessons are ticked off.",
  ],
  ["onboarding-checklist", "Onboarding checklist", "A setup checklist that ticks off, skips, docks into a pill and collapses when done."],
  [
    "integrations-hub",
    "Integrations hub",
    "Your product in the middle and its integrations around it, rearranging by category, with data flowing along the lines.",
  ],
  [
    "product-anatomy",
    "Product anatomy",
    "Your product drawn as its layers: assembled, exploded with notes, or laid out in the order a request travels.",
  ],
  [
    "layer-stack",
    "Layer stack",
    "A toolchain or product as stacked line-art layers; one at a time takes the focus while the layers above turn to ghosts, with HTML labels that follow the scene.",
  ],
  [
    "edge-delivery",
    "Edge delivery",
    "A file’s trip from your app to a cloud bucket, through a resize function, out to edge servers and on to people nearby, as a line-art scene in five steps. Named for AWS, Google Cloud, Cloudflare or your own stack.",
  ],
  [
    "comment-thread",
    "Comment thread",
    "Product Q&A or article comments, with live typing, lit reply paths and a summary the discussion condenses into.",
  ],
  ["morph-icons", "Morph icons", "44 outline icons that morph into each other, any to any."],
  [
    "podcast-player",
    "Podcast",
    "A grid of episode cards that open into the episode's details: the artwork grows from the tile into the hero and the title lifts off it, matched with no ids.",
  ],
  ["search-results", "Search with recents", "A search field that rises as recent searches open under it, and a word that becomes the one you choose, letter by letter."],
  ["upload-flow", "Image upload", "One frame from empty to uploaded: a bar fills under the picture, a check arrives and the byte count rolls up."],
  ["pricing-toggle", "Pricing toggle", "Monthly to yearly: the thumb slides, the price rolls to its new digits and the saving arrives beside it."],
  ["two-factor", "Two-factor setup", "A setting that opens a QR code and code field in place, moving the rows below, and folds to one line once on."],
  ["invite-team", "Invite teammates", "An email becomes a chip, then the person's avatar travels from the invite field into the team's stack."],
  ["accounts", "Accounts", "A bank's accounts page: an account card grows into its page, and money moved between accounts flies from one card to the other."],
  [
    "logo-morph",
    "Logo morph",
    "Text whose glyph outlines flow into the next word or mark: product names by default, or any SVG path data you pass in.",
  ],
  ["letters", "Letters as geometry", "Bend a word around the pointer and morph it into a logo."],
  [
    "voice-orb",
    "Voice orb",
    "A living voice/agent orb whose silhouette undulates with the voice, with swirling inner light and a soft glow. Driven by a level prop or the real microphone; idle, listening, thinking, speaking.",
  ],
  ["build-anything", "Build anything", "Any SVG shape as a solid: sheen, glowing rims, trays, decals and callouts."],
  ["scenes-gallery", "Living diagrams", "Isometric architecture, integration, database and edge diagrams that rearrange."],
  ["gallery", "Canvas gallery", "A globe with routes, voxels and layers on one canvas."],
  ["files", "Sortable list", "A file list that sorts and filters with every row moving to its place."],
  ["layout", "Grid and list", "People as cards or rows: different markup, matched without keys."],
  ["text", "Text morph", "A status label and a price that change only the letters that differ."],
  ["icons", "Icon toggles", "Toggle buttons whose icons morph between states."],
  ["feedback-face", "Feedback face", "A rating whose face morphs part by part: brows, eyes, mouth and cheeks."],
  ["scene", "Scene", "An isometric canvas scene with layouts and focus."],
  ["story", "Story", "A scene that steps through a story with Back and Next."],
  ["particles", "Particles", "Text and shapes as dots that flow from one to the next."],
  ["match-lines", "Match lines", "Draw what Remold paired: a line from each element to its partner."],
];

/** Theme colours the demos use, with fallbacks for projects that don't define them. */
const FALLBACKS = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#fafafa",
  border: "#e5e5e5",
  muted: "#f5f5f5",
  "muted-foreground": "#737373",
  accent: "#f0f0f0",
  "accent-foreground": "#0a0a0a",
  primary: "#171717",
  "primary-foreground": "#fafafa",
  secondary: "#f5f5f5",
  ring: "#2563eb",
};

async function resolve(name) {
  for (const candidate of path.extname(name) ? [name] : EXTENSIONS.map((ext) => name + ext)) {
    try {
      return { name: candidate, code: await readFile(path.join(demos, candidate), "utf8") };
    } catch {
      // Try the next extension.
    }
  }
  return null;
}

const localImports = (code) => [...code.matchAll(/(?:from|import)\s+'\.\/([^']+)'/g)].map((m) => m[1]);
/** Packages the project already has, so they aren't listed as dependencies. */
const PROVIDED = new Set(["react", "react-dom", "next"]);
/** Every bare import, as a package name (`@scope/name` or `name`): engine packages, icons and the rest. */
const packageImports = (code) =>
  [...code.matchAll(/(?:from|import)\s+'([^.'][^']*)'/g)]
    .map((m) => {
      const parts = m[1].split("/");
      return m[1].startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    })
    .filter((name) => !PROVIDED.has(name));

function withFallbacks(css) {
  return css.replace(/var\(--color-fd-([a-z-]+)\)/g, (whole, name) =>
    FALLBACKS[name] ? `var(--color-fd-${name}, ${FALLBACKS[name]})` : whole,
  );
}

async function collect(entry) {
  const files = [];
  const dependencies = new Set();
  const seen = new Set();
  const visit = async (name) => {
    const file = await resolve(name);
    if (!file || seen.has(file.name)) return;
    seen.add(file.name);
    for (const dep of packageImports(file.code)) dependencies.add(dep);
    const css = file.name.endsWith(".css");
    files.push({
      path: `${TARGET}/${file.name}`,
      content: css ? withFallbacks(file.code) : file.code,
      type: css ? "registry:file" : "registry:component",
      target: `${TARGET}/${file.name}`,
    });
    for (const dep of localImports(file.code)) await visit(dep);
  };
  await visit(entry);
  if (files.length === 0) throw new Error(`build-registry: no demo file for "${entry}"`);
  return { files, dependencies: [...dependencies].sort() };
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const index = [];
for (const [name, title, description] of ITEMS) {
  const { files, dependencies } = await collect(name);
  const item = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:block",
    title,
    description,
    dependencies,
    files,
  };
  await writeFile(path.join(out, `${name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  index.push({
    name,
    type: item.type,
    title,
    description,
    dependencies,
    files: files.map(({ path: p, type, target }) => ({ path: p, type, target })),
  });
}
await writeFile(
  path.join(out, "registry.json"),
  `${JSON.stringify(
    { $schema: "https://ui.shadcn.com/schema/registry.json", name: "remold", homepage: "/", items: index },
    null,
    2,
  )}\n`,
);
console.log(`registry: ${ITEMS.length} items in public/r`);
