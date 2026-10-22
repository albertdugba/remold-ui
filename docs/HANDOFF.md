# Handoff: how Remold got here

A summary of the long design and research conversation that produced this repo, so any future session (or contributor) has the context.

## The thesis

Remold works out **what became what** when an interface changes, with no ids, keys or names, then animates, describes and checks the change.

**Positioning:**
- Motion's `layout`/`layoutId`, React's `<ViewTransition>`, GSAP Flip and SwiftUI's `matchedGeometryEffect` all need you to mark elements first. Remold infers the marks.
- The test for any feature: *could this code have been written in advance?* If yes (for example a hover effect or a scroll animation), it belongs in Motion or GSAP, not here.
- Target cases: UI an AI rewrites, HTML swapped in from a server, diagrams compiled from text, canvas apps that redraw everything, design-tool exports.

## How the matcher works (prototype in `prototypes/engine-v0/correspond.ts`)

1. **Extract nodes** from the DOM. Each node records:
   - text tokens;
   - kind (text, media, control, surface);
   - a media hash;
   - geometry (normalised position and size);
   - paint (colour and background);
   - tree position.
2. **Score similarity** for every old/new pair:
   - text: token Jaccard plus character-bigram Dice, with stopwords removed and bigrams scaled by length;
   - kind gating;
   - geometry and paint as tie-breakers.
3. **Hungarian assignment** for the best total pairing.
4. **Structure pass:**
   - Parents are matched by votes from descendants that carry content (text or media only, to avoid self-reinforcing votes).
   - Ambiguous duplicates (three "Get" buttons) are resolved by anchors: unique high-confidence pairs in the same container.
   - Sibling anchors must share a parent and be row- or column-aligned.
5. **Split and merge detection.**

**Results:**
- On a held-out benchmark, the matcher scored **F1 95.3%** against 84.4% for the best baseline (tree position or exact text).
- Stable diagram layout (ELK with interactive strategies seeded with previous positions, plus rigid alignment) moved boxes about **5px on average**, against 34px for a fresh layout.
- Canvas semantics recovered 12 chart values to within $0.1k by wrapping the 2D context and fitting gridlines.
- SVG review named 17 correct changes, against 24 lines from a text diff.
- Two frames of an illustration became a validated multi-layer Lottie file.

The demo page's matcher (`prototypes/remold-motion.html`) is a simplified version that adds:
- a greedy pairing with two passes of context bonus;
- placeholder swaps, where skeleton bars become content in reading order;
- faded shells for surfaces that lose their counterpart.

## Motion model (Apple-style)

**Springs:**
- Described as `{ duration, bounce }`.
- Stiffness = (2π / duration)².
- Damping = 4π(1 − bounce) / duration when bounce ≥ 0, and 4π / (duration(1 + bounce)) when bounce < 0. Mass is 1.
- Integrated with semi-implicit Euler at fixed 1/240-second substeps.

**Rules from WWDC18 *Designing Fluid Interfaces* and WWDC23 *Animate with springs*:**
- Respond on pointer-down (a 0.97 press scale).
- Always interruptible: start from the live value and keep its velocity.
- Hand a gesture's release velocity to the spring.
- Momentum projection: `(v/1000) · d/(1−d)`, with d = 0.998, or 0.99 for snapping.
- Rubber-banding: `(o·dim·0.55)/(dim + 0.55·|o|)`.
- Independent springs for each axis.
- Spatial consistency: grow from what was tapped, and return there.
- 10px hysteresis before a drag starts.

**DOM transition technique (in the demo page):**
- Snapshot visual rectangles plus live spring state.
- Swap the DOM, match old to new, and give each matched element springs in visual space (x, y, w, h, radius; text gets x, y and a uniform scale).
- Each frame, convert the visual box into a transform relative to the nearest animated ancestor, so nested scales are corrected.
- Elements that arrive inside an animated parent ride along, counter-scaled, and fade in.
- Leaving elements are cloned into an overlay underneath and fade out.

## Demo page sections (`prototypes/remold-motion.html`)

1. **Hero:** the headline morphs letter by letter.
2. **Grow from what you tapped:** App Store-style cards in a phone frame, with drag-to-dismiss.
3. **Markup rewritten from scratch:** list, by person, board and an AI rewrite of the same tasks.
4. **An assistant that changes its mind:**
   - morphing status icon and text;
   - skeleton to answer;
   - a voice orb with its full lifecycle (idle, connecting, listening, hearing, thinking, speaking, interrupted, muted, error), mute, a blocked microphone and dropped-connection simulation.
5. **Tool calls that become results:** flights and weather, a failure and retry, a price drop, and booking.
6. **Citations that fly home:** source cards fold into pills, and pills grow into previews.
7. **Illustrations that are alive:** an isometric canvas engine with four scenes (architecture, integrations, database, edge network) and layouts for each.
8. **Not just diagrams:** a globe that unrolls into a map, wallet cards (stack, fan, cover flow), voxels that rebuild between shapes, and a phone screen that explodes into layers.
9. **Spring lab:** a smart detent slider compared with a typical web snap.
10. **Apple's rules as defaults** (a table).

**Design decisions:**
- Each section has its own card and "world": a phone, a window or an instrument panel.
- Typefaces: Bricolage Grotesque for display, Geist for body text, Geist Mono for code.
- Light and dark themes, built with tokens.

## Planned canvas API (`@remold-ui/canvas`)

There are three layers:
1. **`core` primitives:** `spring`, `value()` (with `to`, `hold`, `set`, `release`), `project`, `rubberband`, and `match(a, b, { by: "nearest" })`, which returns `{ pairs, leaving, arriving }`.
2. **`scene(canvas, { camera, objects, links, layouts, interact, describe })`:**
   - built-in looks: plate, glass, wire, chip, cylinder, tower, grid, points;
   - `defineObject({ props, draw, hit })`, where every prop springs;
   - `s.points(name, data, { match, project: { globe, map } })` for keyless data morphs;
   - gestures that bind to values, such as momentum, snap and tilt.
3. **Framework adapters:** for example `<Remold.Scene layout=… />`.

## Product and money plan (not started; validate first)

**Open-core:**
- The library stays MIT.
- A paid **Remold Studio** would be an AI tool that writes *scene data*. The engine renders it, which guarantees motion, accessibility and quality.

**Inputs:** a prompt, Mermaid, a README or API spec, a CSV, a screenshot, or two SVG frames.

**Output:** editable live scenes with layouts, exported as:
- a React or Vue component (which uses the library);
- SVG;
- MP4 or GIF;
- Lottie;
- an embed.

**Pricing to test:**
- Free, with a watermark.
- Pro, around £15–20 a month.
- Team.
- API pay-per-use.
- Template packs.

**Order:**
1. Ship the library v0.1 with the demo page.
2. Add a waitlist to the landing page.
3. Publish a template gallery.
4. Build the Studio beta.

## Things deliberately left out

- A general tween or timeline library.
- Styled components.
- Real brand logos.
- Native-feeling mobile components (gesture sheets and similar). That's a possible sibling library sharing the physics core.
