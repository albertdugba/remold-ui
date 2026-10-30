/** Questions people ask before trying Remold. Native disclosure, so it works without JavaScript. */
const QUESTIONS = [
  {
    q: "Is Remold a component library?",
    a: "Not in the usual sense. Remold is an engine for connecting one interface state to the next. The components are ways to use it; the demos show what you can build with your own UI.",
  },
  {
    q: "Is Remold free?",
    a: "Yes. The engine and its primitives are open source under the MIT licence, including for commercial projects. A separate Pro editor may offer visual authoring and export tools later.",
  },
  {
    q: "Do I need animation IDs?",
    a: "No extra IDs for Remold. It matches elements using their content, geometry and surroundings, including when the next view comes from different markup. React lists still need React keys as usual.",
  },
  {
    q: "Which frameworks does it support?",
    a: "Any of them, or none. React gets components and hooks. Everywhere else, @remold-ui/dom animates any element from plain JavaScript, so it works in Vue, Svelte, Astro or a server-rendered page. @remold-ui/canvas draws scenes and particles, and the maths in @remold-ui/core has no DOM at all.",
  },
  {
    q: "What happens if a change interrupts another?",
    a: "Everything heads for its new place from wherever it is, at the speed it was going. Nothing restarts or jumps, however fast the changes come.",
  },
  {
    q: "Does it respect reduced motion?",
    a: "Yes. By default it follows the system setting: changes happen at once, focus stays with the element you were on, and it can announce what changed to screen readers.",
  },
  {
    q: "Does it work with server rendering?",
    a: "Yes. The React parts render on the server, and animation starts in the browser after hydration. What goes inside them can come from anywhere, including server components.",
  },
];

export function Faq() {
  return (
    <div className="qx">
      {QUESTIONS.map(({ q, a }, i) => (
        <details key={q} className="qx-item" open={i === 0}>
          <summary>
            {q}
            <span className="qx-icon" aria-hidden="true" />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
