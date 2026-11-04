// Builds the shadcn registry in public/r from the live demos, so `npx shadcn add <url>/r/<name>.json`
// copies a demo, every local file it imports and its CSS into a project. Run before dev and build.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const demos = path.join(app, "components/demos");
const out = path.join(app, "public/r");
const sourceModule = path.join(app, "components/generated/demo-sources.ts");
const TARGET = "components/remold";
const EXTENSIONS = [".tsx", ".ts", ".js", ".css"];
const LARGEST_SOURCE_FILE = 40_000;

/** The items people can install: the demo file each one starts from, how it's described and, if it
 * doesn't live in components/demos, the folder under components it does live in. */
const ITEMS = [
  [
    "split-amount",
    "Split amount",
    "A bill splitter where toggling people re-divides the bar and rolls everyone's share, cents included. Built on Base UI's ToggleGroup.",
  ],
  [
    "upload-row",
    "Upload row",
    "A file field whose progress chip grows into the file's row when the upload finishes. Built on Base UI's Field and Progress.",
  ],
  [
    "range-slider",
    "Range slider",
    "A price range slider whose price rides above the handle while you drag and flies back into the label when you let go. Built on Base UI's Slider.",
  ],
  [
    "price-filter",
    "Price filter",
    "A max-price filter: a stepper that stretches into a slider while you drag the price sideways, over a price histogram and a rolling count of what matches. Built on Base UI's Number Field and Slider.",
  ],
  [
    "event-rsvp",
    "Event RSVP",
    "An RSVP button that grows into a sheet for your answer, saves with a progress bar, and becomes your spot. Built on Base UI's Button, Radio Group, Checkbox, Progress, Tooltip and Separator.",
  ],
  [
    "promo-code",
    "Promo code",
    "A promo code field that shrinks into a chip when applied, slides in the discount and rolls the total; refused codes shake and say why. Built on Base UI's Field.",
  ],
  [
    "quantity-stepper",
    "Quantity stepper",
    "An Add button that stretches into a quantity stepper whose count rolls, with the minus becoming a bin at one. Built on Base UI's NumberField.",
  ],
  [
    "address-autocomplete",
    "Address autocomplete",
    "An address search whose chosen suggestion splits into street, area and postcode fields, each part moving into place. Built on Base UI's Autocomplete and Field.",
  ],
  [
    "tag-input",
    "Tag input",
    "A tag field where the word you type becomes the chip in place: its fill and remove button grow in around the text. Built on Base UI's Combobox with Chips.",
  ],
  [
    "phone-input",
    "Phone input",
    "A phone number field that formats as you type, regrouping the same digits with sliding separators when you change country. Built on Base UI's Field and Select.",
  ],
  [
    "amount-input",
    "Amount input",
    "An amount field whose digits rise into place and separators slide, with a shake for refused input and a helper that morphs to say how far over your balance you are.",
  ],
  [
    "course-outline",
    "Course outline",
    "Modules and lessons joined by lines that stay attached as modules open and lessons are ticked off.",
  ],
  [
    "comment-thread",
    "Comment thread",
    "A post and the conversation under it, with live typing, lit reply paths and replies that fold away.",
  ],
  [
    "hold-to-record",
    "Hold to record",
    "One pill you hold to record: the mic morphs into the record dot, the words into the time, and the waveform grows out of the pill, then it all folds back.",
  ],
  [
    "table-booking",
    "Table booking",
    "A restaurant booking that fell through offers two other times; the one you pick grows into the updated booking, whose party size opens a compact picker. Built on Base UI's Button, Toggle Group and Tooltip.",
  ],
  [
    "otp-input",
    "One-time code",
    "A sign-in card asking for an emailed code: the six cells fold into a Verifying pill, which turns green as its spinner becomes a check and the word becomes Verified.",
  ],
  [
    "live-room",
    "Live room",
    "A live audio room: the speakers' stacked faces fan out onto the stage when it opens, and a listener who raises their hand moves up to speak.",
  ],
  [
    "morph-icons",
    "Morph icons",
    "44 outline icons that morph into each other, any to any.",
  ],
  [
    "podcast-player",
    "Podcast",
    "A mini now-playing bar that opens into the full player: the artwork grows from a thumbnail into the cover and the title, show and play button settle into place, matched with no ids.",
  ],
  [
    "step-progress",
    "Step progress",
    "Checkout steps joined by lines: finishing a step turns its dot into a check and fills the line to the next, and going back undoes both.",
  ],
  [
    "invite-pill",
    "Invite pill",
    "The faces on a file and an Invite button in one pill: it opens into an email field, and sending folds it back as the person you invited joins the front of the stack.",
  ],
  [
    "save-button",
    "Save button",
    "A save button that says what's happening: Saving with a spinner, Saved with a check, or a visible rollback and Retry when the save fails.",
  ],
  [
    "product-tour",
    "Product tour",
    "A product tour where the spotlight springs from one control to the next, a line ties each tip to its target, and the tip grows out of the help button.",
  ],
  [
    "command-palette",
    "Command palette",
    "A command palette that grows out of its search pill, keeps results in place as you type, and turns a scope into a chip in the field.",
  ],
  [
    "two-factor",
    "Two-factor setup",
    "A setting that opens a QR code and code field in place, moving the rows below, and folds to one line once on.",
  ],
  [
    "invite-team",
    "Invite teammates",
    "A team's members panel: an email becomes a chip, a pending invite, then a member in their place by name.",
  ],
  [
    "signature",
    "Adopt your signature",
    "A signature pad where drawn ink flows into your name set in a script and back: strokes become ink outlines and morph into real glyph outlines.",
  ],
  [
    "project-setup",
    "Project setup",
    "A setup checklist beside an isometric picture of the project: each finished step lowers its piece into place, and the lines between pieces appear once both ends exist.",
  ],
  [
    "task-list",
    "Task list",
    "Issues grouped by status, with Done folded: a completed issue's ID travels into the folded row, and opening Done spreads them back out into rows.",
  ],
  [
    "logo-morph",
    "Logo morph",
    "Text whose glyph outlines flow into the next word or mark: product names by default, or any SVG path data you pass in.",
  ],
  [
    "voice-orb",
    "Voice orb",
    "A soft cloud-filled voice orb that breathes, listens, thinks and speaks, with a live translation demo whose translated line morphs as it revises itself.",
  ],
  [
    "editor-mentions",
    "Mentions",
    "Mentioning people in a comment: type @ and a picker opens at the caret, and the person you pick flies out of the list into the sentence as a chip.",
  ],
  [
    "wallet-stack",
    "Wallet",
    "A leather card holder whose cards slide up and fan out; choose one and it rises to the top while its latest transactions fill in.",
  ],
  [
    "revenue-card",
    "Revenue",
    "A dashboard revenue card whose chart line reshapes between ranges while the MRR and change badge roll.",
  ],
  [
    "streak",
    "Streak",
    "A daily streak celebration: the ember grows into a flame, sparks burst, the count rolls up and today's dot fills in.",
  ],
  [
    "send-message",
    "Send a message",
    "A chat composer whose mic becomes a send arrow; the message rises into the thread and the read receipt moves down to it.",
  ],
  [
    "kitchen-ticket",
    "Kitchen ticket",
    "A counter ticket whose ring fills as the order cooks, with a check and a cross that reshape into each other.",
  ],
  [
    "order-tracker",
    "Order tracker",
    "A food order told like a short film: each stage plays live, then its illustration reshapes into the next, from the pot to the bag, the scooter and your front door.",
  ],
  [
    "send-money",
    "Send money",
    "A keypad for sending money: digits roll in, an amount over your balance is refused with a shake, and Send becomes a spinner then a check.",
  ],
  [
    "currency-converter",
    "Currency converter",
    "A converter at today's real exchange rates that springs into a searchable currency list, and whose Send button says what it did.",
  ],
  [
    "donation-goal",
    "Donation goal",
    "A fundraising goal told in dots: every donation flies in as particles and fills the picture of what it pays for, until the water gathers into a heart.",
  ],
  [
    "dot-grid-hero",
    "Dot grid hero",
    "A landing page hero on a dotted background that wakes up under the cursor: dots swell and lean away as you move, and a click sends a ripple across.",
  ],
  [
    "focus-timer",
    "Focus timer",
    "A Pomodoro focus timer drawn as a particle hourglass: the sand really falls as the session runs, freezes on pause, and the glass flips into the break.",
  ],
  [
    "visitors-globe",
    "Live visitors",
    "A real-time visitors panel: a glowing planet rises from the bottom of the card while signups and upgrades pulse at their cities and invites fly between them.",
  ],
  [
    "unit-chart",
    "Unit chart",
    "A chart where every dot is 25 customers: regroup by plan, region or channel and the same dots walk to their new column.",
  ],
  [
    "inbox-triage",
    "Inbox triage",
    "An inbox where archived and deleted mail breaks into dust and pours into its tab, with multi-select, swipe, hover actions and an undo toast.",
  ],
  [
    "api-keys",
    "API keys",
    "Creating an API key in one springing card: the secret decodes once, then travels into the newest row and scrambles into its masked form.",
  ],
  [
    "seat-calculator",
    "Seat calculator",
    "Pricing by team size: faces join your team, the price rolls, and the plan steps up at each tier.",
  ],
  [
    "usage-meter",
    "Usage meter",
    "A plan's usage bars that fill, warn and go over through the month, and spring back down on upgrade.",
  ],
  [
    "onboarding-checklist",
    "Onboarding checklist",
    "A getting-started checklist that opens each next step in place and folds into an \"All set\" pill when you're done.",
  ],
  [
    "bulk-select",
    "Bulk selection",
    "Rows you select by range, joined into bands, with an action bar whose count rolls and rows that fold away on delete.",
  ],
  [
    "filter-bar",
    "Filter bar",
    "Filtering transactions with segmented tokens, while the list, the count and the total spent move to match.",
  ],
  [
    "label-picker",
    "Label picker",
    "A searchable label picker that drops chips onto an issue and offers to create labels that don't exist yet.",
  ],
  [
    "particles-story",
    "Particles story",
    "A photo that breaks into dots and flows through a music note, a parcel and a delivered check.",
    "home/particles-story",
  ],
  [
    "files",
    "Sortable list",
    "A file list that sorts and filters with every row moving to its place.",
  ],
  [
    "layout",
    "Grid and list",
    "People as cards or rows: different markup, matched without keys.",
  ],
  [
    "library-layout",
    "Base UI tabs",
    "A pricing card built from Base UI tabs, animated through a ref with useRemoldLayout.",
  ],
  [
    "text",
    "Text morph",
    "A status label and a price that change only the letters that differ.",
  ],
  ["icons", "Icon toggles", "Toggle buttons whose icons morph between states."],
  [
    "feedback-face",
    "Feedback face",
    "A rating whose face morphs part by part: brows, eyes, mouth and cheeks.",
  ],
  ["scene", "Scene", "An isometric canvas scene with layouts and focus."],
  ["story", "Story", "A scene that steps through a story with Back and Next."],
  [
    "particles",
    "Particles",
    "Text and shapes as dots that flow from one to the next.",
  ],
  [
    "match-lines",
    "Match lines",
    "Draw what Remold paired: a line from each element to its partner.",
  ],
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

async function resolve(name, dir) {
  const hasSupportedExtension = EXTENSIONS.some((extension) =>
    name.endsWith(extension),
  );
  for (const candidate of hasSupportedExtension
    ? [name]
    : EXTENSIONS.map((extension) => name + extension)) {
    try {
      return {
        name: candidate,
        code: await readFile(path.join(dir, candidate), "utf8"),
      };
    } catch {
      // Try the next extension.
    }
  }
  return null;
}

// Either quote style: the demos use double quotes, generated files may not.
const localImports = (code) =>
  [...code.matchAll(/(?:from|import)\s+(["'])\.\/([^"']+)\1/g)].map(
    (m) => m[2],
  );
/** Packages the project already has, so they aren't listed as dependencies. */
const PROVIDED = new Set(["react", "react-dom", "next"]);
/** Every bare import, as a package name (`@scope/name` or `name`): engine packages, icons and the rest. */
const packageImports = (code) =>
  [...code.matchAll(/(?:from|import)\s+(["'])([^."'][^"']*)\1/g)]
    .map((m) => {
      const parts = m[2].split("/");
      return m[2].startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    })
    .filter((name) => !PROVIDED.has(name));

function summariseSource(file) {
  if (file.code.length <= LARGEST_SOURCE_FILE) return file.code;
  const head = file.code.split("\n").slice(0, 3).join("\n").slice(0, 600);
  const size = Math.round(file.code.length / 1024);
  return `${head}\n// … ${size} KB of generated data, left out here. See the comment above for how it's made.\n`;
}

/** A small first-use example for the docs. The full component source stays in its own tab below. */
function usageExample(entry, file) {
  const exported = [...file.code.matchAll(/export\s+(?:function|const|class)\s+([A-Z]\w*)/g)]
    .map((match) => match[1])
    .find(Boolean);
  const hook = [...file.code.matchAll(/export\s+(?:function|const)\s+(use[A-Z]\w*)/g)]
    .map((match) => match[1])
    .find(Boolean);
  const stem = path.basename(entry).replace(/\.[^.]+$/, "");
  const props = /\bplaying\??:\s*boolean/.test(file.code) ? " playing={false}" : "";
  const usage = {
    name: "usage.tsx",
    code: exported
      ? `import { ${exported} } from "./${stem}";\n\nexport function Example() {\n  return <${exported}${props} />;\n}\n`
      : `import { ${hook ?? "useComponent"} } from "./${stem}";\n\nexport function Example() {\n  const { overlay } = ${hook ?? "useComponent"}();\n\n  return <div>{overlay}</div>;\n}\n`,
  };
  return {
    ...usage,
    lang: "tsx",
    packages: [],
  };
}

function withFallbacks(css) {
  return css.replace(/var\(--color-fd-([a-z-]+)\)/g, (whole, name) =>
    FALLBACKS[name] ? `var(--color-fd-${name}, ${FALLBACKS[name]})` : whole,
  );
}

async function collect(entry, dir = demos) {
  const files = [];
  const sourceFiles = [];
  const dependencies = new Set();
  const seen = new Set();
  const visit = async (name) => {
    const file = await resolve(name, dir);
    if (!file || seen.has(file.name)) return;
    seen.add(file.name);
    for (const dep of packageImports(file.code)) dependencies.add(dep);
    const css = file.name.endsWith(".css");
    sourceFiles.push({
      name: file.name,
      code: summariseSource(file),
      lang: path.extname(file.name).slice(1),
      packages: packageImports(file.code),
    });
    files.push({
      path: `${TARGET}/${file.name}`,
      content: css ? withFallbacks(file.code) : file.code,
      type: css ? "registry:file" : "registry:component",
      target: `${TARGET}/${file.name}`,
    });
    for (const dep of localImports(file.code)) await visit(dep);
  };
  await visit(entry);
  if (files.length === 0)
    throw new Error(`build-registry: no demo file for "${entry}"`);
  return {
    files,
    dependencies: [...dependencies].sort(),
    sourceFiles,
    usage: usageExample(entry, sourceFiles[0]),
  };
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const index = [];
const demoSources = {};
for (const [name, title, description, folder] of ITEMS) {
  const { files, dependencies, sourceFiles, usage } = await collect(
    name,
    folder ? path.join(app, "components", folder) : demos,
  );
  demoSources[name] = { usage, files: sourceFiles };
  const item = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:block",
    title,
    description,
    dependencies,
    files,
  };
  await writeFile(
    path.join(out, `${name}.json`),
    `${JSON.stringify(item, null, 2)}\n`,
  );
  index.push({
    name,
    type: item.type,
    title,
    description,
    dependencies,
    files: files.map(({ path: p, type, target }) => ({
      path: p,
      type,
      target,
    })),
  });
}

await mkdir(path.dirname(sourceModule), { recursive: true });
await writeFile(
  sourceModule,
  `// Generated by scripts/build-registry.mjs. Do not edit.\nexport const demoSources = ${JSON.stringify(
    demoSources,
  )} as const;\n`,
);

await writeFile(
  path.join(out, "registry.json"),
  `${JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "remold",
      homepage: "/",
      items: index,
    },
    null,
    2,
  )}\n`,
);
console.log(`registry: ${ITEMS.length} items in public/r`);
