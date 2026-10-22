import { springs } from "@remold-ui/core";
import { Code, Definitions, DocLink, H2, Note, PageHeader, PropsTable } from "../kit";

export function Matching() {
  return (
    <>
      <PageHeader title="How matching works">How Remold decides which element became which, and how to steer it.</PageHeader>
      <H2>The four steps</H2>
      <ol>
        <li>
          <strong>Read the page.</strong> Before the update, every element that has its own text, an image or a visible box is measured: its
          kind, text, media, size, position and colour. After the update, the same is read again.
        </li>
        <li>
          <strong>Score every pair.</strong> Each old element is compared with each new one. Same text scores high, a similar image or size
          scores a little, and an element whose parent was already paired gets a bonus.
        </li>
        <li>
          <strong>Pick partners.</strong> The best overall pairing is chosen at once (with the Hungarian algorithm), so one strong pair is
          given up when that lets two others do better. Weak pairs are left unmatched rather than guessed.
        </li>
        <li>
          <strong>Move.</strong> Paired elements spring from their old box to their new one. Unmatched new elements fade in; unmatched old
          ones fade out from where they were.
        </li>
      </ol>
      <p>Text that splits into several elements, or several that merge into one ("3 items" becoming "3" and "items"), is detected too.</p>

      <H2>Steering it</H2>
      <p>
        Pass <code>match</code> to <DocLink to="react/layout">Layout</DocLink>, <code>useRemold</code> or <code>transition()</code>.
      </p>
      <PropsTable
        label="Option"
        rows={[
          {
            name: "threshold",
            type: "number",
            default: "0.5",
            description: "Pairs scoring below this (0 to 1) stay unmatched. Raise it to be stricter.",
          },
          {
            name: "structure",
            type: "boolean",
            default: "true",
            description: "Use parents and neighbours to settle pairs that look alike.",
          },
          { name: "splits", type: "boolean", default: "true", description: "Detect text that splits apart or merges." },
        ]}
      />

      <H2>Leaving things out</H2>
      <p>
        Wrap anything that shouldn't move, such as a video or a live chart, in <DocLink to="react/ignore">Ignore</DocLink>, or add a{" "}
        <code>data-rm-ignore</code> attribute. It and everything inside it is skipped.
      </p>
      <Code>{`<Remold.Ignore><VideoPlayer /></Remold.Ignore>`}</Code>
      <Note>
        To see what was paired, add a style for <code>[data-rm-matched]</code>, <code>[data-rm-entering]</code> and{" "}
        <code>[data-rm-exiting]</code>. The examples' Show matches switch does exactly that.
      </Note>
    </>
  );
}

export function Springs() {
  return (
    <>
      <PageHeader title="Springs">Everything moves on springs, described by how long they take and how much they bounce.</PageHeader>
      <H2>Duration and bounce</H2>
      <p>
        A spring has no fixed end time, so it can be redirected at any moment and keep its speed. It's described the way SwiftUI describes
        it:
      </p>
      <PropsTable
        label="Field"
        rows={[
          { name: "duration", type: "number", description: "Roughly how long it takes to feel finished, in seconds." },
          {
            name: "bounce",
            type: "number",
            description: "0 settles as fast as possible without overshooting. Up to 1 overshoots more; below 0 settles more slowly.",
          },
        ]}
      />
      <Code>{`<Remold.Layout trigger={view} spring={{ duration: 0.6, bounce: 0.2 }}>`}</Code>

      <H2>Presets</H2>
      <Definitions
        label={["Preset", "Value"]}
        rows={Object.entries(springs).map(([name, s]) => ({
          name: `springs.${name}`,
          description: (
            <code>
              {"{ duration: "}
              {s.duration}
              {", bounce: "}
              {s.bounce}
              {" }"}
            </code>
          ),
        }))}
      />
      <p>
        <code>smooth</code> suits layout changes, <code>snappy</code> small controls and text, <code>bouncy</code> playful moments.
      </p>

      <H2>Interruptions</H2>
      <p>
        When something changes again mid-animation, nothing restarts. Each element heads for its new place from where it is now, at the
        speed it was moving, so rapid clicks feel continuous rather than jerky. Motion runs at the same speed on 60 Hz and 120 Hz screens.
      </p>
    </>
  );
}

export function Accessibility() {
  return (
    <>
      <PageHeader title="Accessibility">What Remold does for people using reduced motion, screen readers and keyboards.</PageHeader>
      <H2>Reduced motion</H2>
      <p>
        By default every part follows the system's reduced-motion setting: changes happen at once, with no movement. Override it with{" "}
        <code>reducedMotion</code>.
      </p>
      <Definitions
        label={["Value", "Behaviour"]}
        rows={[
          { name: '"user"', description: "Follow the system setting. The default." },
          { name: '"always"', description: "Never animate movement, for example behind your own setting." },
          { name: '"never"', description: "Always animate. Use sparingly." },
        ]}
      />

      <H2>Announcements</H2>
      <p>
        Pass <code>announce</code> to have a short summary of each change read to screen-reader users, such as "2 moved, 1 added", or a
        function that writes your own message.
      </p>
      <Code>{`<Remold.Layout trigger={sort} announce={(s) => \`Sorted. \${s.moved} files moved.\`}>`}</Code>

      <H2>Focus</H2>
      <p>
        If the focused element is replaced by its new version, focus moves to the new one, so keyboard users don't lose their place. Text
        morphs keep the real text available to screen readers while the letters move.
      </p>

      <H2>Canvas</H2>
      <p>
        Scenes and particles take a <code>label</code>, which becomes the canvas's accessible name. Scenes also describe their objects and
        can be explored with the keyboard.
      </p>
    </>
  );
}

export function Styling() {
  return (
    <>
      <PageHeader title="Styling">Every part renders plain elements you can style, and exposes its state as data attributes.</PageHeader>
      <H2>Class names</H2>
      <p>
        <code>className</code> takes a string, or a function of the part's state.
      </p>
      <Code>{`<Remold.Layout trigger={view} className={(state) => (state.animating ? "list busy" : "list")}>`}</Code>

      <H2>Data attributes</H2>
      <Definitions
        label={["Attribute", "Set on"]}
        rows={[
          { name: "data-rm-animating", description: "A part while it's animating." },
          { name: "data-rm-matched", description: "Elements paired with an old version during a transition." },
          { name: "data-rm-changed", description: "Matched elements whose box or text changed." },
          { name: "data-rm-entering", description: "New elements fading in." },
          { name: "data-rm-exiting", description: "Copies of removed elements fading out." },
        ]}
      />

      <H2>Rendering your own element</H2>
      <p>
        <code>render</code> replaces the default element and keeps Remold's props and ref. Pass an element, or a function of the props
        and state.
      </p>
      <Code>{`<Remold.Layout trigger={view} render={<ul className="grid" />}>`}</Code>
    </>
  );
}
