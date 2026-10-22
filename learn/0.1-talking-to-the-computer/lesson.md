# 0.1 · Talking to the computer

## The idea

A computer is very fast and very obedient, but it understands nothing on its own.
A **program** is a list of instructions, written in a language the computer can follow, done **top to bottom, one line at a time**.

**JavaScript** is one of those languages. Browsers understand it. **Node** is a program that lets your Mac understand it too, outside the browser.

Think of it like this:
- You write a recipe card (a `.js` file).
- Node is the cook. It reads the card from top to bottom and does each step.

## The first instruction: `console.log`

`console.log(...)` means "say this out loud". Whatever is inside the brackets gets printed in the terminal.

```js
console.log("Hello!");
```

- `console.log` is the instruction.
- The brackets `( )` hold what you want to say.
- The quotes `" "` mean "these are words, not instructions". Words in quotes are called a **string**.
- The `;` at the end is a full stop. It means "this instruction is finished".

Numbers don't need quotes, and the computer can do maths with them:

```js
console.log(2 + 3);     // prints 5
console.log("2 + 3");   // prints 2 + 3, because in quotes it's just words
```

Anything after `//` is a **comment**: a note for humans. The computer skips it.

## Your turn

1. Open your terminal in the `remold` folder and type `node -v`, then press Enter. You should see a version number like `v24.21.0`. That's the cook saying hello.
2. Open `learn/0.1-talking-to-the-computer/hello.js` and follow the TODOs inside it.
3. Run it: `node learn/0.1-talking-to-the-computer/hello.js`
4. Check it: `node learn/0.1-talking-to-the-computer/check.mjs`
5. Send me what printed, even if it's red and scary. Errors are just the computer telling you which line confused it.

## Why this matters for Remold

Every animation in the demo page is the computer following instructions like these, about 60 times a second. You just wrote the very first one.
