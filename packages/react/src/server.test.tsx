// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Remold } from "./index.js";

describe("server rendering", () => {
  it("renders every part without a browser", () => {
    const html = renderToString(
      <Remold.Layout trigger="list" className="stage">
        <p>Hello</p>
        <Remold.Text>Saving</Remold.Text>
        <Remold.Ignore>
          <b>Ad</b>
        </Remold.Ignore>
        <Remold.Scene label="Demo" objects={{}} layouts={{ only: { objects: {} } }} />
      </Remold.Layout>,
    );
    expect(html).toContain('class="stage"');
    expect(html).toContain("<span>Saving</span>");
    expect(html).toContain('data-rm-ignore=""');
    expect(html).toContain('aria-label="Demo"');
  });

  it("renders an icon as it is, so the first paint is right before any script runs", () => {
    const html = renderToString(
      <Remold.Icon
        icon={
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
          </svg>
        }
      />,
    );
    expect(html).toContain('<circle cx="12" cy="12" r="10"></circle>');
    // The morphing path only appears in the browser, once the icon has been read.
    expect(html).not.toContain("<path");
  });
});
