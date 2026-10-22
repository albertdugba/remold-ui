/**
 * A k-d tree: points sorted into nested boxes, split on alternating directions, so "which points
 * are nearest to here?" only looks inside the few boxes that could hold the answer instead of
 * at every point. Built once, queried many times; it never changes after building.
 */

/** Ranges this small are searched directly; splitting them further costs more than it saves. */
const LEAF = 8;

export interface KdTree {
  /**
   * Find up to `k` points nearest to (x, y, z) with a squared distance of at most `maxD2`.
   * Writes their ids and squared distances into `ids` and `d2`, nearest first, and returns how
   * many it found. Ties are broken the same way every time.
   */
  nearest(x: number, y: number, z: number, k: number, maxD2: number, ids: Int32Array, d2: Float64Array): number;
}

/** Build a tree over the points with these `ids`, whose coordinates are `xs[id]`, `ys[id]`, `zs[id]`. */
export function kdTree({
  x: xs,
  y: ys,
  z: zs,
  ids,
}: {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  ids: ArrayLike<number>;
}): KdTree {
  const order = Int32Array.from(ids);
  const axes = new Uint8Array(order.length);
  const boxes = new Float64Array(order.length * 6);
  const coords = [xs, ys, zs] as const;

  const build = (start: number, end: number): void => {
    if (end - start <= LEAF) return;
    const middle = (start + end) >> 1;
    let axis = 0;
    let widest = -1;
    for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
      const coordinates = coords[axisIndex]!;
      let min = Infinity;
      let max = -Infinity;
      for (let pointIndex = start; pointIndex < end; pointIndex++) {
        const coordinate = coordinates[order[pointIndex]!]!;
        if (coordinate < min) min = coordinate;
        if (coordinate > max) max = coordinate;
      }
      boxes[middle * 6 + axisIndex] = min;
      boxes[middle * 6 + 3 + axisIndex] = max;
      if (max - min > widest) {
        widest = max - min;
        axis = axisIndex;
      }
    }
    select({ order, coordinates: coords[axis]!, start, end: end - 1, target: middle });
    axes[middle] = axis;
    build(start, middle);
    build(middle + 1, end);
  };
  build(0, order.length);

  return {
    nearest(x, y, z, k, maxD2, ids, d2) {
      let count = 0;
      const query = [x, y, z] as const;
      const maximumCandidateDistance = () => (count < k ? maxD2 : d2[k - 1]!);

      const consider = (pointId: number) => {
        const deltaX = xs[pointId]! - x;
        const deltaY = ys[pointId]! - y;
        const deltaZ = zs[pointId]! - z;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
        if (distanceSquared > maxD2) return;
        if (count === k && !(distanceSquared < d2[k - 1]! || (distanceSquared === d2[k - 1]! && pointId < ids[k - 1]!))) return;
        let insertionIndex = count < k ? count++ : k - 1;
        while (
          insertionIndex > 0 &&
          (d2[insertionIndex - 1]! > distanceSquared || (d2[insertionIndex - 1] === distanceSquared && ids[insertionIndex - 1]! > pointId))
        ) {
          d2[insertionIndex] = d2[insertionIndex - 1]!;
          ids[insertionIndex] = ids[insertionIndex - 1]!;
          insertionIndex--;
        }
        d2[insertionIndex] = distanceSquared;
        ids[insertionIndex] = pointId;
      };

      const search = (start: number, end: number): void => {
        if (end - start <= LEAF) {
          for (let pointIndex = start; pointIndex < end; pointIndex++) consider(order[pointIndex]!);
          return;
        }
        const middle = (start + end) >> 1;
        const boxOffset = middle * 6;
        let boxDistanceSquared = 0;
        for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
          const coordinate = query[axisIndex]!;
          const distanceBelow = boxes[boxOffset + axisIndex]! - coordinate;
          const distanceAbove = coordinate - boxes[boxOffset + 3 + axisIndex]!;
          const distanceToBox = distanceBelow > 0 ? distanceBelow : distanceAbove > 0 ? distanceAbove : 0;
          boxDistanceSquared += distanceToBox * distanceToBox;
        }
        if (boxDistanceSquared > maximumCandidateDistance()) return;
        const pointId = order[middle]!;
        const axis = axes[middle]!;
        consider(pointId);
        const distanceFromPlane = query[axis]! - coords[axis]![pointId]!;
        if (distanceFromPlane < 0) {
          search(start, middle);
          if (distanceFromPlane * distanceFromPlane <= maximumCandidateDistance()) search(middle + 1, end);
        } else {
          search(middle + 1, end);
          if (distanceFromPlane * distanceFromPlane <= maximumCandidateDistance()) search(start, middle);
        }
      };

      if (k > 0 && order.length > 0) search(0, order.length);
      return count;
    },
  };
}

/**
 * Reorder `order[lo..hi]` (inclusive) so position `nth` holds the value that would be there if
 * sorted by `c[id]`, with smaller-or-equal values before it and larger-or-equal after
 * (Hoare's quickselect, with a median-of-three pivot so sorted input stays fast).
 */
export function select({
  order,
  coordinates,
  start,
  end,
  target,
}: {
  order: Int32Array;
  coordinates: Float64Array;
  start: number;
  end: number;
  target: number;
}): void {
  while (end > start) {
    const middle = (start + end) >> 1;
    const firstValue = coordinates[order[start]!]!;
    const middleValue = coordinates[order[middle]!]!;
    const lastValue = coordinates[order[end]!]!;
    const pivot =
      firstValue < middleValue
        ? middleValue < lastValue
          ? middleValue
          : firstValue < lastValue
          ? lastValue
          : firstValue
        : firstValue < lastValue
        ? firstValue
        : middleValue < lastValue
        ? lastValue
        : middleValue;
    let left = start;
    let right = end;
    while (left <= right) {
      while (coordinates[order[left]!]! < pivot) left++;
      while (coordinates[order[right]!]! > pivot) right--;
      if (left <= right) {
        const pointId = order[left]!;
        order[left] = order[right]!;
        order[right] = pointId;
        left++;
        right--;
      }
    }
    if (target <= right) end = right;
    else if (target >= left) start = left;
    else return;
  }
}
