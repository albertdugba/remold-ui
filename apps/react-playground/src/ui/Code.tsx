/**
 * A code sample with light highlighting: components and tags, strings, keywords and comments.
 * Enough for short JSX snippets; not a general highlighter.
 */
import { Fragment, type ReactNode } from "react";

const TOKENS =
  /(\/\/[^\n]*)|("[^"\n]*"|'[^'\n]*'|`[^`]*`)|(<\/?[A-Za-z][\w.]*|\/?>)|\b(const|let|return|import|from|await|async|function|export)\b/g;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKENS)) {
    const index = match.index ?? 0;
    if (index > last) out.push(code.slice(last, index));
    const [text, comment, string, tag, keyword] = match;
    const kind = comment ? "c" : string ? "s" : tag ? "t" : keyword ? "k" : "";
    out.push(
      <span key={index} className={`tok-${kind}`}>
        {text}
      </span>,
    );
    last = index + text.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <figure className="code-sample">
      {label && <figcaption>{label}</figcaption>}
      <pre>
        <code>
          {highlight(children.trim()).map((part, i) => (
            <Fragment key={i}>{part}</Fragment>
          ))}
        </code>
      </pre>
    </figure>
  );
}
