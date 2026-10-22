/**
 * The settings a component offers on its docs page. Each component declares them once, in a
 * `<name>.controls.ts` file next to it; the page builds the Customize panel, the props table and
 * the "copy code" snippet from that one declaration. Plain data, so it works on the server too.
 */
interface Base {
  label: string;
  /** One line for the props table. */
  description?: string;
}

export type Control =
  | (Base & { type: "number"; min: number; max: number; step?: number; default: number })
  | (Base & { type: "toggle"; default: boolean })
  | (Base & { type: "color"; default: string })
  | (Base & { type: "select"; options: readonly string[]; default: string });

export type Controls = Record<string, Control>;
export type Values = Record<string, number | boolean | string>;

export interface Customizable {
  /** The component's name as people import it. */
  importName: string;
  /** Where the installed file lands. */
  importFrom: string;
  controls: Controls;
  /** Canvas components rebuild their scene when a setting changes, rather than updating in place. */
  remount?: boolean;
}

export const defaultsOf = (controls: Controls): Values => Object.fromEntries(Object.entries(controls).map(([key, c]) => [key, c.default]));

/** How a value reads in the props table and in code. */
export function formatValue(control: Control, value: Values[string]): string {
  if (control.type === "number") return String(Number((value as number).toFixed(4)));
  return String(value);
}

/** The JSX for these settings, listing only what differs from the defaults. */
export function codeFor({ importName, importFrom, controls }: Customizable, values: Values): string {
  const props = Object.entries(controls)
    .filter(([key, c]) => values[key] !== c.default)
    .map(([key, c]) => {
      const value = values[key]!;
      if (c.type === "toggle") return value ? key : `${key}={false}`;
      if (c.type === "number") return `${key}={${formatValue(c, value)}}`;
      return `${key}="${value}"`;
    });
  const tag =
    props.length === 0
      ? `<${importName} />`
      : props.join(" ").length < 60
      ? `<${importName} ${props.join(" ")} />`
      : `<${importName}\n${props.map((p) => `  ${p}`).join("\n")}\n/>`;
  return `import { ${importName} } from '${importFrom}';\n\n${tag}`;
}

export function typeOf(control: Control): string {
  if (control.type === "number") return "number";
  if (control.type === "toggle") return "boolean";
  if (control.type === "select") return control.options.map((o) => `"${o}"`).join(" | ");
  return "string";
}
