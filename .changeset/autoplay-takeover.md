---
"@remold-ui/react": patch
---

`useAutoplay` now also stops when someone tabs into the element or it is clicked by assistive technology. It no longer starts by itself when the system asks for reduced motion: it waits for the play/pause control or the new `play()`, and the new `reducedMotion` option changes that.
