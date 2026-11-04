---
"@remold-ui/dom": patch
"@remold-ui/react": patch
---

A `Remold.Icon` that changes inside a `Remold.Layout` now morphs in place instead of fading in again. The snapshot reads an element's media identity from `data-rm-media` when it has one (exported as `MEDIA_ATTRIBUTE`), and `Remold.Icon` sets it to an id that stays the same for the life of the icon.
