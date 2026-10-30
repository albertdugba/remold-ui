/** Solves the minimum-cost one-to-one assignment problem. */

/**
 * Minimum-cost assignment. Returns, for each row, the column it was given, or -1 when there are
 * more rows than columns and the row was left out. Runs in O(n² · m) for n rows and m columns.
 */
export function hungarian(cost: readonly (readonly number[])[]): number[] {
  const rows = cost.length;
  const cols = rows > 0 ? cost[0]!.length : 0;

  if (rows === 0 || cols === 0) return new Array<number>(rows).fill(-1);

  for (const row of cost) {
    if (row.length !== cols) throw new RangeError("hungarian: every row needs the same number of columns");
  }

  if (rows > cols) {
    const transposed = Array.from({ length: cols }, (_, columnIndex) => cost.map((row) => row[columnIndex]!));
    const colToRow = hungarian(transposed);
    const result = new Array<number>(rows).fill(-1);

    colToRow.forEach((rowIndex, columnIndex) => {
      if (rowIndex >= 0) result[rowIndex] = columnIndex;
    });
    return result;
  }

  const flatCosts = new Float64Array(rows * cols);

  cost.forEach((row, rowIndex) => {
    flatCosts.set(row, rowIndex * cols);
  });
  return Array.from(solve({ cost: flatCosts, rows, cols }));
}

/**
 * The solver itself, on a flat row-major table with `rows ≤ cols`, for callers that solve many
 * small tables and want to skip building nested arrays. Returns each row's column.
 */
interface SolveOptions {
  cost: Float64Array;
  rows: number;
  cols: number;
}

export function solve({ cost, rows, cols }: SolveOptions): Int32Array {
  const rowPotential = new Float64Array(rows + 1);
  const columnPotential = new Float64Array(cols + 1);
  const rowAtColumn = new Int32Array(cols + 1);
  const previousColumn = new Int32Array(cols + 1);
  const minimumSlack = new Float64Array(cols + 1);
  const visitedColumns = new Uint8Array(cols + 1);

  for (let row = 1; row <= rows; row++) {
    rowAtColumn[0] = row;
    let currentColumn = 0;

    minimumSlack.fill(Infinity);
    visitedColumns.fill(0);
    do {
      visitedColumns[currentColumn] = 1;
      const currentRow = rowAtColumn[currentColumn]!;
      const rowOffset = (currentRow - 1) * cols - 1;
      let smallestSlack = Infinity;
      let nextColumn = 0;

      for (let column = 1; column <= cols; column++) {
        if (visitedColumns[column]) continue;

        const reducedCost = cost[rowOffset + column]! - rowPotential[currentRow]! - columnPotential[column]!;

        if (reducedCost < minimumSlack[column]!) {
          minimumSlack[column] = reducedCost;
          previousColumn[column] = currentColumn;
        }
        if (minimumSlack[column]! < smallestSlack) {
          smallestSlack = minimumSlack[column]!;
          nextColumn = column;
        }
      }
      for (let column = 0; column <= cols; column++) {
        if (visitedColumns[column]) {
          rowPotential[rowAtColumn[column]!]! += smallestSlack;
          columnPotential[column]! -= smallestSlack;
        } else {
          minimumSlack[column]! -= smallestSlack;
        }
      }
      currentColumn = nextColumn;
    } while (rowAtColumn[currentColumn] !== 0);
    do {
      const precedingColumn = previousColumn[currentColumn]!;

      rowAtColumn[currentColumn] = rowAtColumn[precedingColumn]!;
      currentColumn = precedingColumn;
    } while (currentColumn !== 0);
  }

  const columnByRow = new Int32Array(rows).fill(-1);

  for (let column = 1; column <= cols; column++) {
    const row = rowAtColumn[column]!;

    if (row > 0) columnByRow[row - 1] = column - 1;
  }
  return columnByRow;
}

export interface Assignment {
  from: number;
  to: number;
  score: number;
}

/**
 * Pair rows with columns to maximise total similarity (each 0 to 1). Pairs scoring below
 * `threshold` are dropped: they would be guesses, and leaving something unmatched is better
 * than matching it wrongly.
 */
export function assign(similarity: readonly (readonly number[])[], threshold: number): Assignment[] {
  const cost = similarity.map((row) => row.map((score) => 1 - Math.max(score, threshold)));
  const pairs: Assignment[] = [];

  hungarian(cost).forEach((to, from) => {
    if (to < 0) return;
    const score = similarity[from]![to]!;
    if (score >= threshold) pairs.push({ from, to, score });
  });
  return pairs;
}

/**
 * `assign` on a flat row-major table of similarities, `rows` × `cols`. Gives exactly the same
 * pairs as `assign`, without building nested arrays: the matcher calls it once per pass.
 */
export function assignFlat({
  similarity,
  rows,
  cols,
  threshold,
}: {
  similarity: Float64Array;
  rows: number;
  cols: number;
  threshold: number;
}): Assignment[] {
  const pairs: Assignment[] = [];

  if (rows === 0 || cols === 0) return pairs;

  let columnOf: Int32Array;

  if (rows <= cols) {
    const cost = new Float64Array(rows * cols);

    for (let index = 0; index < cost.length; index++) cost[index] = 1 - Math.max(similarity[index]!, threshold);
    columnOf = solve({ cost, rows, cols });
  } else {
    const cost = new Float64Array(rows * cols);

    for (let row = 0; row < rows; row++)
      for (let column = 0; column < cols; column++) cost[column * rows + row] = 1 - Math.max(similarity[row * cols + column]!, threshold);
    const rowOf = solve({ cost, rows: cols, cols: rows });

    columnOf = new Int32Array(rows).fill(-1);
    rowOf.forEach((rowIndex, columnIndex) => {
      if (rowIndex >= 0) columnOf[rowIndex] = columnIndex;
    });
  }
  for (let from = 0; from < rows; from++) {
    const to = columnOf[from]!;

    if (to < 0) continue;

    const score = similarity[from * cols + to]!;

    if (score >= threshold) pairs.push({ from, to, score });
  }
  return pairs;
}
