export interface Hex {
    q: number;
    r: number;
    s: number;
    x: number;
    y: number;
    key: string;
}

export const HEX_SIZE = 10;

export const ZONES = [
  { fill: 'fill-warning', text: 'text-warning', border: 'border-warning', bg: 'bg-warning', name: 'warning' },
  { fill: 'fill-primary', text: 'text-primary', border: 'border-primary', bg: 'bg-primary', name: 'primary' },
  { fill: 'fill-secondary', text: 'text-secondary', border: 'border-secondary', bg: 'bg-secondary', name: 'secondary' },
  { fill: 'fill-error', text: 'text-error', border: 'border-error', bg: 'bg-error', name: 'error' },
  { fill: 'fill-info', text: 'text-info', border: 'border-info', bg: 'bg-info', name: 'info' },
  { fill: 'fill-accent', text: 'text-accent', border: 'border-accent', bg: 'bg-accent', name: 'accent' },
];

export function getZoneData(idx: number) {
    return ZONES[idx % ZONES.length];
}

export function formatTime(ms?: number) {
  if (ms === undefined || ms === null) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const hexes: Hex[] = [];
// Generate star board
for (let q = -8; q <= 8; q++) {
    for (let r = -8; r <= 8; r++) {
        const s = -q - r;
        if (Math.abs(s) > 8) continue;
        
        // Star = Union of two large triangles
        const inInv = q <= 4 && r <= 4 && s <= 4;
        const inUpr = q >= -4 && r >= -4 && s >= -4;
        
        if (inInv || inUpr) {
            const x = HEX_SIZE * Math.sqrt(3) * (q + r/2);
            const y = HEX_SIZE * 3/2 * r;
            hexes.push({ q, r, s, x, y, key: `${q},${r}` });
        }
    }
}

export { hexes };

export function getHexZoneIndex(q: number, r: number, s: number): number {
    if (Math.abs(q) <= 4 && Math.abs(r) <= 4 && Math.abs(s) <= 4) return -1;
    if (r > 4) return 0;
    if ((-q-r) < -4) return 1;
    if (q > 4) return 2;
    if (r < -4) return 3;
    if ((-q-r) > 4) return 4;
    if (q < -4) return 5;
    return -1;
}

export function getHex(key: string) {
    return hexes.find(h => h.key === key);
}

export interface Move {
    color: number; // 0-5
    path: { q: number, r: number }[];
    time: number;
}