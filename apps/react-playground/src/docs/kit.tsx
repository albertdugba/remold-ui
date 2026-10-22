/**
 * The pieces every docs page is written with: headings that the contents list can find, a
 * framed live demo, props tables, notes and inline code.
 */
import type { ReactNode } from "react";
import { Code } from "../ui/Code";

export { Code };

/** A page's title and one-line description. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="doc-header">
      <h1 tabIndex={-1}>{title}</h1>
      {children && <p className="doc-description">{children}</p>}
    </header>
  );
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A section heading. It gets an id, so the "On this page" list can link to it. */
export function H2({ children, id }: { children: string; id?: string }) {
  return (
    <h2 id={id ?? slug(children)} className="doc-h2">
      {children}
    </h2>
  );
}

export function H3({ children, id }: { children: string; id?: string }) {
  return (
    <h3 id={id ?? slug(children)} className="doc-h3">
      {children}
    </h3>
  );
}

/** A live demo in a quiet frame. */
export function Demo({ children, tone = "light", toolbar }: { children: ReactNode; tone?: "light" | "dark"; toolbar?: ReactNode }) {
  return (
    <div className={`doc-demo ${tone}`}>
      {toolbar && <div className="doc-demo-toolbar">{toolbar}</div>}
      <div className="doc-demo-body">{children}</div>
    </div>
  );
}

export interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: ReactNode;
}

/** Props, options or return values, as a table. */
export function PropsTable({ rows, label = "Prop" }: { rows: PropRow[]; label?: string }) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead>
          <tr>
            <th scope="col">{label}</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code className="doc-prop">{row.name}</code>
                <p className="doc-prop-description">{row.description}</p>
              </td>
              <td>
                <code className="doc-type">{row.type}</code>
              </td>
              <td>{row.default ? <code className="doc-type">{row.default}</code> : <span className="doc-none">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A two-column list of names and what they mean, for data attributes and the like. */
export function Definitions({ rows, label }: { rows: { name: string; description: ReactNode }[]; label: [string, string] }) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table compact">
        <thead>
          <tr>
            <th scope="col">{label[0]}</th>
            <th scope="col">{label[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code className="doc-prop">{row.name}</code>
              </td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <aside className="doc-note">{children}</aside>;
}

/** A link to another docs page. */
export function DocLink({ to, children }: { to: string; children: ReactNode }) {
  return <a href={`#/${to}`}>{children}</a>;
}
