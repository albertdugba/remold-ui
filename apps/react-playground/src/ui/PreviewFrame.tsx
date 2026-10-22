/**
 * Shows a demo at its natural size, scaled down to fit the space it's given, like a product
 * shot. The demo runs normally inside; Remold measures on-screen sizes, so it animates
 * correctly at any scale.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function PreviewFrame({ frame, children }: { frame: "window" | "panel"; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const fit = () => {
      const o = outer.current;
      const i = inner.current;
      if (!o || !i || !i.offsetWidth || !i.offsetHeight) return;
      setScale(Math.min(1, (o.clientWidth * 0.9) / i.offsetWidth, (o.clientHeight * 0.9) / i.offsetHeight));
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (outer.current) observer.observe(outer.current);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className={`preview-frame preview-${frame}`}>
      <div ref={inner} className="preview-content" style={{ scale: String(scale) }}>
        {children}
      </div>
    </div>
  );
}
