# Remold

A morphing library in `packages/` and a docs site with copy-in components in `apps/docs`. Before finishing any change, run `pnpm lint && pnpm typecheck && pnpm test`.

## Animation conventions

Read this before adding or changing motion anywhere in the repo: the library in `packages/` and the demos in `apps/docs/components/`.

### Decide what moves

- **One change per component.** Name the single change that carries meaning (what the person acted on, or what changed identity) and animate that. Everything else stays still or gets a plain CSS transition. Don't wrap a whole panel in a morph when one element changes.
- **Pick the tool by the job.**
  - What became what (layout, structure, text, icons, paths): Remold. `Remold.Morph`, `Remold.Text`, `Remold.Icon`, `Remold.PathGroup`.
  - Springs, enter and exit, press feedback, one small shared element: Motion (`motion/react`).
  - Colour, shadow and opacity on hover or focus: a CSS transition.
  - A line joining two elements: `Remold.Connectors` with `Remold.Anchor`. Never a hand-drawn SVG path or a CSS span.
- **Keep structural morphs on `Remold.Morph`.** Don't rebuild them with Motion's `layoutId`: it only carries what is tagged, and text that changes size stretches.

### How it moves

- **Springs are `{ duration, bounce }`,** not stiffness and damping. In the packages, use the presets in `packages/core/src/motion/spring.ts` (`springs.smooth`, `springs.snappy`, `springs.bouncy`); `snappy` is the default. In a demo, declare one named constant at the top of the file and share it through `MotionConfig`:

  ```tsx
  const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.2 };

  <MotionConfig transition={SPRING} reducedMotion="user">
  ```

  Most demos sit between 0.35 and 0.5 seconds with a bounce of 0.1 to 0.2. Use `bounce: 0` for anything collapsing or leaving.
- **Stay interruptible.** A change someone can trigger again mid-flight runs on a spring or a CSS transition, never on keyframes.
- **Enter and exit** with opacity, a small scale and a short blur (`filter: "blur(4px)"` to `"blur(0px)"`). Give `AnimatePresence` `initial={false}` so nothing plays on first paint.
- **CSS transitions name their properties:** `transition-[background-color,box-shadow]`, never `transition-all`. Keep them between 150 and 300ms. Movement uses `cubic-bezier(0.32,0.72,0,1)`; the rest uses `ease-out`.
- **Press feedback** is `whileTap={{ scale: 0.97 }}`, or `active:scale-[0.97]` in CSS.

### Reduced motion and phones

- Every animation follows `prefers-reduced-motion`. Library code takes a `reducedMotion` option and resolves it with `resolveReducedMotion` (`packages/dom/src/accessibility.ts`). Demos set `reducedMotion="user"` on `MotionConfig`, put `motion-reduce:` on CSS transitions and keyframe animations, and call `useReducedMotion()` where the logic branches.
- Inline blur filters are switched off on touch devices by a rule at the end of `apps/docs/app/global.css`, because repainting a blur every frame stutters on phones. Don't work around it.

### Skills

Emil Kowalski's design engineering skills are installed in `.agents/skills/` (linked into `.claude/skills/`, pinned in `skills-lock.json`). Use them for motion work:

| When | Skill |
| --- | --- |
| Building an animation | `animate` |
| Several elements moving together | `choreograph` |
| Drag, swipe and sheets | `gestures` |
| Dropped frames | `animation-performance` |
| Checking motion before you finish | `review-animations` |
| General UI polish | `emil-design-eng` |

Where a skill and this file disagree, this file wins. For example, the skills keep UI transitions under 300ms, while a Remold morph follows a change on a spring of about half a second.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
