# Remold: the whole picture

Everything we're building, why, and what exists so far. For the story of *how* decisions were made, see `docs/HANDOFF.md`. For the course, see `LEARNING.md`.

---

## 1. What Remold is

**One sentence:** Remold works out *what became what* when an interface changes, without ids, keys or names, then animates, describes and checks the change with Apple-quality motion.

**The problem.** Every animation library today needs you to say in advance which old thing is which new thing:
- Motion's `layoutId`;
- React's `<ViewTransition name>`;
- GSAP Flip's data attributes;
- SwiftUI's `matchedGeometryEffect`;
- keyed lists.

That breaks whenever nobody could have written those names in advance:
- UI that an **AI rewrites**;
- HTML **swapped in from a server** (htmx, Turbo, server components);
- diagrams **compiled from text** (Mermaid);
- **canvas** apps that redraw everything every frame;
- **design-tool exports** (two SVG frames from Figma);
- **collaborators** editing the same document.

**The answer.** Look at the "before" and the "after", describe every piece as numbers, score how alike every pair is, pick the best partners, then move each pair with springs that can be interrupted at any moment.

**The feature test.** Could this code have been written in advance? If yes (hover effects, scroll animations, timelines), Motion or GSAP already does it, so we don't. If no, it's ours.

**Positioning.** Remold decides *what* to animate. It continues where Motion's `layout` and GSAP Flip stop, and it can drive them.

---

## 2. Architecture

```
@remold-ui/core      pure TypeScript maths. No DOM. Runs anywhere (browser, Node, workers).
                       shapes · morphing · springs · gestures · matching · choreography · quality
@remold-ui/dom       reads the page, plays motion: auto view transitions, FLIP, list motion,
                       text morph, change marks, reduced motion, debug overlay
@remold-ui/canvas    (planned) live scenes: camera, looks, points, gestures, hit testing
@remold-ui/react     thin adapter: <Remold.Root>, Pin, Ignore, useRemold(), <Scene>
@remold-ui/vue       thin adapter: directives
@remold-ui/angular   thin adapter: standalone directives (ng-packagr)
```

**Patterns borrowed:**
- **React Aria:** the logic (`core`) is separate from the DOM layer.
- **Base UI:** compound parts, `data-rm-*` attributes and `--rm-*` CSS variables as one styling contract for every framework, controlled and uncontrolled props, a `render` prop.
- **Zag.js and TanStack:** one core shared by many frameworks.

