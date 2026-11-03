"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame, Segmented } from "./frame";

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

const SORTS: Record<Sort, (left: File, right: File) => number> = {
  name: (left, right) => left.name.localeCompare(right.name),
  size: (left, right) => right.size - left.size,
  modified: (left, right) => left.modified - right.modified,
};

export function FilesDemo({ framed = true }: { framed?: boolean }) {
  const [sort, setSort] = useState<Sort>("name");
  const [kind, setKind] = useState<File["kind"] | "All">("All");

  const shown = FILES.filter((file) => kind === "All" || file.kind === kind).sort(SORTS[sort]);

  const body = (
    <div className="w-full max-w-[560px]">
      <div className="mb-3 flex flex-wrap justify-between gap-2">
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
      <Remold.Layout trigger={`${sort}:${kind}`} className="overflow-hidden rounded-[10px] border border-[var(--color-fd-border)] bg-[var(--color-fd-background)]">
        {shown.map((file) => (
          <div key={file.name} className="grid grid-cols-[16px_minmax(0,1fr)_64px_90px] items-center gap-3 border-b border-[var(--color-fd-border)] bg-[var(--color-fd-background)] px-3.5 py-2.5 text-sm last:border-b-0 max-[520px]:grid-cols-[16px_minmax(0,1fr)_64px]">
            <span className={`h-[17px] w-3.5 rounded-[3px] bg-[var(--color-fd-muted)] shadow-[inset_0_0_0_1px_var(--color-fd-border)] ${file.kind === "Image" ? "bg-[#93c5fd]" : file.kind === "Video" ? "bg-[#fcd34d]" : ""}`} aria-hidden="true" />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</span>
            <span className="text-right text-[13px] tabular-nums text-[var(--color-fd-muted-foreground)]">
              {file.size < 1 ? `${Math.round(file.size * 1000)} KB` : `${file.size} MB`}
            </span>
            <span className="text-right text-[13px] tabular-nums text-[var(--color-fd-muted-foreground)] max-[520px]:hidden">
              {file.modified === 1 ? "Yesterday" : `${file.modified} days ago`}
            </span>
          </div>
        ))}
      </Remold.Layout>
    </div>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
