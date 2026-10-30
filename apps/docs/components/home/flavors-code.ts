/** The code each layer tab shows: plain data, so the home page can highlight it on the server. */
export const FLAVORS = {
  React: {
    file: "inbox.tsx",
    code: `import { Remold } from '@remold-ui/react';

export function Inbox({ messages, sort }) {
  return (
    <Remold.Layout trigger={sort}>
      {messages.map((message) => (
        <Message key={message.id} {...message} />
      ))}
    </Remold.Layout>
  );
}`,
  },
  JS: {
    file: "inbox.js",
    code: `import { transition } from '@remold-ui/dom';

// Any element. Any framework, or none.
const list = document.querySelector('ul');

sort.onclick = () =>
  transition(list, () => {
    list.innerHTML = render(sorted);
  });`,
  },
  Canvas: {
    file: "hero.ts",
    code: `import { particles, sampleTextPoints } from '@remold-ui/canvas';

const dots = particles(canvas, {
  points: sampleTextPoints('Inbox zero'),
});

dots.to(sampleTextPoints('3 new messages'));`,
  },
  Core: {
    file: "worker.ts",
    code: `import { matchNodes, value } from '@remold-ui/core';

// Pair two snapshots of any interface, anywhere.
const { pairs, added, removed } = matchNodes(before, after);

const x = value(0, { spring: { duration: 0.5, bounce: 0.2 } });
x.to(120);`,
  },
} as const;
export type Flavor = keyof typeof FLAVORS;
export const FLAVOR_NAMES = Object.keys(FLAVORS) as Flavor[];
