const LEAF = 8;
const AXES = 3;
const BOX_SIZE = AXES * 2;

export interface KdTree {
  nearest(x: number, y: number, z: number, k: number, maxD2: number, ids: Int32Array, d2: Float64Array): number;
}

interface SelectOptions {
  order: Int32Array;
  coordinates: Float64Array;
  start: number;
  end: number;
  target: number;
}

function medianOfThree(first: number, middle: number, last: number): number {
  if (first < middle) return middle < last ? middle : Math.max(first, last);

  return first < last ? first : Math.max(middle, last);
}

function swap(order: Int32Array, left: number, right: number) {
  const held = order[left]!;

  order[left] = order[right]!;
  order[right] = held;
}

export function select({ order, coordinates, start, end, target }: SelectOptions): void {
  const valueAt = (index: number) => coordinates[order[index]!]!;

  while (end > start) {
    const pivot = medianOfThree(valueAt(start), valueAt((start + end) >> 1), valueAt(end));
    let left = start;
    let right = end;

    while (left <= right) {
      while (valueAt(left) < pivot) left++;

      while (valueAt(right) > pivot) right--;

      if (left <= right) {
        swap(order, left, right);
        left++;
        right--;
      }
    }

    if (target <= right) end = right;
    else if (target >= left) start = left;
    else return;
  }
}

const boxGap = (low: number, high: number, coordinate: number) => {
  const below = low - coordinate;

  return below > 0 ? below : Math.max(coordinate - high, 0);
};

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
  const boxes = new Float64Array(order.length * BOX_SIZE);
  const coordinates = [xs, ys, zs] as const;

  const measure = (start: number, end: number, middle: number) => {
    let widestAxis = 0;
    let widest = -1;

    for (let axis = 0; axis < AXES; axis++) {
      const values = coordinates[axis]!;
      let min = Infinity;
      let max = -Infinity;

      for (let index = start; index < end; index++) {
        const value = values[order[index]!]!;

        if (value < min) min = value;
        if (value > max) max = value;
      }

      boxes[middle * BOX_SIZE + axis] = min;
      boxes[middle * BOX_SIZE + AXES + axis] = max;

      if (max - min > widest) {
        widest = max - min;
        widestAxis = axis;
      }
    }

    return widestAxis;
  };

  const build = (start: number, end: number): void => {
    if (end - start <= LEAF) return;

    const middle = (start + end) >> 1;
    const axis = measure(start, end, middle);

    select({ order, coordinates: coordinates[axis]!, start, end: end - 1, target: middle });
    axes[middle] = axis;
    build(start, middle);
    build(middle + 1, end);
  };

  build(0, order.length);

  return {
    nearest(x, y, z, k, maxD2, ids, d2) {
      const query = [x, y, z] as const;
      let count = 0;

      const reach = () => (count < k ? maxD2 : d2[k - 1]!);

      const beatsWorst = (distance: number, id: number) =>
        distance < d2[k - 1]! || (distance === d2[k - 1]! && id < ids[k - 1]!);

      const ranksAfter = (slot: number, distance: number, id: number) =>
        d2[slot]! > distance || (d2[slot] === distance && ids[slot]! > id);

      const consider = (id: number) => {
        const dx = xs[id]! - x;
        const dy = ys[id]! - y;
        const dz = zs[id]! - z;
        const distance = dx * dx + dy * dy + dz * dz;

        if (distance > maxD2) return;

        if (count === k && !beatsWorst(distance, id)) return;

        let slot = count < k ? count++ : k - 1;

        while (slot > 0 && ranksAfter(slot - 1, distance, id)) {
          d2[slot] = d2[slot - 1]!;
          ids[slot] = ids[slot - 1]!;
          slot--;
        }

        d2[slot] = distance;
        ids[slot] = id;
      };

      const distanceToBox = (middle: number) => {
        const offset = middle * BOX_SIZE;
        let total = 0;

        for (let axis = 0; axis < AXES; axis++) {
          const gap = boxGap(boxes[offset + axis]!, boxes[offset + AXES + axis]!, query[axis]!);

          total += gap * gap;
        }

        return total;
      };

      const search = (start: number, end: number): void => {
        if (end - start <= LEAF) {
          for (let index = start; index < end; index++) consider(order[index]!);

          return;
        }

        const middle = (start + end) >> 1;

        if (distanceToBox(middle) > reach()) return;

        const id = order[middle]!;
        const axis = axes[middle]!;

        consider(id);

        const fromPlane = query[axis]! - coordinates[axis]![id]!;
        const planeDistance = fromPlane * fromPlane;

        if (fromPlane < 0) {
          search(start, middle);

          if (planeDistance <= reach()) search(middle + 1, end);
        } else {
          search(middle + 1, end);

          if (planeDistance <= reach()) search(start, middle);
        }
      };

      if (k > 0 && order.length > 0) search(0, order.length);

      return count;
    },
  };
}
