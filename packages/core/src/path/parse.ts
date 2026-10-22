/**
 * SVG path data parsing.
 *
 * Reads a path's `d` attribute into absolute commands. `svgpath` handles the SVG grammar,
 * relative coordinates, and smooth-curve shorthand; this module keeps the public command
 * format used by the rest of the engine.
 */
import svgpath from "svgpath";

export type PathCommand =
  | { type: "M"; x: number; y: number }
  | { type: "L"; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | {
      type: "A";
      rx: number;
      ry: number;
      /** Rotation of the ellipse's x-axis, in degrees. */
      rotation: number;
      largeArc: boolean;
      sweep: boolean;
      x: number;
      y: number;
    }
  | { type: "Z" };

type SvgPath = ReturnType<typeof svgpath> & { err: string };
type SvgSegment = Parameters<Parameters<SvgPath["iterate"]>[0]>[0];

function explainParseError(error: string, source: string): string {
  if (error.includes("string should start with")) return "Invalid path data: a path must start with M";

  const position = /at pos (\d+)/.exec(error)?.[1];
  const where = position === undefined ? "an unknown position" : Number(position) === source.length ? "the end" : `position ${position}`;

  if (error.includes("arc flag")) return `Invalid path data: expected an arc flag (0 or 1) at ${where}`;
  if (error.includes("missed param") || error.includes("param should start")) {
    return `Invalid path data: expected a number at ${where}`;
  }
  if (error.includes("bad command")) {
    const command = /bad command (.)/.exec(error)?.[1];
    return command && /[0-9]/.test(command)
      ? `Invalid path data: expected a command at ${where}`
      : `Invalid path data: unexpected "${command}" at ${where}`;
  }

  return `Invalid path data: ${error}`;
}

function toPathCommand(segment: SvgSegment, currentX: number, currentY: number): PathCommand {
  switch (segment[0]) {
    case "M":
    case "L":
      return { type: segment[0], x: segment[1], y: segment[2] };
    case "H":
      return { type: "L", x: segment[1], y: currentY };
    case "V":
      return { type: "L", x: currentX, y: segment[1] };
    case "C":
      return { type: "C", x1: segment[1], y1: segment[2], x2: segment[3], y2: segment[4], x: segment[5], y: segment[6] };
    case "Q":
      return { type: "Q", x1: segment[1], y1: segment[2], x: segment[3], y: segment[4] };
    case "A":
      return {
        type: "A",
        rx: segment[1],
        ry: segment[2],
        rotation: segment[3],
        largeArc: segment[4] === 1,
        sweep: segment[5] === 1,
        x: segment[6],
        y: segment[7],
      };
    case "Z":
    case "z":
      return { type: "Z" };
    default:
      throw new Error(`Invalid path data: unsupported command "${segment[0]}"`);
  }
}

/** Parse path data into absolute M, L, C, Q, A and Z commands. Throws on malformed input. */
export function parsePath(source: string): PathCommand[] {
  const path = svgpath(source) as SvgPath;
  if (path.err) throw new Error(explainParseError(path.err, source));

  const commands: PathCommand[] = [];
  path
    .abs()
    .unshort()
    .iterate((segment, _index, x, y) => {
      commands.push(toPathCommand(segment, x, y));
    });

  return commands;
}
