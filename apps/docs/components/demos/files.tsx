"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame, Segmented } from "./frame";
import "./files.css";

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
export function FilesDemo({ framed = true }: { framed?: boolean }) {
  const [sort, setSort] = useState<Sort>("name");
  const [kind, setKind] = useState<File["kind"] | "All">("All");
  const shown = FILES.filter((f) => kind === "All" || f.kind === kind).sort(SORTS[sort]);

  const body = (
    <div className="rm-files">
      <div className="rm-files-bar">
        <Segmented
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "name", label: "Name" },
            { value: "size", label: "Size" },
            { value: "modified", label: "Modified" },
          ]}
        />
        <Segmented
          label="Show"
          value={kind}
          onChange={setKind}
          options={[
            { value: "All", label: "All" },
            { value: "Document", label: "Docs" },
            { value: "Image", label: "Images" },
          ]}
        />
      </div>
      <Remold.Layout trigger={`${sort}:${kind}`} className="rm-files-list">
        {shown.map((f) => (
          <div key={f.name} className="rm-files-row">
            <span className={`rm-files-icon ${f.kind.toLowerCase()}`} aria-hidden="true" />
            <span className="rm-files-name">{f.name}</span>
            <span className="rm-files-meta">{f.size < 1 ? `${Math.round(f.size * 1000)} KB` : `${f.size} MB`}</span>
            <span className="rm-files-meta rm-files-date">{f.modified === 1 ? "Yesterday" : `${f.modified} days ago`}</span>
          </div>
        ))}
      </Remold.Layout>
    </div>
  );
  return framed ? <Frame>{body}</Frame> : body;
}
