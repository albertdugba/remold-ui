export type PathCommand =
  | { type: "M"; x: number; y: number }
  | { type: "L"; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | {
      type: "A";
      rx: number;
      ry: number;
      rotation: number;
      largeArc: boolean;
      sweep: boolean;
      x: number;
      y: number;
    }
  | { type: "Z" };

type Handle = [number, number];

interface Pen {
  x: number;
  y: number;
  startX: number;
  startY: number;
  cubic: Handle | null;
  quadratic: Handle | null;
}

interface Readers {
  read: () => number;
  readX: () => number;
  readY: () => number;
  point: () => Handle;
  flag: () => boolean;
}

interface Step {
  command: PathCommand;
  pen: Pen;
}

const PARAMETERS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const SEPARATOR = /[\s,]*/y;
const LETTER = /[a-zA-Z]/;
const NUMBER_START = /[\d+\-.]/;
const MOVE = /[mM]/;

const START: Pen = { x: 0, y: 0, startX: 0, startY: 0, cubic: null, quadratic: null };

const where = (source: string, at: number) => (at >= source.length ? "the end" : `position ${at}`);

const invalid = (message: string) => new Error(`Invalid path data: ${message}`);

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

    peek() {
      skip();

      return source[index];
    },

    advance() {
      index++;
    },

    number(): { value: number; text: string } {
      skip();
      NUMBER.lastIndex = index;

      const match = NUMBER.exec(source);

      if (!match) throw invalid(`expected a number at ${where(source, index)}`);

      index = NUMBER.lastIndex;

      return { value: Number(match[0]), text: match[0] };
    },

    flag(): boolean {
      skip();

      const character = source[index];

      if (character !== "0" && character !== "1") {
        throw invalid(`expected an arc flag (0 or 1) at ${where(source, index)}`);
      }

      index++;

      return character === "1";
    },
  };
}

type PathReader = ReturnType<typeof pathReader>;

const mirror = (handle: Handle | null, x: number, y: number): Handle =>
  handle ? [2 * x - handle[0], 2 * y - handle[1]] : [x, y];

const startsNumber = (character: string | undefined) => character !== undefined && NUMBER_START.test(character);

const moved = (pen: Pen, x: number, y: number): Pen => ({ ...pen, x, y, cubic: null, quadratic: null });

const line = (pen: Pen, x: number, y: number): Step => ({ command: { type: "L", x, y }, pen: moved(pen, x, y) });

const HANDLERS: Record<string, (pen: Pen, readers: Readers) => Step> = {
  M: (pen, { point }) => {
    const [x, y] = point();

    return { command: { type: "M", x, y }, pen: { ...moved(pen, x, y), startX: x, startY: y } };
  },

  L: (pen, { point }) => line(pen, ...point()),

  H: (pen, { readX }) => line(pen, readX(), pen.y),

  V: (pen, { readY }) => line(pen, pen.x, readY()),

  C: (pen, { point }) => cubicStep(pen, point(), point(), point()),

  S: (pen, { point }) => cubicStep(pen, mirror(pen.cubic, pen.x, pen.y), point(), point()),

  Q: (pen, { point }) => quadraticStep(pen, point(), point()),

  T: (pen, { point }) => quadraticStep(pen, mirror(pen.quadratic, pen.x, pen.y), point()),

  A: (pen, { read, flag, point }) => {
    const [rx, ry, rotation] = [read(), read(), read()];
    const [largeArc, sweep] = [flag(), flag()];
    const [x, y] = point();

    return { command: { type: "A", rx, ry, rotation, largeArc, sweep, x, y }, pen: moved(pen, x, y) };
  },

  Z: (pen) => ({ command: { type: "Z" }, pen: moved(pen, pen.startX, pen.startY) }),
};

function cubicStep(pen: Pen, [x1, y1]: Handle, [x2, y2]: Handle, [x, y]: Handle): Step {
  return {
    command: { type: "C", x1, y1, x2, y2, x, y },
    pen: { ...moved(pen, x, y), cubic: [x2, y2] },
  };
}

function quadraticStep(pen: Pen, [x1, y1]: Handle, [x, y]: Handle): Step {
  return {
    command: { type: "Q", x1, y1, x, y },
    pen: { ...moved(pen, x, y), quadratic: [x1, y1] },
  };
}

function nextCommand(reader: PathReader, source: string, previous: string): string {
  const next = reader.peek()!;
  const unexpected = () => invalid(`unexpected "${next}" at ${where(source, reader.index)}`);

  if (LETTER.test(next)) {
    if (PARAMETERS[next.toLowerCase()] === undefined) throw unexpected();

    reader.advance();

    return next;
  }

  if (!startsNumber(next)) throw unexpected();

  if (previous === "" || previous.toLowerCase() === "z") {
    throw invalid(`expected a command at ${where(source, reader.index)}`);
  }

  if (previous === "M") return "L";

  if (previous === "m") return "l";

  return previous;
}

function readersFor(reader: PathReader, pen: Pen, relative: boolean): Readers {
  const read = () => reader.number().value;
  const offsetX = relative ? pen.x : 0;
  const offsetY = relative ? pen.y : 0;
  const readX = () => read() + offsetX;
  const readY = () => read() + offsetY;

  return { read, readX, readY, point: () => [readX(), readY()], flag: () => reader.flag() };
}

/** Parse path data into absolute M, L, C, Q, A and Z commands. */
export function parsePath(source: string): PathCommand[] {
  const reader = pathReader(source);
  const commands: PathCommand[] = [];

  if (reader.peek() === undefined) return commands;

  if (!MOVE.test(reader.peek()!)) throw invalid("a path must start with M");

  let pen = START;
  let command = "";

  while (reader.peek() !== undefined) {
    command = nextCommand(reader, source, command);

    const relative = command === command.toLowerCase();
    const step = HANDLERS[command.toUpperCase()]!(pen, readersFor(reader, pen, relative));

    commands.push(step.command);
    pen = step.pen;
  }

  return commands;
}
