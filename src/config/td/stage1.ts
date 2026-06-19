/** Stage 1 · 红毯初登 — 8×11，单条连贯红毯（摄影棚 → 首映台） */

export type CellKind = "#" | "B" | "M" | "R";

export const STAGE1_ID = 1;
export const STAGE1_NAME = "红毯初登";
export const STAGE1_COLS = 8;
export const STAGE1_ROWS = 11;

/**
 * 红毯路径 · 顺序即怪物行走方向（右上 spawn → 左下折返 → 右下 goal）
 * 每步必须四向相邻。
 */
export const STAGE1_PATH: [number, number][] = [
  [6, 1],
  [5, 1],
  [4, 1],
  [4, 2],
  [4, 3],
  [3, 3],
  [2, 3],
  [1, 3],
  [1, 4],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
  [5, 5],
  [5, 6],
  [5, 7],
  [5, 8],
  [5, 9],
  [6, 9],
  [6, 10],
  [7, 10],
];

/** 开采格（灯位） */
const MINE_CELLS: [number, number][] = [
  [2, 2],
  [5, 3],
  [2, 7],
  [4, 8],
];

function pathAdjacent(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function buildStage1Grid(): string[] {
  const g: string[][] = Array.from({ length: STAGE1_ROWS }, () =>
    Array.from({ length: STAGE1_COLS }, () => "#"),
  );

  for (let y = 1; y <= 9; y++) {
    for (let x = 1; x <= 6; x++) {
      g[y]![x] = "B";
    }
  }
  for (let x = 1; x <= 5; x++) {
    g[10]![x] = "B";
  }

  for (const [x, y] of STAGE1_PATH) {
    g[y]![x] = "R";
  }

  for (let y = 1; y <= 9; y++) {
    g[y]![0] = "#";
    g[y]![7] = "#";
  }

  for (const [x, y] of MINE_CELLS) {
    if (g[y]?.[x] === "B") g[y]![x] = "M";
  }

  return g.map((row) => row.join(""));
}

export const STAGE1_GRID: string[] = buildStage1Grid();

export const STAGE1_SPAWN = STAGE1_PATH[0]!;
export const STAGE1_GOAL = STAGE1_PATH[STAGE1_PATH.length - 1]!;

if (process.env.NODE_ENV !== "production") {
  for (let i = 1; i < STAGE1_PATH.length; i++) {
    if (!pathAdjacent(STAGE1_PATH[i - 1]!, STAGE1_PATH[i]!)) {
      throw new Error(`Stage1 path broken between ${i - 1} and ${i}`);
    }
    const [x, y] = STAGE1_PATH[i]!;
    if (STAGE1_GRID[y]?.[x] !== "R") {
      throw new Error(`Stage1 path cell (${x},${y}) is not carpet`);
    }
  }
}

export function stage1Cell(x: number, y: number): CellKind {
  if (y < 0 || y >= STAGE1_ROWS || x < 0 || x >= STAGE1_COLS) return "#";
  return STAGE1_GRID[y]![x] as CellKind;
}

export function stage1Buildable(x: number, y: number): boolean {
  const c = stage1Cell(x, y);
  return c === "B" || c === "M";
}

export function stage1IsPath(x: number, y: number): boolean {
  return stage1Cell(x, y) === "R";
}
