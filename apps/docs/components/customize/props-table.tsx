/** A props table built from a component's settings, so it can't drift from the Customize panel. */
import { TypeTable } from "fumadocs-ui/components/type-table";
import { formatValue, typeOf, type Customizable } from "./controls";
import { logoMorphControls } from "../demos/logo-morph.controls";

const CONTROLS: Record<string, Customizable> = {
  "logo-morph": logoMorphControls,
};

export function ControlsTable({ name }: { name: string }) {
  const meta = CONTROLS[name];
  if (!meta) throw new Error(`ControlsTable: no settings registered for "${name}"`);
  return (
    <TypeTable
      type={Object.fromEntries(
        Object.entries(meta.controls).map(([key, c]) => [
          key,
          {
            type: typeOf(c),
            default: c.type === "color" || c.type === "select" ? `"${formatValue(c, c.default)}"` : formatValue(c, c.default),
            description: c.description ?? c.label,
          },
        ]),
      )}
    />
  );
}
