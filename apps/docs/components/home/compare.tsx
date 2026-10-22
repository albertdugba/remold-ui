/** Two ways to animate the same change, side by side. */
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";

const LABELLED = `// Every element needs a name, in every view.
function List({ tasks }) {
  return tasks.map((t) => (
    <motion.div layoutId={\`task-\${t.id}\`}>
      <motion.span layoutId={\`title-\${t.id}\`}>
        {t.title}
      </motion.span>
      <motion.img layoutId={\`avatar-\${t.id}\`} src={t.avatar} />
    </motion.div>
  ));
}

function Board({ tasks }) {
  // …and the same names again, kept in sync by hand.
}`;

const REMOLD = `// Wrap the part that changes. That's it.
<Remold.Layout trigger={view}>
  {view === 'list'
    ? <List tasks={tasks} />
    : <Board tasks={tasks} />}
</Remold.Layout>

// List and Board are plain components.
// Server-rendered, generated or rewritten
// markup animates the same way.`;

export async function Compare() {
  return (
    <div className="cmp">
      <figure className="cmp-pane">
        <figcaption>
          Matching by name <span>every element labelled</span>
        </figcaption>
        <ServerCodeBlock code={LABELLED} lang="tsx" codeblock={{ allowCopy: false, className: "rm-bare-code" }} />
      </figure>
      <figure className="cmp-pane ours">
        <figcaption>
          Remold <span>nothing to label</span>
        </figcaption>
        <ServerCodeBlock code={REMOLD} lang="tsx" codeblock={{ allowCopy: false, className: "rm-bare-code" }} />
      </figure>
    </div>
  );
}
