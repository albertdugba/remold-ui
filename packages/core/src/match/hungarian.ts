export interface Assignment {
  from: number;
  to: number;
  score: number;
}

interface SolveOptions {
  cost: Float64Array;
  rows: number;
  cols: number;
}

const UNASSIGNED = -1;

const transpose = (table: readonly (readonly number[])[], columns: number) =>
  Array.from({ length: columns }, (_, column) => table.map((row) => row[column]!));

function invert(rowOf: ArrayLike<number>, rows: number): Int32Array {
  const columnOf = new Int32Array(rows).fill(UNASSIGNED);

  Array.from(rowOf).forEach((row, column) => {
    if (row >= 0) columnOf[row] = column;
  });

  return columnOf;
}

export function hungarian(cost: readonly (readonly number[])[]): number[] {
  const rows = cost.length;
  const cols = rows > 0 ? cost[0]!.length : 0;

  if (rows === 0 || cols === 0) return new Array<number>(rows).fill(UNASSIGNED);

  if (cost.some((row) => row.length !== cols)) {
    throw new RangeError("hungarian: every row needs the same number of columns");
  }

  if (rows > cols) return Array.from(invert(hungarian(transpose(cost, cols)), rows));

  const flat = new Float64Array(rows * cols);

  for (const [index, row] of cost.entries()) flat.set(row, index * cols);

  return Array.from(solve({ cost: flat, rows, cols }));
}

interface Solver {
  cost: Float64Array;
  cols: number;
  rowPotential: Float64Array;
  columnPotential: Float64Array;
  rowAtColumn: Int32Array;
  previousColumn: Int32Array;
  minimumSlack: Float64Array;
  visitedColumns: Uint8Array;
  smallestSlack: number;
}

function createSolver({ cost, rows, cols }: SolveOptions): Solver {
  return {
    cost,
    cols,
    rowPotential: new Float64Array(rows + 1),
    columnPotential: new Float64Array(cols + 1),
    rowAtColumn: new Int32Array(cols + 1),
    previousColumn: new Int32Array(cols + 1),
    minimumSlack: new Float64Array(cols + 1),
    visitedColumns: new Uint8Array(cols + 1),
    smallestSlack: Infinity,
  };
}

function relaxFrom(solver: Solver, currentColumn: number): number {
  const { cost, cols, rowPotential, columnPotential, rowAtColumn, previousColumn, minimumSlack, visitedColumns } = solver;
  const currentRow = rowAtColumn[currentColumn]!;
  const rowOffset = (currentRow - 1) * cols - 1;
  let nextColumn = 0;

  solver.smallestSlack = Infinity;

  for (let column = 1; column <= cols; column++) {
    if (visitedColumns[column]) continue;

    const reducedCost = cost[rowOffset + column]! - rowPotential[currentRow]! - columnPotential[column]!;

    if (reducedCost < minimumSlack[column]!) {
      minimumSlack[column] = reducedCost;
      previousColumn[column] = currentColumn;
    }

    if (minimumSlack[column]! < solver.smallestSlack) {
      solver.smallestSlack = minimumSlack[column]!;
      nextColumn = column;
    }
  }

  return nextColumn;
}

function shiftPotentials(solver: Solver) {
  const { cols, rowPotential, columnPotential, rowAtColumn, minimumSlack, visitedColumns, smallestSlack } = solver;

  for (let column = 0; column <= cols; column++) {
    if (visitedColumns[column]) {
      rowPotential[rowAtColumn[column]!]! += smallestSlack;
      columnPotential[column]! -= smallestSlack;
    } else {
      minimumSlack[column]! -= smallestSlack;
    }
  }
}

function augment(solver: Solver, endColumn: number) {
  const { rowAtColumn, previousColumn } = solver;
  let column = endColumn;

  do {
    const preceding = previousColumn[column]!;

    rowAtColumn[column] = rowAtColumn[preceding]!;
    column = preceding;
  } while (column !== 0);
}

function placeRow(solver: Solver, row: number) {
  solver.rowAtColumn[0] = row;
  solver.minimumSlack.fill(Infinity);
  solver.visitedColumns.fill(0);

  let currentColumn = 0;

  do {
    solver.visitedColumns[currentColumn] = 1;
    currentColumn = relaxFrom(solver, currentColumn);
    shiftPotentials(solver);
  } while (solver.rowAtColumn[currentColumn] !== 0);

  augment(solver, currentColumn);
}

function columnsByRow({ rowAtColumn, cols }: Solver, rows: number): Int32Array {
  const columnByRow = new Int32Array(rows).fill(UNASSIGNED);

  for (let column = 1; column <= cols; column++) {
    const row = rowAtColumn[column]!;

    if (row > 0) columnByRow[row - 1] = column - 1;
  }

  return columnByRow;
}

export function solve(options: SolveOptions): Int32Array {
  const solver = createSolver(options);

  for (let row = 1; row <= options.rows; row++) placeRow(solver, row);

  return columnsByRow(solver, options.rows);
}

const costOf = (score: number, threshold: number) => 1 - Math.max(score, threshold);

function keepConfident(columnOf: ArrayLike<number>, scoreAt: (from: number, to: number) => number, threshold: number): Assignment[] {
  return Array.from(columnOf).flatMap((to, from) => {
    if (to < 0) return [];

    const score = scoreAt(from, to);

    return score >= threshold ? [{ from, to, score }] : [];
  });
}

export function assign(similarity: readonly (readonly number[])[], threshold: number): Assignment[] {
  const cost = similarity.map((row) => row.map((score) => costOf(score, threshold)));

  return keepConfident(hungarian(cost), (from, to) => similarity[from]![to]!, threshold);
}

function flatColumns(similarity: Float64Array, rows: number, cols: number, threshold: number): Int32Array {
  const cost = new Float64Array(rows * cols);

  if (rows <= cols) {
    for (let index = 0; index < cost.length; index++) cost[index] = costOf(similarity[index]!, threshold);

    return solve({ cost, rows, cols });
  }

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      cost[column * rows + row] = costOf(similarity[row * cols + column]!, threshold);
    }
  }

  return invert(solve({ cost, rows: cols, cols: rows }), rows);
}

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
  if (rows === 0 || cols === 0) return [];

  const columnOf = flatColumns(similarity, rows, cols, threshold);

  return keepConfident(columnOf, (from, to) => similarity[from * cols + to]!, threshold);
}
