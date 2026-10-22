# Learning Remold from scratch

You own this project, so the goal is not just "it works". The goal is that you can explain every line, and fix it when a stranger opens an issue at 2am.

## How every lesson works

The full, interactive method is in `docs/TEACHING.md`, and each lesson has a step-by-step script in `docs/lessons/`. In short:

1. **The idea in kid words.** One small idea at a time, with a picture or a story.
2. **You write the code** in the real package, not a sandbox.
3. **Tests check it.** Each lesson comes with Vitest tests that go green when you're right.
4. **You see it.** Most lessons end with something you can look at or play with.
5. **Tell me.** Paste what happened (or the error). We fix it together, then move on.

Some lessons are **🐛 bug hunts**: I give you code that works *almost*, plus a user's bug report. You find and fix it. That is the real job of a maintainer.

Go slowly. A lesson can take a day. It is fine to do a lesson twice.

---

## Part 0 · The big picture

You already know JavaScript and React, so there's no programming basics here. Part 0 is one lesson: how the whole engine thinks, told as a story, so every later lesson has a place to fit.

Maths is taught *inside* the lessons, at the moment you need it (points and arrows in Part 1, sine and cosine in Part 2, scoring in Part 3), always with a picture first.

## Part 1 · Shapes (`@remold-ui/core`)

| # | Lesson | In kid words | You'll build | Where |
|---|---|---|---|---|
| 1.1 | In-between | Halfway between 0 and 10 is 5. That's all animation is. | `lerp`, `lerpPoint` (review) | `core/src/lerp.ts` ✅ |
| 1.2 | How a computer writes a shape | SVG paths are instructions for a pen: move, line, curve. | Parse `M L H V Z` | `core/src/path/parse.ts` ✅ |
| 1.3 | Curves | Every curve can be written the same way (cubic Bézier). | Parse `C S Q T A`, convert to cubics | `core/src/path/normalize.ts` ✅ built |
| 1.4 | Cutting curves | Snip a curve in two without changing its shape. | De Casteljau splitting | `core/src/path/subdivide.ts` ✅ built |
| 1.5 | Which piece goes with which | Two drawings: pair their parts, line up where they start. | Sub-path pairing and alignment | `core/src/morph/match.ts` ✅ built |
| 1.6 | Fast in-betweens | Pack thousands of numbers tightly so the computer flies. | `Float32Array` morphing | `core/src/morph/morph.ts` ✅ built |
| 1.7 | On screen | Turn numbers back into pictures. | SVG `d` strings and canvas `Path2D` | `core/src/render/*` ✅ built |
| 🐛 | Bug hunt | "My heart icon morphs inside out." | Fix a direction bug | |

## Part 2 · Motion physics

| # | Lesson | In kid words | You'll build |
|---|---|---|---|
| 2.1 | Time | The screen redraws about 60 times a second. Each time, we take a tiny step. | An animation loop with real time ✅ built |
| 2.2 | A spring | A spring pulls toward home and slows itself down. One tiny step at a time. | `stepSpring` ✅ built |
| 2.3 | Speaking Apple | "Half a second, a little bounce" becomes stiffness and damping. | `springCoefficients({ duration, bounce })`, presets ✅ built |
| 2.4 | Never jump | Catch something mid-flight and keep its speed. | `value()` with `to`, `hold`, `release` ✅ built |
| 2.5 | Your finger | Measure how fast a finger moves; guess where a flick would land; resist at the edges. | `velocityTracker`, `project`, `rubberband` ✅ built |
| 🐛 | Bug hunt | "The sheet jumps when I grab it twice." | Fix a velocity hand-off bug |

## Part 3 · What became what (matching)

| # | Lesson | In kid words | You'll build |
|---|---|---|---|
| 3.1 | Things as numbers | Describe each box on the page: its words, size, place and colour. | Feature extraction ✅ built |
| 3.2 | How alike? | "Fix login timeout" and "Login timeout fix" are nearly the same words. | Text and shape similarity ✅ built |
| 3.3 | Best pairing | Pair everyone with their best partner without anyone sharing. | The Hungarian algorithm ✅ built |
| 3.4 | Using the family | Three buttons all say "Get"; the card they're in decides which is which. | Anchors and context ✅ built |
| 3.5 | Splitting and merging | One thing becoming two, or two becoming one. | Split and merge detection ✅ built |
| 3.6 | Keeping score | How do we know matching got better? Measure it. | The benchmark ✅ built |
| 🐛 | Bug hunt | "Two rows swapped places when I sorted." | Fix a tie-breaking bug |

## Part 4 · The page (`@remold-ui/dom`)

| # | Lesson | In kid words | You'll build |
|---|---|---|---|
| 4.1 | Measuring | Ask the browser where every box is. | `measure`, relative boxes ✅ built |
| 4.2 | FLIP | Remember where it was, let it move, pretend it didn't, then glide. | A FLIP transition ✅ built |
| 4.3 | Boxes inside boxes | When a parent grows, its children must not stretch. | Nested transform correction ✅ built |
| 4.4 | View transitions | The browser's own built-in way to animate a change. | Auto view transitions ✅ built |
| 4.5 | Letters that stay | Only the letters that changed should move. | Text morph ✅ built |
| 4.6 | Everyone can use it | Screen readers, keyboards, and people who get dizzy from motion. | Reduced motion, announcements, focus ✅ built |

## Part 5 · Canvas scenes (`@remold-ui/canvas`)

| # | Lesson | In kid words | You'll build |
|---|---|---|---|
| 5.1 | Sharp drawings | Phones have tiny pixels; draw at their size. | A crisp canvas helper ✅ built |
| 5.2 | Moving the paper | Transforms slide, turn and stretch everything you draw. | Transform helpers ✅ built |
| 5.3 | The 3D-ish camera | Tilt a flat world so it looks like a toy on a table. | The isometric camera ✅ built |
| 5.4 | What's in front | Draw far things first. Find what's under the pointer. | Drawing order, hit testing ✅ built |
| 5.5 | Looks | Plates, glass, chips, cylinders, towers. | Built-in looks ✅ built |
| 5.6 | Clouds of dots | Thousands of points that know where they're going. | `points()` and `match()` ✅ built |
| 5.7 | Scenes you can touch | Hover, tap, drag, fling. | Scene gestures ✅ built |
| 🐛 | Bug hunt | "My scene is blurry on iPhone." | Fix a pixel-ratio bug |

## Part 6 · Everyone can install it

| # | Lesson | You'll build |
|---|---|---|
| 6.1 | React adapter | `<Remold.Root>`, `useRemold`, `Text`, `Scene`, `Ignore` ✅ built |
| 6.2 | Vue adapter | `v-remold` directives |
| 6.3 | Angular adapter | Standalone directives with ng-packagr |
| 6.4 | Publishing | Versions, changelogs, `npm publish` |
| 6.5 | Docs people love | API pages, live examples, the demo site |

## Part 7 · Being the maintainer

| # | Lesson | You'll practise |
|---|---|---|
| 7.1 | Reproducing a bug | Turn a vague issue into a tiny example that fails |
| 7.2 | Debugging | Breakpoints, logging, slowing time down |
| 7.3 | Performance | Finding why a frame took too long |
| 7.4 | Reviewing code | Reading someone else's pull request kindly and carefully |
| 7.5 | Saying no | Keeping the library small and focused |

---

**Where you are:** Parts 1–5 and the React adapter (6.1) are built (lessons 1.3 onwards not yet walked through). Vue and Angular are on hold.
