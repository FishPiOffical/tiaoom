import { GRID_SIZE, type AeroplaneColor } from './board';

export type TileKind = 'hangar' | 'track' | 'corner' | 'runway' | 'center';

export interface TilePlacement {
  id: string;
  kind: TileKind;
  row: number; // 0-based
  col: number; // 0-based
  rowSpan: number;
  colSpan: number;
  color?: AeroplaneColor;
  /** for corners */
  dir?: 'tl' | 'tr' | 'br' | 'bl';
  planeDir?: 'tl' | 'tr' | 'br' | 'bl';
  border?: boolean | { l?: boolean; r?: boolean; t?: boolean; b?: boolean };
  canTakeOff?: boolean;
  /** inner corner second color */
  colorB?: AeroplaneColor;
  /** track tile */
  orientation?: 'h' | 'v';
  dots?: 1 | 2;
}

export const DEFAULT_TILES: TilePlacement[] = [
  // 4x4 hangars
  { id: 'hangar-y', kind: 'hangar', row: 0, col: 0, rowSpan: 4, colSpan: 4, color: 'y' },
  { id: 'hangar-b', kind: 'hangar', row: 0, col: GRID_SIZE - 4, rowSpan: 4, colSpan: 4, color: 'b', planeDir: 'bl' },
  { id: 'hangar-r', kind: 'hangar', row: GRID_SIZE - 4, col: GRID_SIZE - 4, rowSpan: 4, colSpan: 4, color: 'r', planeDir: 'tl' },
  { id: 'hangar-g', kind: 'hangar', row: GRID_SIZE - 4, col: 0, rowSpan: 4, colSpan: 4, color: 'g', planeDir: 'tr' },

  // center 3x3
  { id: 'center', kind: 'center', row: 7, col: 7, rowSpan: 3, colSpan: 3 },

  // 起飞角（1x2 带飞机的三角形）在四个停机坪内侧角落
  { id: 'y0', kind: 'corner', row: 4, col: 0, rowSpan: 2, colSpan: 1, color: 'y', dir: 'tl', planeDir: 'tl', canTakeOff: true },
  { id: 'b0', kind: 'corner', row: 0, col: GRID_SIZE - 5, rowSpan: 2, colSpan: 1, color: 'b', dir: 'tr', planeDir: 'tl', canTakeOff: true },
  { id: 'r0', kind: 'corner', row: GRID_SIZE - 6, col: GRID_SIZE - 1, rowSpan: 2, colSpan: 1, color: 'r', dir: 'br', planeDir: 'tl', canTakeOff: true },
  { id: 'g0', kind: 'corner', row: GRID_SIZE - 2, col: 4, rowSpan: 2, colSpan: 1, color: 'g', dir: 'bl', planeDir: 'tl', canTakeOff: true },

  // 黄色棋格
  { id: 'y1', kind: 'track', row: 4, col: 2, rowSpan: 2, colSpan: 1, color: 'y' },
  { id: 'y2', kind: 'track', row: 3, col: 4, rowSpan: 1, colSpan: 2, color: 'y' },
  { id: 'y3', kind: 'track', row: 0, col: 7, rowSpan: 2, colSpan: 1, color: 'y' },
  { id: 'y4', kind: 'corner', row: 0, col: GRID_SIZE - 6, rowSpan: 2, colSpan: 1, color: 'y', dir: 'bl' },
  { id: 'y5', kind: 'corner', row: 4, col: GRID_SIZE - 5, rowSpan: 2, colSpan: 1, color: 'y', dir: 'br', planeDir: 'bl' },
  { id: 'y6', kind: 'track', row: 6, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'y' },
  { id: 'y7', kind: 'track', row: GRID_SIZE - 7, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'y', dir: 'br' },
  { id: 'y8', kind: 'corner', row: GRID_SIZE - 6, col: GRID_SIZE - 5, rowSpan: 2, colSpan: 1, color: 'y', dir: 'tr' },
  { id: 'y9', kind: 'corner', row: GRID_SIZE - 2, col: GRID_SIZE - 6, rowSpan: 2, colSpan: 1, color: 'y', dir: 'tl' },
  { id: 'y10', kind: 'track', row: GRID_SIZE - 2, col: 7, rowSpan: 2, colSpan: 1, color: 'y' },
  { id: 'y11', kind: 'track', row: GRID_SIZE - 4, col: 4, rowSpan: 1, colSpan: 2, color: 'y' },
  { id: 'y12', kind: 'track', row: GRID_SIZE - 6, col: 2, rowSpan: 2, colSpan: 1, color: 'y' },
  { id: 'y13', kind: 'track', row: 8, col: 0, rowSpan: 1, colSpan: 2, color: 'y', border: { l: true } },
  { id: 'y14', kind: 'track', row: 8, col: 2, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y15', kind: 'track', row: 8, col: 3, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y16', kind: 'track', row: 8, col: 4, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y17', kind: 'track', row: 8, col: 5, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y18', kind: 'track', row: 8, col: 6, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y19', kind: 'track', row: 8, col: 7, rowSpan: 1, colSpan: 1, color: 'y', planeDir: 'br', border: false },
  { id: 'yline', kind: 'runway', row: 8, col: GRID_SIZE - 5, rowSpan: 1, colSpan: 1, color: 'y', dir: 'bl' },

  // 蓝色棋格
  { id: 'b1', kind: 'track', row: 2, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 2, color: 'b' },
  { id: 'b2', kind: 'track', row: 4, col: GRID_SIZE - 4, rowSpan: 2, colSpan: 1, color: 'b' },
  { id: 'b3', kind: 'track', row: 7, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'b' },
  { id: 'b4', kind: 'corner', row: GRID_SIZE - 6, col: GRID_SIZE - 2, rowSpan: 2, colSpan: 1, color: 'b', dir: 'tl' },
  { id: 'b5', kind: 'corner', row: GRID_SIZE - 6, col: GRID_SIZE - 6, rowSpan: 2, colSpan: 1, color: 'b', dir: 'bl', planeDir: 'bl' },
  { id: 'b6', kind: 'track', row: GRID_SIZE - 2, col: GRID_SIZE - 7, rowSpan: 2, colSpan: 1, color: 'b' },
  { id: 'b7', kind: 'track', row: GRID_SIZE - 2, col: 6, rowSpan: 2, colSpan: 1, color: 'b' },
  { id: 'b8', kind: 'corner', row: GRID_SIZE - 6, col: 5, rowSpan: 2, colSpan: 1, color: 'b', dir: 'br' },
  { id: 'b9', kind: 'corner', row: GRID_SIZE - 6, col: 1, rowSpan: 2, colSpan: 1, color: 'b', dir: 'tr' },
  { id: 'b10', kind: 'track', row: 7, col: 0, rowSpan: 1, colSpan: 2, color: 'b' },
  { id: 'b11', kind: 'track', row: 4, col: 3, rowSpan: 2, colSpan: 1, color: 'b' },
  { id: 'b12', kind: 'track', row: 2, col: 4, rowSpan: 1, colSpan: 2, color: 'b' },
  { id: 'b13', kind: 'track', row: 0, col: 8, rowSpan: 2, colSpan: 1, color: 'b', border: { t: true } },
  { id: 'b14', kind: 'track', row: 2, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false },
  { id: 'b15', kind: 'track', row: 3, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false },
  { id: 'b16', kind: 'track', row: 4, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false },
  { id: 'b17', kind: 'track', row: 5, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false },
  { id: 'b18', kind: 'track', row: 6, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false },
  { id: 'b19', kind: 'track', row: 7, col: 8, rowSpan: 1, colSpan: 1, color: 'b', planeDir: 'bl', border: false },
  { id: 'bline', kind: 'runway', row: GRID_SIZE - 5, col: 8, rowSpan: 1, colSpan: 1, color: 'b', dir: 'tl' },

  // 红色棋格
  { id: 'r1', kind: 'track', row: GRID_SIZE - 6, col: GRID_SIZE - 3, rowSpan: 2, colSpan: 1, color: 'r' },
  { id: 'r2', kind: 'track', row: GRID_SIZE - 4, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 2, color: 'r' },
  { id: 'r3', kind: 'track', row: GRID_SIZE - 2, col: GRID_SIZE - 8, rowSpan: 2, colSpan: 1, color: 'r' },
  { id: 'r4', kind: 'corner', row: GRID_SIZE - 2, col: 5, rowSpan: 2, colSpan: 1, color: 'r', dir: 'tr' },
  { id: 'r5', kind: 'corner', row: GRID_SIZE - 6, col: 4, rowSpan: 2, colSpan: 1, color: 'r', dir: 'tl', planeDir: 'bl' },
  { id: 'r6', kind: 'track', row: GRID_SIZE - 7, col: 0, rowSpan: 1, colSpan: 2, color: 'r' },
  { id: 'r7', kind: 'track', row: 6, col: 0, rowSpan: 1, colSpan: 2, color: 'r' },
  { id: 'r8', kind: 'corner', row: 4, col: 4, rowSpan: 2, colSpan: 1, color: 'r', dir: 'bl' },
  { id: 'r9', kind: 'corner', row: 0, col: 5, rowSpan: 2, colSpan: 1, color: 'r', dir: 'br' },
  { id: 'r10', kind: 'track', row: 0, col: GRID_SIZE - 8, rowSpan: 2, colSpan: 1, color: 'r' },
  { id: 'r11', kind: 'track', row: 3, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 2, color: 'r' },
  { id: 'r12', kind: 'track', row: 4, col: GRID_SIZE - 3, rowSpan: 2, colSpan: 1, color: 'r' },
  { id: 'r13', kind: 'track', row: 8, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'r', border: { r: true } },
  { id: 'r14', kind: 'track', row: 8, col: GRID_SIZE - 3, rowSpan: 1, colSpan: 1, color: 'r', border: false },
  { id: 'r15', kind: 'track', row: 8, col: GRID_SIZE - 4, rowSpan: 1, colSpan: 1, color: 'r', border: false },
  { id: 'r16', kind: 'track', row: 8, col: GRID_SIZE - 5, rowSpan: 1, colSpan: 1, color: 'r', border: false },
  { id: 'r17', kind: 'track', row: 8, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 1, color: 'r', border: false },
  { id: 'r18', kind: 'track', row: 8, col: GRID_SIZE - 7, rowSpan: 1, colSpan: 1, color: 'r', border: false },
  { id: 'r19', kind: 'track', row: 8, col: GRID_SIZE - 8, rowSpan: 1, colSpan: 1, color: 'r', planeDir: 'tl', border: false },
  { id: 'rline', kind: 'runway', row: 8, col: 4, rowSpan: 1, colSpan: 1, color: 'r', dir: 'tr' },

  // 绿色棋格
  { id: 'g1', kind: 'track', row: GRID_SIZE - 3, col: 4, rowSpan: 1, colSpan: 2, color: 'g' },
  { id: 'g2', kind: 'track', row: GRID_SIZE - 6, col: 3, rowSpan: 2, colSpan: 1, color: 'g' },
  { id: 'g3', kind: 'track', row: GRID_SIZE - 8, col: 0, rowSpan: 1, colSpan: 2, color: 'g' },
  { id: 'g4', kind: 'corner', row: 4, col: 1, rowSpan: 2, colSpan: 1, color: 'g', dir: 'br' },
  { id: 'g5', kind: 'corner', row: 4, col: 5, rowSpan: 2, colSpan: 1, color: 'g', dir: 'tr', planeDir: 'bl' },
  { id: 'g6', kind: 'track', row: 0, col: 6, rowSpan: 2, colSpan: 1, color: 'g' },
  { id: 'g7', kind: 'track', row: 0, col: GRID_SIZE - 7, rowSpan: 2, colSpan: 1, color: 'g' },
  { id: 'g8', kind: 'corner', row: 4, col: GRID_SIZE - 6, rowSpan: 2, colSpan: 1, color: 'g', dir: 'tl' },
  { id: 'g9', kind: 'corner', row: 4, col: GRID_SIZE - 2, rowSpan: 2, colSpan: 1, color: 'g', dir: 'bl' },
  { id: 'g10', kind: 'track', row: GRID_SIZE - 8, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'g' },
  { id: 'g11', kind: 'track', row: GRID_SIZE - 6, col: GRID_SIZE - 4, rowSpan: 2, colSpan: 1, color: 'g' },
  { id: 'g12', kind: 'track', row: GRID_SIZE - 3, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 2, color: 'g' },
  { id: 'g13', kind: 'track', row: GRID_SIZE - 2, col: GRID_SIZE - 9, rowSpan: 2, colSpan: 1, color: 'g', border: { b: true } },
  { id: 'g14', kind: 'track', row: GRID_SIZE - 3, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false },
  { id: 'g15', kind: 'track', row: GRID_SIZE - 4, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false },
  { id: 'g16', kind: 'track', row: GRID_SIZE - 5, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false },
  { id: 'g17', kind: 'track', row: GRID_SIZE - 6, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false },
  { id: 'g18', kind: 'track', row: GRID_SIZE - 7, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false },
  { id: 'g19', kind: 'track', row: GRID_SIZE - 8, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', planeDir: 'tr', border: false },
  { id: 'gline', kind: 'runway', row: 4, col: 8, rowSpan: 1, colSpan: 1, color: 'g', dir: 'br' },
];

