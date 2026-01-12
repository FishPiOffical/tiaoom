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
  getPlaneDir?: (color: AeroplaneColor) => 'tl' | 'tr' | 'br' | 'bl';
  border?: boolean | { l?: boolean; r?: boolean; t?: boolean; b?: boolean };
  showPlane?: boolean;
  canTakeOff?: boolean;
  /** inner corner second color */
  colorB?: AeroplaneColor;
  /** track tile */
  orientation?: 'h' | 'v';
  dots?: 1 | 2;
}

export const DEFAULT_TILES: TilePlacement[] = [
  // 4x4 hangars
  { id: 'hangar-y', kind: 'hangar', row: 0, col: 0, rowSpan: 4, colSpan: 4, color: 'y', planeDir: 'br' },
  { id: 'hangar-b', kind: 'hangar', row: 0, col: GRID_SIZE - 4, rowSpan: 4, colSpan: 4, color: 'b', planeDir: 'bl' },
  { id: 'hangar-r', kind: 'hangar', row: GRID_SIZE - 4, col: GRID_SIZE - 4, rowSpan: 4, colSpan: 4, color: 'r', planeDir: 'tl' },
  { id: 'hangar-g', kind: 'hangar', row: GRID_SIZE - 4, col: 0, rowSpan: 4, colSpan: 4, color: 'g', planeDir: 'tr' },

  // center 3x3
  { id: 'center', kind: 'center', row: 7, col: 7, rowSpan: 3, colSpan: 3 },

  // 起飞角（1x2 带飞机的三角形）在四个停机坪内侧角落
  { id: 'y0', kind: 'corner', row: 4, col: 0, rowSpan: 2, colSpan: 1, color: 'y', dir: 'tl', planeDir: 'tl', canTakeOff: true, showPlane: true },
  { id: 'b0', kind: 'corner', row: 0, col: GRID_SIZE - 5, rowSpan: 2, colSpan: 1, color: 'b', dir: 'tr', planeDir: 'tl', canTakeOff: true, showPlane: true },
  { id: 'r0', kind: 'corner', row: GRID_SIZE - 6, col: GRID_SIZE - 1, rowSpan: 2, colSpan: 1, color: 'r', dir: 'br', planeDir: 'tl', canTakeOff: true, showPlane: true },
  { id: 'g0', kind: 'corner', row: GRID_SIZE - 2, col: 4, rowSpan: 2, colSpan: 1, color: 'g', dir: 'bl', planeDir: 'tl', canTakeOff: true, showPlane: true },

  // 黄色棋格
  { id: 'y1', kind: 'track', row: 4, col: 2, rowSpan: 2, colSpan: 1, color: 'y' },
  { id: 'y2', kind: 'track', row: 3, col: 4, rowSpan: 1, colSpan: 2, color: 'y', planeDir: 'tr' },
  { id: 'y3', kind: 'track', row: 0, col: 7, rowSpan: 2, colSpan: 1, color: 'y' },
  { id: 'y4', kind: 'corner', row: 0, col: GRID_SIZE - 6, rowSpan: 2, colSpan: 1, color: 'y', dir: 'bl' },
  { id: 'y5', kind: 'corner', row: 4, col: GRID_SIZE - 5, rowSpan: 2, colSpan: 1, color: 'y', dir: 'br', planeDir: 'bl', showPlane: true, getPlaneDir: (color) => color === 'y' ? 'bl' : 'br' },
  { id: 'y6', kind: 'track', row: 6, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'y', planeDir: 'bl' },
  { id: 'y7', kind: 'track', row: GRID_SIZE - 7, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'y', planeDir: 'bl' },
  { id: 'y8', kind: 'corner', row: GRID_SIZE - 6, col: GRID_SIZE - 5, rowSpan: 2, colSpan: 1, color: 'y', dir: 'tr', getPlaneDir: (color) => color === 'y' ? 'tl' : 'tr' },
  { id: 'y9', kind: 'corner', row: GRID_SIZE - 2, col: GRID_SIZE - 6, rowSpan: 2, colSpan: 1, color: 'y', dir: 'tl' },
  { id: 'y10', kind: 'track', row: GRID_SIZE - 2, col: 7, rowSpan: 2, colSpan: 1, color: 'y', planeDir: 'tl' },
  { id: 'y11', kind: 'track', row: GRID_SIZE - 4, col: 4, rowSpan: 1, colSpan: 2, color: 'y', planeDir: 'tr' },
  { id: 'y12', kind: 'track', row: GRID_SIZE - 6, col: 2, rowSpan: 2, colSpan: 1, color: 'y', planeDir: 'tl' },
  { id: 'y13', kind: 'track', row: 8, col: 0, rowSpan: 1, colSpan: 2, color: 'y', border: { l: true }, getPlaneDir: (color) => color === 'y' ? 'br' : 'tr' },
  { id: 'y14', kind: 'track', row: 8, col: 2, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y15', kind: 'track', row: 8, col: 3, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y16', kind: 'track', row: 8, col: 4, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y17', kind: 'track', row: 8, col: 5, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y18', kind: 'track', row: 8, col: 6, rowSpan: 1, colSpan: 1, color: 'y', border: false },
  { id: 'y19', kind: 'track', row: 8, col: 7, rowSpan: 1, colSpan: 1, color: 'y', planeDir: 'br', border: false, showPlane: true },
  { id: 'yline', kind: 'runway', row: 8, col: GRID_SIZE - 5, rowSpan: 1, colSpan: 1, color: 'y', dir: 'bl' },

  // 蓝色棋格
  { id: 'b1', kind: 'track', row: 2, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 2, color: 'b', planeDir: 'bl' },
  { id: 'b2', kind: 'track', row: 4, col: GRID_SIZE - 4, rowSpan: 2, colSpan: 1, color: 'b' },
  { id: 'b3', kind: 'track', row: 7, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'b', planeDir: 'bl' },
  { id: 'b4', kind: 'corner', row: GRID_SIZE - 6, col: GRID_SIZE - 2, rowSpan: 2, colSpan: 1, color: 'b', dir: 'tl' },
  { id: 'b5', kind: 'corner', row: GRID_SIZE - 6, col: GRID_SIZE - 6, rowSpan: 2, colSpan: 1, color: 'b', dir: 'bl', planeDir: 'bl', showPlane: true, getPlaneDir: (color) => color === 'b' ? 'bl' : 'br' },
  { id: 'b6', kind: 'track', row: GRID_SIZE - 2, col: GRID_SIZE - 7, rowSpan: 2, colSpan: 1, color: 'b', planeDir: 'tl' },
  { id: 'b7', kind: 'track', row: GRID_SIZE - 2, col: 6, rowSpan: 2, colSpan: 1, color: 'b', planeDir: 'tl' },
  { id: 'b8', kind: 'corner', row: GRID_SIZE - 6, col: 5, rowSpan: 2, colSpan: 1, color: 'b', dir: 'br', getPlaneDir: (color) => color === 'b' ? 'tl' : 'tr' },
  { id: 'b9', kind: 'corner', row: GRID_SIZE - 6, col: 1, rowSpan: 2, colSpan: 1, color: 'b', dir: 'tr' },
  { id: 'b10', kind: 'track', row: 7, col: 0, rowSpan: 1, colSpan: 2, color: 'b', planeDir: 'tr' },
  { id: 'b11', kind: 'track', row: 4, col: 3, rowSpan: 2, colSpan: 1, color: 'b' },
  { id: 'b12', kind: 'track', row: 2, col: 4, rowSpan: 1, colSpan: 2, color: 'b', planeDir: 'tr' },
  { id: 'b13', kind: 'track', row: 0, col: 8, rowSpan: 2, colSpan: 1, color: 'b', border: { t: true }, getPlaneDir: (color) => color === 'b' ? 'bl' : 'br' },
  { id: 'b14', kind: 'track', row: 2, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false, planeDir: 'bl' },
  { id: 'b15', kind: 'track', row: 3, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false, planeDir: 'bl' },
  { id: 'b16', kind: 'track', row: 4, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false, planeDir: 'bl' },
  { id: 'b17', kind: 'track', row: 5, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false, planeDir: 'bl' },
  { id: 'b18', kind: 'track', row: 6, col: 8, rowSpan: 1, colSpan: 1, color: 'b', border: false, planeDir: 'bl' },
  { id: 'b19', kind: 'track', row: 7, col: 8, rowSpan: 1, colSpan: 1, color: 'b', planeDir: 'bl', border: false, showPlane: true },
  { id: 'bline', kind: 'runway', row: GRID_SIZE - 5, col: 8, rowSpan: 1, colSpan: 1, color: 'b', dir: 'tl' },

  // 红色棋格
  { id: 'r1', kind: 'track', row: GRID_SIZE - 6, col: GRID_SIZE - 3, rowSpan: 2, colSpan: 1, color: 'r', planeDir: 'tl' },
  { id: 'r2', kind: 'track', row: GRID_SIZE - 4, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 2, color: 'r', planeDir: 'bl' },
  { id: 'r3', kind: 'track', row: GRID_SIZE - 2, col: GRID_SIZE - 8, rowSpan: 2, colSpan: 1, color: 'r', planeDir: 'tl' },
  { id: 'r4', kind: 'corner', row: GRID_SIZE - 2, col: 5, rowSpan: 2, colSpan: 1, color: 'r', dir: 'tr' },
  { id: 'r5', kind: 'corner', row: GRID_SIZE - 6, col: 4, rowSpan: 2, colSpan: 1, color: 'r', dir: 'tl', planeDir: 'bl', showPlane: true, getPlaneDir: (color) => color === 'r' ? 'bl' : 'br' },
  { id: 'r6', kind: 'track', row: GRID_SIZE - 7, col: 0, rowSpan: 1, colSpan: 2, color: 'r', planeDir: 'tr' },
  { id: 'r7', kind: 'track', row: 6, col: 0, rowSpan: 1, colSpan: 2, color: 'r', planeDir: 'tr' },
  { id: 'r8', kind: 'corner', row: 4, col: 4, rowSpan: 2, colSpan: 1, color: 'r', dir: 'bl', getPlaneDir: (color) => color === 'r' ? 'tl' : 'tr' },
  { id: 'r9', kind: 'corner', row: 0, col: 5, rowSpan: 2, colSpan: 1, color: 'r', dir: 'br' },
  { id: 'r10', kind: 'track', row: 0, col: GRID_SIZE - 8, rowSpan: 2, colSpan: 1, color: 'r' },
  { id: 'r11', kind: 'track', row: 3, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 2, color: 'r', planeDir: 'bl' },
  { id: 'r12', kind: 'track', row: 4, col: GRID_SIZE - 3, rowSpan: 2, colSpan: 1, color: 'r' },
  { id: 'r13', kind: 'track', row: 8, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'r', border: { r: true }, getPlaneDir: (color) => color === 'r' ? 'tl' : 'bl' },
  { id: 'r14', kind: 'track', row: 8, col: GRID_SIZE - 3, rowSpan: 1, colSpan: 1, color: 'r', border: false, planeDir: 'tl' },
  { id: 'r15', kind: 'track', row: 8, col: GRID_SIZE - 4, rowSpan: 1, colSpan: 1, color: 'r', border: false, planeDir: 'tl' },
  { id: 'r16', kind: 'track', row: 8, col: GRID_SIZE - 5, rowSpan: 1, colSpan: 1, color: 'r', border: false, planeDir: 'tl' },
  { id: 'r17', kind: 'track', row: 8, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 1, color: 'r', border: false, planeDir: 'tl' },
  { id: 'r18', kind: 'track', row: 8, col: GRID_SIZE - 7, rowSpan: 1, colSpan: 1, color: 'r', border: false, planeDir: 'tl' },
  { id: 'r19', kind: 'track', row: 8, col: GRID_SIZE - 8, rowSpan: 1, colSpan: 1, color: 'r', planeDir: 'tl', border: false, showPlane: true },
  { id: 'rline', kind: 'runway', row: 8, col: 4, rowSpan: 1, colSpan: 1, color: 'r', dir: 'tr' },

  // 绿色棋格
  { id: 'g1', kind: 'track', row: GRID_SIZE - 3, col: 4, rowSpan: 1, colSpan: 2, color: 'g', planeDir: 'tr' },
  { id: 'g2', kind: 'track', row: GRID_SIZE - 6, col: 3, rowSpan: 2, colSpan: 1, color: 'g', planeDir: 'tl' },
  { id: 'g3', kind: 'track', row: GRID_SIZE - 8, col: 0, rowSpan: 1, colSpan: 2, color: 'g', planeDir: 'tr' },
  { id: 'g4', kind: 'corner', row: 4, col: 1, rowSpan: 2, colSpan: 1, color: 'g', dir: 'br' },
  { id: 'g5', kind: 'corner', row: 4, col: 5, rowSpan: 2, colSpan: 1, color: 'g', dir: 'tr', planeDir: 'bl', showPlane: true, getPlaneDir: (color) => color === 'g' ? 'bl' : 'br' },
  { id: 'g6', kind: 'track', row: 0, col: 6, rowSpan: 2, colSpan: 1, color: 'g' },
  { id: 'g7', kind: 'track', row: 0, col: GRID_SIZE - 7, rowSpan: 2, colSpan: 1, color: 'g' },
  { id: 'g8', kind: 'corner', row: 4, col: GRID_SIZE - 6, rowSpan: 2, colSpan: 1, color: 'g', dir: 'tl', getPlaneDir: (color) => color === 'g' ? 'tl' : 'tr' },
  { id: 'g9', kind: 'corner', row: 4, col: GRID_SIZE - 2, rowSpan: 2, colSpan: 1, color: 'g', dir: 'bl' },
  { id: 'g10', kind: 'track', row: GRID_SIZE - 8, col: GRID_SIZE - 2, rowSpan: 1, colSpan: 2, color: 'g', planeDir: 'bl' },
  { id: 'g11', kind: 'track', row: GRID_SIZE - 6, col: GRID_SIZE - 4, rowSpan: 2, colSpan: 1, color: 'g', planeDir: 'tl' },
  { id: 'g12', kind: 'track', row: GRID_SIZE - 3, col: GRID_SIZE - 6, rowSpan: 1, colSpan: 2, color: 'g', planeDir: 'bl' },
  { id: 'g13', kind: 'track', row: GRID_SIZE - 2, col: GRID_SIZE - 9, rowSpan: 2, colSpan: 1, color: 'g', border: { b: true }, getPlaneDir: (color) => color === 'g' ? 'tr' : 'tl' },
  { id: 'g14', kind: 'track', row: GRID_SIZE - 3, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false, planeDir: 'tr' },
  { id: 'g15', kind: 'track', row: GRID_SIZE - 4, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false, planeDir: 'tr' },
  { id: 'g16', kind: 'track', row: GRID_SIZE - 5, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false, planeDir: 'tr' },
  { id: 'g17', kind: 'track', row: GRID_SIZE - 6, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false, planeDir: 'tr' },
  { id: 'g18', kind: 'track', row: GRID_SIZE - 7, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', border: false, planeDir: 'tr' },
  { id: 'g19', kind: 'track', row: GRID_SIZE - 8, col: GRID_SIZE - 9, rowSpan: 1, colSpan: 1, color: 'g', planeDir: 'tr', border: false, showPlane: true },
  { id: 'gline', kind: 'runway', row: 4, col: 8, rowSpan: 1, colSpan: 1, color: 'g', dir: 'br' },
];

