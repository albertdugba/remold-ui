"use client";
/**
 * The same example in each framework it exists in, switched by the shared framework menu.
 *
 * ```mdx
 * <CodeVariants>
 * <Variant framework="react">
 *
 * ```tsx
 * <Remold.Text>{status}</Remold.Text>
 * ```
 *
 * </Variant>
 * <Variant framework="js">
 *
 * ```ts
 * morphText(element, status);
 * ```
 *
 * </Variant>
 * </CodeVariants>
 * ```
 */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { FrameworkMenu, useFramework, type Framework } from "./framework";

export function Variant({ children }: { framework: Framework; children: ReactNode }) {
  return <>{children}</>;
}

export function CodeVariants({ children, label }: { children: ReactNode; label?: string }) {
  const variants = Children.toArray(children).filter(
    (c): c is ReactElement<{ framework: Framework; children: ReactNode }> =>
      isValidElement(c) && typeof (c.props as { framework?: unknown }).framework === "string",
  );
  const available = variants.map((v) => v.props.framework);
  const framework = useFramework(available);
  const shown = variants.find((v) => v.props.framework === framework) ?? variants[0];
  return (
    <div className="rm-variants not-prose my-4 rounded-xl border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between gap-2 border-b border-fd-border py-1 pr-1.5 pl-3.5 text-[12.5px] text-fd-muted-foreground">
        {/* An optional caption, such as a file name; the menu says which framework is shown. */}
        <span>{label}</span>
        <FrameworkMenu available={available} />
      </div>
      <div className="rm-variants-body">{shown}</div>
    </div>
  );
}
