---
"@remold-ui/react": patch
---

Add `Remold.Tour`: a headless product tour. `Tour.Root` holds the step (controlled or not) and the keyboard, `Tour.Target` marks what each step points at, `Tour.Spotlight` measures an unstyled box around the current target, and `Tour.Next`, `Tour.Previous` and `Tour.Close` move it. `useTour()` gives any popover the target element to anchor to.
