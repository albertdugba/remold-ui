/**
 * Small demos written for the docs pages, kept close to the code the pages show.
 */
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { useMotion } from "../motion";

interface File {
  name: string;
  kind: "Image" | "Document" | "Video";
  size: number;
  modified: number;
}

const FILES: File[] = [
  { name: "brand-guidelines.pdf", kind: "Document", size: 4.2, modified: 3 },
  { name: "hero-shot.png", kind: "Image", size: 2.8, modified: 1 },
  { name: "launch-teaser.mp4", kind: "Video", size: 48.1, modified: 6 },
  { name: "pricing-notes.md", kind: "Document", size: 0.1, modified: 2 },
  { name: "team-photo.jpg", kind: "Image", size: 3.6, modified: 9 },
  { name: "roadmap-q3.pdf", kind: "Document", size: 1.3, modified: 12 },
];

type Sort = "name" | "size" | "modified";
const SORTS: Record<Sort, (a: File, b: File) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  size: (a, b) => b.size - a.size,
  modified: (a, b) => a.modified - b.modified,
};

/** A file list that sorts and filters. The whole list re-renders; Remold moves the rows. */
export function FilesDemo() {
  const { loop, reducedMotion } = useMotion();
  const [sort, setSort] = useState<Sort>("name");
  const [kind, setKind] = useState<File["kind"] | "All">("All");
  const shown = FILES.filter((f) => kind === "All" || f.kind === kind).sort(SORTS[sort]);

  return (
    <div className="files">
      <div className="files-bar">
        <div className="doc-segmented" role="group" aria-label="Sort by">
          {(["name", "size", "modified"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)}>
              {s[0]!.toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="doc-segmented" role="group" aria-label="Show">
          {(["All", "Document", "Image"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === "All" ? "All" : `${k}s`}
            </button>
          ))}
        </div>
      </div>
      <Remold.Layout trigger={`${sort}:${kind}`} className="files-list" loop={loop} reducedMotion={reducedMotion}>
        {shown.map((f) => (
          <div key={f.name} className="files-row">
            <span className={`files-icon ${f.kind.toLowerCase()}`} aria-hidden="true" />
            <span className="files-name">{f.name}</span>
            <span className="files-meta">{f.size < 1 ? `${Math.round(f.size * 1000)} KB` : `${f.size} MB`}</span>
            <span className="files-meta">{f.modified === 1 ? "Yesterday" : `${f.modified} days ago`}</span>
          </div>
        ))}
      </Remold.Layout>
    </div>
  );
}

const STATUSES = ["Uploading 3 files", "Uploading 2 files", "Processing", "Upload complete"];

/** A status line that changes letter by letter. */
export function StatusDemo() {
  const { loop, reducedMotion } = useMotion();
  const [index, setIndex] = useState(0);
  return (
    <div className="status-demo">
      <Remold.Text className="status-text" loop={loop} reducedMotion={reducedMotion}>
        {STATUSES[index]!}
      </Remold.Text>
      <button type="button" className="doc-button" onClick={() => setIndex((i) => (i + 1) % STATUSES.length)}>
        Next status
      </button>
    </div>
  );
}

const ICONS = {
  Play: "M8 5v14l11-7z",
  Pause: "M7 5h3v14H7zM14 5h3v14h-3z",
};

/** An icon that reshapes between two states. */
export function IconDemo() {
  const { loop, reducedMotion } = useMotion();
  const [playing, setPlaying] = useState(false);
  return (
    <button type="button" className="icon-demo" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
      <Remold.Icon
        d={playing ? ICONS.Pause : ICONS.Play}
        viewBox="0 0 24 24"
        fill="currentColor"
        loop={loop}
        reducedMotion={reducedMotion}
      />
    </button>
  );
}
