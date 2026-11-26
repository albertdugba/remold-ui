/**
 * Triangle meshes for the renderer: a torus knot made here, or a model read from an STL file. Every
 * mesh is centred and scaled to the same radius so any model frames the same way.
 */

export interface Mesh {
  /** x, y, z for each vertex. */
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export interface TorusKnotOptions {
  /** How many times the knot winds round its axis. */
  turns?: number;
  /** How many times it loops through the hole. */
  loops?: number;
  /** The tube's thickness, against a knot about 3 across. */
  tube?: number;
  /** Rings along the knot. */
  along?: number;
  /** Vertices round each ring. */
  around?: number;
}

/** How far a framed mesh reaches from its centre, in world units. */
export const FRAMED_RADIUS = 1;
const STL_HEADER = 84;
const STL_TRIANGLE = 50;
const STL_COUNT_OFFSET = 80;
const STL_FIRST_VERTEX = 12;
const TANGENT_STEP = 0.0001;

type Vector = [number, number, number];

export function torusKnot({ turns = 2, loops = 3, tube = 0.62, along = 360, around = 32 }: TorusKnotOptions = {}): Mesh {
  const curve = (t: number): Vector => {
    const angle = t * Math.PI * 2;
    const radius = 2 + Math.cos(loops * angle);
    const phase = angle * turns;
    return [radius * Math.cos(phase) * 0.5, radius * Math.sin(phase) * 0.5, Math.sin(loops * angle) * 0.5];
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let step = 0; step <= along; step++) {
    const centre = curve(step / along);
    const ahead = curve(step / along + TANGENT_STEP);
    const tangent = normalize(subtract(ahead, centre));
    const across = normalize(cross(tangent, add(ahead, centre)));
    const up = cross(across, tangent);

    for (let side = 0; side <= around; side++) {
      const angle = (side / around) * Math.PI * 2;
      const normal = add(scale(up, Math.cos(angle)), scale(across, Math.sin(angle)));
      positions.push(...add(centre, scale(normal, tube * 0.5)));
      normals.push(...normal);
    }
  }

  for (let step = 0; step < along; step++) {
    for (let side = 0; side < around; side++) {
      const a = step * (around + 1) + side;
      const b = a + around + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return framed({ positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) });
}

export interface SurfaceOptions {
  /** Rings from pole to pole, or round the tube. */
  rings?: number;
  /** Segments round the upright axis. */
  segments?: number;
}

/** A sphere, its normals pointing straight out. */
export function sphere({ rings = 48, segments = 64 }: SurfaceOptions = {}): Mesh {
  return surface(rings, segments, (u, v) => {
    const polar = v * Math.PI;
    const around = u * Math.PI * 2;
    const point: Vector = [Math.sin(polar) * Math.cos(around), Math.cos(polar), Math.sin(polar) * Math.sin(around)];
    return { point, normal: point };
  });
}

/** A ring doughnut lying flat, `tube` thick against a radius of 1. */
export function torus({ rings = 40, segments = 96, tube = 0.4 }: SurfaceOptions & { tube?: number } = {}): Mesh {
  return surface(rings, segments, (u, v) => {
    const around = u * Math.PI * 2;
    const turn = v * Math.PI * 2;
    const centre: Vector = [Math.cos(around), 0, Math.sin(around)];
    const normal: Vector = [Math.cos(turn) * Math.cos(around), Math.sin(turn), Math.cos(turn) * Math.sin(around)];
    return { point: add(centre, scale(normal, tube)), normal };
  });
}

function surface(rings: number, segments: number, at: (u: number, v: number) => { point: Vector; normal: Vector }): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= rings; ring++) {
    for (let segment = 0; segment <= segments; segment++) {
      const { point, normal } = at(segment / segments, ring / rings);
      positions.push(...point);
      normals.push(...normalize(normal));
    }
  }

  for (let ring = 0; ring < rings; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const a = ring * (segments + 1) + segment;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return framed({ positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) });
}

/** Reads binary or text STL. Models made for printing stand on z, so z becomes up. */
export function parseStl(buffer: ArrayBuffer): Mesh {
  const view = new DataView(buffer);
  const declared = buffer.byteLength >= STL_HEADER ? view.getUint32(STL_COUNT_OFFSET, true) : 0;
  const binary = declared > 0 && STL_HEADER + declared * STL_TRIANGLE === buffer.byteLength;
  const corners: number[] = [];

  if (binary) {
    for (let triangle = 0; triangle < declared; triangle++) {
      const start = STL_HEADER + triangle * STL_TRIANGLE + STL_FIRST_VERTEX;
      for (let value = 0; value < 9; value++) corners.push(view.getFloat32(start + value * 4, true));
    }
  } else {
    const text = new TextDecoder().decode(buffer);
    for (const [, x, y, z] of text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) corners.push(Number(x), Number(y), Number(z));
  }

  if (corners.length < 9 || corners.length % 9 !== 0 || corners.some((value) => !Number.isFinite(value))) {
    throw new Error("ascii: that file has no triangles to read. Try a binary or text STL.");
  }

  const positions = new Float32Array(corners.length);
  const normals = new Float32Array(corners.length);

  for (let at = 0; at < corners.length; at += 3) {
    positions[at] = corners[at] ?? 0;
    positions[at + 1] = corners[at + 2] ?? 0;
    positions[at + 2] = -(corners[at + 1] ?? 0);
  }

  for (let at = 0; at < positions.length; at += 9) {
    const a = vectorAt(positions, at);
    const normal = normalize(cross(subtract(vectorAt(positions, at + 3), a), subtract(vectorAt(positions, at + 6), a)));
    for (let corner = 0; corner < 3; corner++) normals.set(normal, at + corner * 3);
  }

  return framed({ positions, normals, indices: Uint32Array.from({ length: positions.length / 3 }, (_, index) => index) });
}

/** The mesh moved to the origin and scaled so its farthest vertex is `FRAMED_RADIUS` away. */
export function framed(mesh: Mesh): Mesh {
  const { positions } = mesh;
  const low: Vector = [Infinity, Infinity, Infinity];
  const high: Vector = [-Infinity, -Infinity, -Infinity];

  for (let at = 0; at < positions.length; at += 3) {
    const point = vectorAt(positions, at);
    for (let axis = 0; axis < 3; axis++) {
      low[axis] = Math.min(low[axis] ?? 0, point[axis] ?? 0);
      high[axis] = Math.max(high[axis] ?? 0, point[axis] ?? 0);
    }
  }

  const centre = scale(add(low, high), 0.5);
  let reach = 0;

  for (let at = 0; at < positions.length; at += 3) reach = Math.max(reach, Math.hypot(...subtract(vectorAt(positions, at), centre)));

  const factor = reach > 0 ? FRAMED_RADIUS / reach : 1;
  const placed = positions.map((value, at) => (value - (centre[at % 3] ?? 0)) * factor);

  return { ...mesh, positions: placed };
}

const vectorAt = (values: Float32Array, at: number): Vector => [values[at] ?? 0, values[at + 1] ?? 0, values[at + 2] ?? 0];
const add = (a: Vector, b: Vector): Vector => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const subtract = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vector, by: number): Vector => [a[0] * by, a[1] * by, a[2] * by];
const cross = (a: Vector, b: Vector): Vector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function normalize(a: Vector): Vector {
  const length = Math.hypot(...a) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}
