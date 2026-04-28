<template>
  <canvas
    ref="canvas"
    class="rounded-xl border-2 shadow-lg select-none block"
    :class="clickable ? 'border-primary/30 cursor-pointer' : 'border-base-300'"
    @click="clickable ? handleClick($event) : undefined"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  ROWS, COLS, ANIM_DURATION,
  clearAnimations,
  type Pos, type ClearAnimation,
} from './useLinkLink';

const props = defineProps<{
  board: number[][] | undefined;
  selected: Pos | null;
  animKey: string;       // playerId，用于从 clearAnimations 查找动画
  clickable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', r: number, c: number): void;
}>();

// ─── 常量 ────────────────────────────────────────────────────────────────────
const CELL = 48;
const PAD  = 28;
const CW   = COLS * CELL + PAD * 2;   // 440
const CH   = ROWS * CELL + PAD * 2;   // 344

const EMOJIS: Record<number, string> = {
   1:'🐶',  2:'🐱',  3:'🐭',  4:'🐹',  5:'🐰',  6:'🦊',  7:'🐻',  8:'🐼',
   9:'🐨', 10:'🐯', 11:'🦁', 12:'🐮', 13:'🐷', 14:'🐸', 15:'🐵', 16:'🐔',
  17:'🐧', 18:'🐦', 19:'🦆', 20:'🦉', 21:'🦇', 22:'🐺', 23:'🐗', 24:'🐴',
};

// ─── Canvas ref & rAF ─────────────────────────────────────────────────────────
const canvas = ref<HTMLCanvasElement | null>(null);
let rafId = 0;

// ─── DPR 初始化 ───────────────────────────────────────────────────────────────
function initCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  c.width  = CW * dpr;
  c.height = CH * dpr;
  c.style.maxWidth    = '100%';
  c.style.aspectRatio = `${CW} / ${CH}`;
  c.getContext('2d')!.scale(dpr, dpr);
}

// ─── 绘制辅助 ────────────────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function posXY(pos: Pos): [number, number] {
  return [PAD + pos.c * CELL + CELL / 2, PAD + pos.r * CELL + CELL / 2];
}

// ─── 消除连线动画 ─────────────────────────────────────────────────────────────
function drawAnimPath(ctx: CanvasRenderingContext2D, anim: ClearAnimation) {
  const elapsed  = Date.now() - anim.startTime;
  const progress = Math.min(elapsed / ANIM_DURATION, 1);
  const pts = anim.path.map(posXY);

  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i+1][0] - pts[i][0], pts[i+1][1] - pts[i][1]);
    segs.push(d);
    total += d;
  }

  let remaining = total * progress;

  ctx.save();
  ctx.shadowColor = 'rgba(99,102,241,0.6)';
  ctx.shadowBlur  = 10;
  ctx.strokeStyle = 'rgba(99,102,241,0.95)';
  ctx.lineWidth   = 3.5;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < segs.length; i++) {
    if (remaining <= 0) break;
    if (remaining >= segs[i]) {
      ctx.lineTo(pts[i+1][0], pts[i+1][1]);
      remaining -= segs[i];
    } else {
      const t = remaining / segs[i];
      ctx.lineTo(
        pts[i][0] + (pts[i+1][0] - pts[i][0]) * t,
        pts[i][1] + (pts[i+1][1] - pts[i][1]) * t,
      );
      remaining = 0;
    }
  }
  ctx.stroke();

  const dotAlpha = Math.min(progress * 3, 1);
  ctx.fillStyle = `rgba(99,102,241,${dotAlpha})`;
  for (const pt of [pts[0], pts[pts.length - 1]]) {
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── 绘制棋盘 ─────────────────────────────────────────────────────────────────
function drawBoard(anim: ClearAnimation | null) {
  const c = canvas.value;
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;

  const { board, selected } = props;

  ctx.clearRect(0, 0, CW, CH);
  ctx.shadowBlur = 0;

  // 底板
  rrect(ctx, PAD - 6, PAD - 6, COLS * CELL + 12, ROWS * CELL + 12, 10);
  ctx.fillStyle = 'rgba(128,128,128,0.07)';
  ctx.fill();

  if (!board?.length) {
    ctx.fillStyle = 'rgba(128,128,128,0.12)';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        rrect(ctx, PAD + c * CELL + 3, PAD + r * CELL + 3, CELL - 6, CELL - 6, 7);
        ctx.fill();
      }
    }
    return;
  }

  const now = Date.now();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const val    = board[r]?.[c] ?? 0;
      const x      = PAD + c * CELL;
      const y      = PAD + r * CELL;
      const cx     = x + CELL / 2;
      const cy     = y + CELL / 2;
      const isSel  = selected?.r === r && selected?.c === c;
      const isAEnd = anim && ((anim.a.r === r && anim.a.c === c) || (anim.b.r === r && anim.b.c === c));

      rrect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 7);

      if (val === 0) {
        ctx.fillStyle = 'rgba(128,128,128,0.07)';
        ctx.fill();
      } else if (isSel) {
        ctx.fillStyle = 'rgba(99,102,241,0.18)';
        ctx.fill();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();
        ctx.shadowColor = 'rgba(99,102,241,0.45)';
        ctx.shadowBlur  = 10;
        rrect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 7);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.restore();
      } else if (isAEnd && anim) {
        const t = Math.min((now - anim.startTime) / ANIM_DURATION, 1);
        ctx.fillStyle = `rgba(34,197,94,${0.08 + 0.28 * (1 - t)})`;
        ctx.fill();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth   = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle   = 'rgba(255,255,255,0.78)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(128,128,128,0.22)';
        ctx.lineWidth   = 1;
        ctx.stroke();
      }

      if (val !== 0) {
        ctx.font         = `${Math.round(CELL * 0.52)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur   = 0;
        ctx.fillStyle    = '#111';
        ctx.fillText(EMOJIS[val] ?? String(val), cx, cy + 1);
      }
    }
  }

  if (anim && now - anim.startTime <= ANIM_DURATION + 200) {
    drawAnimPath(ctx, anim);
  }
}

// ─── 渲染循环 ─────────────────────────────────────────────────────────────────
function renderFrame() {
  const now = Date.now();
  const anim = clearAnimations.get(props.animKey) ?? null;
  if (anim && now - anim.startTime > ANIM_DURATION + 400) {
    clearAnimations.delete(props.animKey);
  }
  drawBoard(anim);
  rafId = requestAnimationFrame(renderFrame);
}

// ─── 点击处理 ─────────────────────────────────────────────────────────────────
function handleClick(e: MouseEvent) {
  const c = canvas.value;
  if (!c) return;
  const rect = c.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CW / rect.width);
  const y = (e.clientY - rect.top)  * (CH / rect.height);
  const col = Math.floor((x - PAD) / CELL);
  const row = Math.floor((y - PAD) / CELL);
  if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
    emit('select', row, col);
  }
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────
onMounted(() => {
  if (canvas.value) initCanvas(canvas.value);
  rafId = requestAnimationFrame(renderFrame);
});

onUnmounted(() => cancelAnimationFrame(rafId));
</script>