**The repo** (`/Users/albertdugba/Desktop/opensource/remold`):
- Turborepo 2.11.7 and pnpm 10.34.6.
- TypeScript 5.9.3 (not 7: tsup doesn't support the native compiler), tsup 8.5.1, Vitest 5.0.3, Vite 8 in `apps/playground`, Node 24.
- tsconfig is strict, with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`. The license is MIT.

**What exists in `packages/` today:**
- `core/src/lerp.ts`: `lerp`, `lerpPoint`, `Point` (lesson 1.1, done, with tests).
- `core/src/path/parse.ts`: `tokenize` and `parsePath` for `M L H V Z C S Q T A` (lessons 1.2 and 1.3).
- `core/src/path/normalize.ts`: lines, quadratics and arcs to cubics, `toCubics` → subpaths (lesson 1.3).
- `core/src/path/subdivide.ts`: `splitCubic` (de Casteljau) and `subdivide` to equalise segment counts (lesson 1.4).
- `core/src/path/measure.ts`: winding (`signedArea`), `centroid`, `bounds`.
- `core/src/morph/match.ts`: `matchShapes` pairs subpaths, orients, equalises counts and rotates start points (lesson 1.5).
- `core/src/morph/morph.ts`: `createMorph(a, b)` with packed `Float32Array`s (lesson 1.6).
- `core/src/render/`: `toPathData` (SVG) and `drawPath` (canvas `PathSink`) (lesson 1.7).
- `core/src/motion/`: springs from `{ duration, bounce }`, `value()` (interruptible, velocity hand-off), `velocityTracker`, `project`, `rubberband` (lessons 2.2–2.5).
- `dom/src/frames.ts`: the shared frame loop `frames()`, `createFrameLoop`, `prefersReducedMotion` (lesson 2.1).
- `core/src/match/`: keyless matching. `matchNodes` (feature sheets → pairs, splits, merges, removed, added), `textSimilarity`, `hungarian`/`assign`, and a benchmark with five scenarios and two baselines (lessons 3.1–3.6).
- `dom/src/rect.ts`: `measure`, `relativeBox`, `Box`, with tests.
- `dom/src/extract.ts`, `transition.ts`, `view-transition.ts`, `text-morph.ts`, `a11y.ts`: reading the page, keyless spring transitions (interruptible, nested correction, exits, reduced motion, announcements, focus), keyless View Transitions, text morph (lessons 4.1–4.6). Verified in real headless Chrome.
- `canvas` (new): `scene()` with layouts, looks, links, hover, focus, drag-to-turn, keyboard and point clouds; `iso`/`flat`/`fitCamera`; geometry; `fitCanvas` (Part 5). Verified in headless Chrome.
- `core/src/match/points.ts`: `matchPoints` (keyless point clouds). `core/src/motion/css.ts`: `springToCss`.
- `react`: `Remold.Root` (declarative trigger), `useRemold` (imperative), `Remold.Text`, `Remold.Scene`, `Remold.Ignore`, a Base UI-style `render` prop (lesson 6.1). Verified in Chrome with React's development build.
- `vue`: `vRemold` (an `ObjectDirective`), `isTracked`.
- `angular`: re-exports `measure`.
- `apps/react-playground`: the premium, Apple-like demo and docs page, built only on the public packages: a dot-field hero, music player, AI writing editor, live dashboard, commerce checkout, and SVG/canvas illustrations.
- `apps/playground`: a Vite page with "Markup rewritten from scratch" (four keyless views, View Transitions toggle, reduced motion, morphing status label), "React" (the adapter in use), "Illustrations that are alive" (canvas scenes and voxels), a `lerpPoint` slider, a shape-morph demo (pick two shapes, scrub, show points, play with a spring), a spring lab, a throw-and-snap demo, and "What became what" (the matcher on the benchmark scenarios, coloured by match).

---

## 3. The engine in four steps

1. **Things into numbers.**
   - Shapes become lists of points: parse SVG, convert to cubic curves, split curves.
   - Page elements become feature sheets: text tokens, kind (text, media, control, surface), media hash, position and size, paint, tree position.
2. **Score every pair.**
   - Text similarity: token Jaccard plus character-bigram Dice, with stopwords removed.
   - Kind gating.
   - Geometry and paint as tie-breakers.
3. **Pick partners fairly.**
   - The Hungarian algorithm finds the best total pairing.
   - A structure pass matches parents by votes from descendants that carry content.
   - Anchors resolve duplicates: three "Get" buttons are told apart by the card they sit in.
   - Splits and merges are detected.
   - Leftover old pieces are leaving; leftover new pieces are arriving.
4. **Move like real things.**
   - Springs set by `{ duration, bounce }`.
   - Interruptible: always start from the live value and keep its velocity.
   - Gestures hand over their release velocity.
   - Momentum projection and rubber-banding.
   - Independent axes.
   - A reduced-motion version that still shows what changed.

---

## 4. Motion rules (Apple)

| Rule | Detail |
|---|---|
| Springs set by feel | stiffness = (2π/duration)². Damping = 4π(1−bounce)/duration when bounce ≥ 0, else 4π/(duration·(1+bounce)). Mass is 1. Presets: smooth (bounce 0), snappy (0.15), bouncy (0.3), all with duration 0.5. |
| Always interruptible | A new change starts from where things are on screen now, keeping their speed. |
| Velocity hand-off | A finger's release speed becomes the spring's starting speed. |
| Momentum projection | `current + (v/1000)·d/(1−d)`, with d = 0.998 for scrolling and 0.99 for snapping. |
| Rubber-banding | `(o·dim·0.55)/(dim + 0.55·|o|)` |
| Instant response | A 0.97 press scale on pointer-down. A drag starts only after 10px. |
| Spatial consistency | Grow from what was tapped, and return there. |
| Completion | Finish at perceptual completion, not when the maths says it's fully still. |

Sources: WWDC18 *Designing Fluid Interfaces* and WWDC23 *Animate with springs*.

---

## 5. What we've achieved so far

### Research prototype (code in `prototypes/engine-v0/`)

**Keyless DOM matcher.** On held-out pages it reached **95.3% F1**, against **84.4%** for the best baseline (tree position or exact text). It includes the ablations, the Hungarian algorithm, anchors, splits and merges.

**Explorations that worked:**

| Exploration | Result |
|---|---|
| Auto view transitions | Name the matched pairs and run `document.startViewTransition`, with a FLIP fallback |
| Stable diagrams | ELK with interactive strategies seeded with the previous positions: boxes move **5px** on average, against 34px for a fresh layout. Arrows morph between routes. |
| Canvas semantics | Wrap the 2D context, record drawing calls, read charts back from gridlines: 12 values recovered to within $0.1k. Makes canvas readable by screen readers and searchable. |
| SVG semantic diff | 17 correct named changes, against 24 lines from a text diff |
| Two frames to animation | Pairs the parts of two illustration frames and exports a multi-layer Lottie with animated colours (validated in lottie-web) |
| Glyph outlines | Text turned into shapes at build time with opentype.js. Used for deform effects, word-to-logo morphs and staged timing. |
| Liquid split and merge | Metaball bridges, springs with velocity, squash and stretch that keeps the area |

### The demo page (`prototypes/remold-motion.html`)

Every section is interactive and works in light and dark mode, on phones, and with reduced motion. **Slow motion** and **Show matches** switches apply across the whole page.

| Section | What it shows |
|---|---|
| Hero | The headline morphs letter by letter between phrases |
| Grow from what you tapped | App Store-style cards in a phone. Tap to grow, × to reverse mid-flight, drag down to dismiss with velocity. The grid and detail are separate templates with no shared keys. |
| Markup rewritten from scratch | One set of tasks as a list, by person, a board, and an AI rewrite with reworded titles. Every view is fully new HTML. |
| An assistant that changes its mind | Status icon morph (strokes paired automatically), status text morph, skeleton to answer and back, rewrites as shorter or as a table, a large icon strip. A voice orb with its full lifecycle (idle, connecting, listening, hearing you, thinking, speaking, interrupted, muted, error), simulated mute, blocked microphone and dropped connection, a live transcript that corrects itself, spoken captions, and cutting in. |
| Tool calls that become results | Flight and forecast tools calling, a failure and retry, the call card growing into its result, a price drop with the old fare struck, booking into a confirmation |
| Citations that fly home | Source cards fold into inline pills, and pills grow into previews |
| Illustrations that are alive | An isometric canvas engine with four scenes: architecture (stacked, exploded, diagram), integrations (ring, orbit, grid), database (single, sharded, replicated), edge network (one region, edge, live load as a 3D bar chart). Hover lift, click focus, drag and fling to turn, scene crossfades, responsive diagrams. |
| Not just diagrams | A dotted globe that unrolls into a flat map or focuses on London, wallet cards in perspective (stack, fan, cover flow with flick, tilt and glare, flip), voxels rebuilding between heart, star, check, cloud and a bar chart with nearest-spot matching, and an app screen exploding into five labelled layers |
| Springs you can feel | A duration and bounce lab with a plot, and a projection-and-rubber-band slider compared with a typical web snap |
| Apple's rules as defaults | A table mapping each rule to where it lives in the library |

**Published pages (private links in Albert's claude.ai account):**
- Remold Motion (the main demo): `https://claude.ai/artifact/3Utn4Q7rbHAhCREjtadW8A`
- Earlier Remold landing page: `https://claude.ai/artifact/PToB4AyaAGCuaaT7UrCLqr`
- Engine lab: `https://claude.ai/artifact/WErS3Mvm5ALgXD56MZwdZ5`
- Wordmark morphs: `https://claude.ai/artifact/MvVBgJSuiVDVWFgN6dgsQe`
- Wordmark morph tester: `https://claude.ai/artifact/BuMhhiApqMskHWLb9m75R7`
- Liquid split and merge: `https://claude.ai/artifact/CL9ViBY4vLeBG7z4PxkSBD`

---

## 6. What we will build

### v0.1: the first release

**`core`:**
- **Shapes:** parse SVG paths and basic shapes, convert to cubics, split curves, bounds.
- **Morphing:** pair sub-shapes, align direction and start, equalise point counts, interpolate packed `Float32Array`s.
- **Matching:** features, the Hungarian algorithm, structure, splits and merges.
- **Physics:** `spring`, `value()` (`to`, `hold`, `set`, `release`), `project`, `rubberband`, velocity tracking.
- **Choreography:** leavers first, then movers, then arrivers, in reading order.
- **Quality:** scoring morphs for travel, pinching and self-crossing, and choosing the best strategy.

**`dom`:**
- Auto view transitions with a FLIP fallback.
- Nested-transform correction.
- List motion and text morph.
- Change marks (`data-rm-changed`, `data-rm-entering`, `data-rm-exiting`, `--rm-progress`).
- Reduced motion and announcements.
- A debug overlay.

**Adapters:** React, Vue and Angular.

### v0.2

- Container transform.
- Destination motion: removed items fly to the bin, added items fly to the cart.
- Arc paths.
- Gesture-scrubbed transitions.
- Semantic diff.
- Exports: CSS, WAAPI, Lottie, a GSAP timeline.

### `@remold-ui/canvas` (after v0.1)

```ts
const s = scene(canvas, {
  camera: iso({ yaw: 45, pitch: 60 }),
  objects: { core: look.plate({ style: "solid", label: "core" }), react: look.chip({ label: "react" }) },
  links: [link("react", "core", { flow: true })],
  layouts: { stacked: { /* … */ }, diagram: { camera: flat({ fit: true }) /* … */ } },
  interact: { hover: "lift", tap: "focus", drag: "turn" },
  describe: { stacked: "…" },
});
s.to("diagram");
s.points("cubes", nextShape, { match: "nearest" });           // keyless data morph
defineObject({ props: { x: 0, ry: 0 }, draw(ctx, p, api) {}, hit() {} });  // custom looks
```

### Explorations (later, less common or unsolved)

- Stable diagrams.
- Canvas semantics.
- Skeleton to content.
- Multi-page view transitions.
- History scrubbing.
- Remote-change awareness.
- Two frames to animation.
- Icon repair.
- Illustration recolour.
- Responsive diagrams.
- Chart-type transitions.
- Agent tools (an MCP server).
- Canvas apps that animate without code changes (a sorting spreadsheet).
- Map clusters that split and merge.

### Product: Remold Studio (only after v0.1 has users)

An AI tool that writes **scene data**, which the open-source engine renders. The engine guarantees motion quality and accessibility.
- **Inputs:** a prompt, Mermaid, a README or API spec, a CSV, a screenshot, or two SVG frames.
- **Exports:** a React or Vue component, SVG, MP4 or GIF, Lottie, an embed.
- **Pricing to test:** free with a watermark, Pro around £15–20 a month, Team, API pay-per-use, template packs.
- **Order:** ship v0.1, add a waitlist to the landing page, publish a template gallery, then build the Studio beta.

---

## 7. Out of scope

- A general tween or timeline library (use Motion or GSAP).
- Styled components (Remold is headless).
- Reproducing real brand logos or artwork.
- Native-feeling mobile components (a possible sibling library sharing the physics core).

---

## 8. Next steps

1. **Learning:** lesson 1.2 (`parse.ts`), then 1.3 (curves). Follow `LEARNING.md` and `docs/TEACHING.md`.
2. **Library:** each lesson adds real, tested code to `packages/`. v0.1 is done at the end of Part 6.
3. **Launch:** the demo page becomes the docs site, plus a Studio waitlist form.
