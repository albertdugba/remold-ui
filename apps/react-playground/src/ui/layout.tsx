/** The desktop window that frames the wide examples. */
import type { ReactNode } from "react";

export function Browser({ title, children, toolbar }: { title: string; children: ReactNode; toolbar?: ReactNode }) {
  return (
    <div className="browser" role="group" aria-label={title}>
      <div className="browser-bar">
        <span className="lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="browser-title">{title}</span>
        <span className="browser-tools">{toolbar}</span>
      </div>
      {children}
    </div>
  );
}
