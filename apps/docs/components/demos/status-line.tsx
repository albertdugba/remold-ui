"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame, DEMO_BUTTON } from "./frame";

const STATUSES = ["Uploading 3 files", "Uploading 2 files", "Processing", "Upload complete"];

export function StatusDemo() {
  const [index, setIndex] = useState(0);

  return (
    <Frame>
      <div className="grid justify-items-center gap-4">
        <Remold.Text className="text-[22px] font-semibold tracking-[-0.02em]">{STATUSES[index]!}</Remold.Text>
        <button
          type="button"
          className={DEMO_BUTTON}
          onClick={() => setIndex((current) => (current + 1) % STATUSES.length)}
        >
          Next status
        </button>
      </div>
    </Frame>
  );
}
