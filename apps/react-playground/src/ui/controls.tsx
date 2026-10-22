/** Controls shared by the demos: a segmented control and a switch. */
import { useId, type ReactNode } from "react";

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "default",
}: {
  label: string;
  options: readonly T[] | readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  tone?: "default" | "quiet" | "dark";
}) {
  const items = options.map((o) => (typeof o === "string" ? { value: o as T, label: o as string } : o));
  return (
    <div className={`segmented ${tone}`} role="group" aria-label={label}>
      {items.map((item) => (
        <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  const id = useId();
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  ...rest
}: { children: ReactNode; onClick?: () => void; variant?: "default" | "pill" } & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
>) {
  return (
    <button type="button" className={`button ${variant}`} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
