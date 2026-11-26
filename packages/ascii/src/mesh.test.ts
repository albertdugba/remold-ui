import { describe, expect, it } from "vitest";
import { FRAMED_RADIUS, framed, parseStl, sphere, torus, torusKnot } from "./mesh";

const textStl = `solid wedge
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 10 0 0
vertex 0 10 0
endloop
endfacet
endsolid wedge`;

function binaryStl(triangles: number[][]): ArrayBuffer {
  const buffer = new ArrayBuffer(84 + triangles.length * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((corners, triangle) => corners.forEach((value, index) => view.setFloat32(84 + triangle * 50 + 12 + index * 4, value, true)));
  return buffer;
}

const reach = (positions: Float32Array) => {
  let farthest = 0;
  for (let at = 0; at < positions.length; at += 3) farthest = Math.max(farthest, Math.hypot(positions[at] ?? 0, positions[at + 1] ?? 0, positions[at + 2] ?? 0));
  return farthest;
};

describe("parseStl", () => {
  it("reads text STL", () => {
    const mesh = parseStl(new TextEncoder().encode(textStl).buffer as ArrayBuffer);
    expect(mesh.positions).toHaveLength(9);
    expect(mesh.indices).toEqual(Uint32Array.from([0, 1, 2]));
  });

  it("reads binary STL", () => {
    const mesh = parseStl(binaryStl([[0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 0, 0, 0, 1, 0, 0, 0, 1]]));
    expect(mesh.positions).toHaveLength(18);
  });

  it("stands a printing model's z axis up", () => {
    const mesh = parseStl(binaryStl([[0, 0, 0, 1, 0, 0, 0, 1, 0]]));
    expect(mesh.normals[1]).toBeCloseTo(1);
  });

  it("frames any model to the same radius", () => {
    expect(reach(parseStl(new TextEncoder().encode(textStl).buffer as ArrayBuffer).positions)).toBeCloseTo(FRAMED_RADIUS);
  });

  it("explains a file it can't read", () => {
    expect(() => parseStl(new TextEncoder().encode("not a model").buffer as ArrayBuffer)).toThrow(/no triangles/);
  });
});

describe("torusKnot", () => {
  it("is a closed tube of triangles that fits the frame", () => {
    const mesh = torusKnot({ along: 40, around: 8 });
    expect(mesh.indices.length).toBe(40 * 8 * 6);
    expect(mesh.positions.length).toBe(mesh.normals.length);
    expect(reach(mesh.positions)).toBeCloseTo(FRAMED_RADIUS);
  });
});

describe("framed", () => {
  it("centres the mesh on the origin", () => {
    const mesh = framed({ positions: Float32Array.from([10, 10, 10, 12, 10, 10]), normals: new Float32Array(6), indices: new Uint32Array() });
    expect([...mesh.positions]).toEqual([-1, 0, 0, 1, 0, 0]);
  });
});

describe("sphere and torus", () => {
  it("are closed grids of triangles framed to the same radius", () => {
    for (const mesh of [sphere({ rings: 8, segments: 12 }), torus({ rings: 8, segments: 12 })]) {
      expect(mesh.indices.length).toBe(8 * 12 * 6);
      expect(reach(mesh.positions)).toBeCloseTo(FRAMED_RADIUS);
    }
  });

  it("point a sphere's normals straight out", () => {
    const mesh = sphere({ rings: 4, segments: 4 });
    expect(Math.hypot(mesh.normals[0] ?? 0, mesh.normals[1] ?? 0, mesh.normals[2] ?? 0)).toBeCloseTo(1);
    expect(mesh.normals[1]).toBeCloseTo(1);
  });
});
