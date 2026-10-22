# Remold roadmap

**Remold works out what became what when an interface changes, then animates, describes and checks the change.**
It needs no ids, keys or hand-written names, so it works where `layoutId`, `<ViewTransition>` and keyed lists can't: UI an AI rewrites, HTML swapped in from a server, diagrams compiled from text, charts drawn on canvas, and shapes from design tools.

Principles:
- **Correspondence first.** Every feature starts from "this old thing became that new thing". General tweening, timelines and scroll effects are left to Motion and GSAP; Remold can drive them.
- **Headless and layered.** `core` is pure math on plain data. `dom` reads the screen and plays motion. Framework packages are thin.
- **One styling contract.** Every adapter emits the same data attributes and CSS variables, so one stylesheet works in React, Vue and Angular.
- **Motion that keeps its meaning.** Every transition has a reduced-motion version that still shows what changed.

---

## v0.1: the first release

### `@remold-ui/core` (pure TypeScript, no DOM)
- **Shapes:** read SVG path data and basic shapes; convert everything to cubic curves; split curves; bounds.
- **Morphing:** pair sub-shapes, align direction and start point, equalise point counts, interpolate packed `Float32Array`s.
- **Matching:** describe elements as features (text, kind, media, position, size, colour, tree) and solve the best pairing (Hungarian), including splits and merges.
- **Physics:** springs that hand over the release velocity of a gesture and can be reversed mid-flight.
- **Choreography:** automatic ordering and staggering. Leavers go first, then movers, then arrivals, in reading order.
- **Quality:** score a morph for travel, pinching, self-crossing and stray dots, and pick the best of several strategies.

### `@remold-ui/dom`
- **Read the screen:** extract features from elements and SVG.
- **Auto view transitions:** name matched pairs and run `document.startViewTransition`, with a FLIP fallback.
- **List motion:** inserts, removals and reorders glide into place even when the list was fully re-rendered.
- **Change marks:** `data-rm-changed`, `data-rm-entering`, `data-rm-exiting` and CSS variables such as `--rm-progress`.
- **Reduced motion:** crossfade in place and highlight what changed.
- **Debug overlay:** show what was matched with what, and why.

### Adapters
- `@remold-ui/react`: `<Remold.Root>`, `Pin`, `Ignore`, `useRemold()`.
- `@remold-ui/vue`: `v-remold-root`, `v-remold-pin`.
- `@remold-ui/angular`: standalone directives built with ng-packagr.

---

## v0.2: next

- **Text morph:** any text changes character by character; unchanged characters stay still ("Save" → "Saving…" → "Saved").
- **Container transform:** a card grows into a page, or a button into a panel, with corner radius and content crossfade.
- **Destination motion:** removed items fly to a target such as the bin; added items fly to the cart.
- **Arc paths:** elements travel along computed curves instead of straight lines.
- **Gesture-scrubbed transitions:** drag a finger to move through any transition, and release with the right velocity.
- **Semantic diff:** a list of named changes (moved, resized, recoloured, text edited, added, removed, split, merged) for pages and SVG files.
- **Exports:** the same transition as CSS, WAAPI, Lottie or a GSAP timeline.

---

## Explorations: less common or unsolved

These are the areas few or no libraries handle. Each builds on the v0.1 core.

| Idea | What it does | Why it's hard or rare | Builds on |
|---|---|---|---|
| **Stable diagrams** | Mermaid-style diagrams keep existing boxes in place across edits; arrows morph between routes | Layout engines start from scratch on every render | Matching, morphing, a layout engine (ELK) |
| **Canvas semantics** | An unmodified canvas chart gets selectable text, find in page, screen-reader access and semantic tests | Canvas is pixels to the browser | Recording drawing calls, matching |
| **Skeleton-to-content** | Loading placeholders morph into the content that replaces them | Normally content just pops in and the layout jumps | Matching by geometry |
| **Multi-page view transitions** | Shared elements across full page loads on traditional sites | Matching must happen across a page unload | Serialised features, `pageswap` and `pagereveal` |
| **History scrubbing** | Drag through the versions of a document or dashboard and watch it change continuously | Every pair of versions needs matching | Matching, interruptible motion |
| **Remote-change awareness** | Edits by collaborators or AI agents animate in and are marked | Changes arrive without identity | Matching, change marks |
| **Two frames to animation** | Two static illustration exports become one animation, exported to Lottie | Animators keyframe this by hand today | Shape matching, per-part morphing |
| **Icon repair** | Icons from mixed sources are fixed to one house style | SVGO shrinks files but doesn't enforce style | Shape parsing and geometry |
| **Illustration recolour** | Dark-mode and rebrand versions of illustrations that keep contrast and depth | Teams redraw or use a CSS invert filter | Colour science, constraints |
| **Responsive diagrams** | Diagrams re-lay themselves out for narrow screens while keeping the reader's mental map | SVG only scales uniformly | Layout, matching |
| **Chart-type transitions** | Bar to line, grouped to stacked, table to chart, with marks matched by data | Each pair is hand-coded today | Matching, morphing |
| **Agent tools** | An MCP server so AI agents can ask "what changed" and request transitions | New | The whole core |

---

## Out of scope

- A general animation library (tweens, timelines, scroll-linked effects): use Motion or GSAP.
- Styled components: Remold stays headless, like Base UI.
- Native mobile-feel components (gesture sheets, keyboard-aware composers, photo viewers): a possible sibling library that shares the physics core.

---

## How the lessons map to the roadmap

See LEARNING.md for the full course.

| Part | Delivers |
|---|---|
| 0 | Programming foundations (no library code) |
| 1 | Core shapes and morphing |
| 2 | Springs, velocity hand-off, gestures |
| 3 | Matching: what became what |
| 4 | DOM transitions, text morph, accessibility |
| 5 | Canvas scenes |
| 6 | Adapters, publishing, docs: v0.1 |
| 7 | Maintainer skills |
