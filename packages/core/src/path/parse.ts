/**
 * SVG path data parsing.
 *
 * Reads a path's `d` attribute into absolute commands, following the SVG grammar: compact numbers
 * (`1e2-5`, `.5.5`), arc flags squashed together by minifiers (`0110`), implicit repeats (extra
 * pairs after `M` are lines), relative commands, and the `S` and `T` shorthands, which become full
 * curves. Mistakes are reported with where they are, rather than guessed around.
 */

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

/** How many numbers each command takes. */
const PARAMETERS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const SEPARATOR = /[\s,]*/y;

/** Where the reader is, for messages: a position, or the end. */
const where = (source: string, at: number) => (at >= source.length ? "the end" : `position ${at}`);

/**
 * Reads path data one token at a time. `index` is where it has got to; every read skips the
 * spaces and commas before the token.
 */
export function pathReader(source: string) {
  let index = 0;
  const skip = () => {
    SEPARATOR.lastIndex = index;
    SEPARATOR.exec(source);
    index = SEPARATOR.lastIndex;
  };
  return {
    get index() {
      return index;
    },
    skip,
    /** The next character, after any spaces and commas. */
    peek() {
      skip();
      return source[index];
    },
    /** Moves past one character: a command letter. */
    advance() {
      index++;
    },
    /** The next number, or a throw that says where one was expected. */
    number(): { value: number; text: string } {
      skip();
      NUMBER.lastIndex = index;
      const match = NUMBER.exec(source);
      if (!match) throw new Error(`Invalid path data: expected a number at ${where(source, index)}`);
      index = NUMBER.lastIndex;
      return { value: Number(match[0]), text: match[0] };
    },
    /** An arc flag: a single 0 or 1, which minifiers write with nothing after it. */
    flag(): boolean {
      skip();
      const character = source[index];
      if (character !== "0" && character !== "1") {
        throw new Error(`Invalid path data: expected an arc flag (0 or 1) at ${where(source, index)}`);
      }
      index++;
      return character === "1";
    },
  };
}

/** The last curve's handle reflected through the pen, for S and T; the pen itself if there wasn't one. */
const mirror = (handle: [number, number] | null, x: number, y: number): [number, number] =>
  handle ? [2 * x - handle[0], 2 * y - handle[1]] : [x, y];

const startsNumber = (character: string | undefined) => character !== undefined && /[\d+\-.]/.test(character);

/** Parse path data into absolute M, L, C, Q, A and Z commands. Throws on malformed input. */
export function parsePath(source: string): PathCommand[] {
  const reader = pathReader(source);
  const commands: PathCommand[] = [];
  if (reader.peek() === undefined) return commands;
  if (!/[mM]/.test(reader.peek()!)) throw new Error("Invalid path data: a path must start with M");

  // The pen, where the current shape started, and the last curve's second handle, for S and T.
  let [x, y, startX, startY] = [0, 0, 0, 0];
  let cubic: [number, number] | null = null;
  let quadratic: [number, number] | null = null;
  let command = "";

  for (;;) {
    const next = reader.peek();
    if (next === undefined) break;
    if (/[a-zA-Z]/.test(next)) {
      if (PARAMETERS[next.toLowerCase()] === undefined) {
        throw new Error(`Invalid path data: unexpected "${next}" at ${where(source, reader.index)}`);
      }
      command = next;
      reader.advance();
    } else if (!startsNumber(next)) {
      throw new Error(`Invalid path data: unexpected "${next}" at ${where(source, reader.index)}`);
    } else if (command === "" || command.toLowerCase() === "z") {
      throw new Error(`Invalid path data: expected a command at ${where(source, reader.index)}`);
    } else if (command === "M") {
      // Pairs after a move are lines.
      command = "L";
    } else if (command === "m") {
      command = "l";
    }

    const relative = command === command.toLowerCase();
    const [offsetX, offsetY] = relative ? [x, y] : [0, 0];
    const kind = command.toUpperCase();
    const read = () => reader.number().value;
    const point = (): [number, number] => [read() + offsetX, read() + offsetY];

    switch (kind) {
      case "M": {
        [x, y] = point();
        [startX, startY] = [x, y];
        commands.push({ type: "M", x, y });
        break;
      }
      case "L":
        [x, y] = point();
        commands.push({ type: "L", x, y });
        break;
      case "H":
        x = read() + offsetX;
        commands.push({ type: "L", x, y });
        break;
      case "V":
        y = read() + offsetY;
        commands.push({ type: "L", x, y });
        break;
      case "C":
      case "S": {
        const [x1, y1]: [number, number] = kind === "C" ? point() : mirror(cubic, x, y);
        const [x2, y2] = point();
        [x, y] = point();
        commands.push({ type: "C", x1, y1, x2, y2, x, y });
        cubic = [x2, y2];
        quadratic = null;
        continue;
      }
      case "Q":
      case "T": {
        const [x1, y1]: [number, number] = kind === "Q" ? point() : mirror(quadratic, x, y);
        [x, y] = point();
        commands.push({ type: "Q", x1, y1, x, y });
        quadratic = [x1, y1];
        cubic = null;
        continue;
      }
      case "A": {
        const [rx, ry, rotation] = [read(), read(), read()];
        const [largeArc, sweep] = [reader.flag(), reader.flag()];
        [x, y] = point();
        commands.push({ type: "A", rx, ry, rotation, largeArc, sweep, x, y });
        break;
      }
      default:
        [x, y] = [startX, startY];
        commands.push({ type: "Z" });
    }
    cubic = null;
    quadratic = null;
  }

  return commands;
}
