"use client";
/**
 * Highlighted code for blocks whose text changes in the browser (an install command for the
 * chosen package manager, the Customize panel's snippet). Same highlighter and colours as the
 * docs' own code blocks. `bare` drops the block's frame, for code inside a frame of our own.
 */
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

export function Code({ code, lang = "tsx", bare = false, className }: { code: string; lang?: string; bare?: boolean; className?: string }) {
  return (
    <DynamicCodeBlock
      lang={lang}
      code={code}
      codeblock={{ allowCopy: false, className: `${bare ? "rm-bare-code" : ""} ${className ?? ""}` }}
    />
  );
}
