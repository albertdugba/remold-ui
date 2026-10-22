import { describe, expect, it } from "vitest";
import { kdTree } from "./kdtree";

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The answer by checking every point: nearest first, ties by id. */
function bruteForce(xs: Float64Array, ys: Float64Array, zs: Float64Array, ids: number[], q: number[], k: number, maxD2: number) {
  return ids
    .map((id) => ({ id, d: (xs[id]! - q[0]!) ** 2 + (ys[id]! - q[1]!) ** 2 + (zs[id]! - q[2]!) ** 2 }))
    .filter((p) => p.d <= maxD2)
    .sort((p, q) => p.d - q.d || p.id - q.id)
    .slice(0, k);
}

function query(tree: ReturnType<typeof kdTree>, q: number[], k: number, maxD2 = Infinity) {
  const ids = new Int32Array(k);
  const d2 = new Float64Array(k);
  const count = tree.nearest(q[0]!, q[1]!, q[2]!, k, maxD2, ids, d2);
  return Array.from({ length: count }, (_, i) => ({ id: ids[i]!, d: d2[i]! }));
}

describe("kdTree", () => {
  it("finds exactly the same neighbours as checking every point", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rand = random(seed);
      const size = Math.floor(rand() * 400);
      const flat = rand() < 0.5;
      // Coarse coordinates, so plenty of exact ties and duplicates.
      const coord = () => Math.round(rand() * 20);
      const xs = Float64Array.from({ length: size }, coord);
      const ys = Float64Array.from({ length: size }, coord);
      const zs = Float64Array.from({ length: size }, () => (flat ? 0 : coord()));
      // A subset of ids, to check the tree only ever returns what it was built from.
      const ids = Array.from({ length: size }, (_, i) => i).filter(() => rand() < 0.8);
      const tree = kdTree({ x: xs, y: ys, z: zs, ids });
      for (let n = 0; n < 30; n++) {
        // Queries inside the cloud and far outside it.
        const spread = rand() < 0.3 ? 200 : 20;
        const q = [rand() * spread - spread / 4, rand() * spread - spread / 4, flat ? 0 : rand() * 20];
        const k = 1 + Math.floor(rand() * 12);
        const maxD2 = rand() < 0.3 ? rand() * 50 : Infinity;
        expect(query(tree, q, k, maxD2), `seed ${seed}`).toEqual(bruteForce(xs, ys, zs, ids, q, k, maxD2));
      }
    }
  });

  it("handles an empty tree, k of 0, and k bigger than the tree", () => {
    const xs = Float64Array.of(0, 1);
    const zeros = new Float64Array(2);
    expect(query(kdTree({ x: xs, y: zeros, z: zeros, ids: [] }), [0, 0, 0], 3)).toEqual([]);
    const tree = kdTree({ x: xs, y: zeros, z: zeros, ids: [0, 1] });
    expect(query(tree, [0, 0, 0], 0)).toEqual([]);
    expect(query(tree, [0, 0, 0], 5).map((p) => p.id)).toEqual([0, 1]);
  });

  it("stays correct when every point is in the same place", () => {
    const size = 5000;
    const same = new Float64Array(size).fill(3);
    const tree = kdTree({ x: same, y: same, z: same, ids: Array.from({ length: size }, (_, i) => i) });
    expect(query(tree, [3, 3, 3], 4)).toEqual([0, 1, 2, 3].map((id) => ({ id, d: 0 })));
  });
});
