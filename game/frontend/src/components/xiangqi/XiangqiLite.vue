<template>
  <section class="flex flex-col items-center justify-center p-2 py-4 overflow-hidden" ref="containerRef">
    <!-- Board -->
    <div class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto max-w-[99vw] max-h-[90vh]">
      <div class="relative" :style="{ width: scaledWidth + 'px', height: scaledHeight + 'px' }">
        <div
          class="relative xiangqi-board-lite"
          :style="{ transform: boardTransform }"
        >
        <!-- SVG Grid + last-move highlight -->
        <svg
          class="absolute inset-0 w-full h-full overflow-visible"
          style="overflow: visible"
          viewBox="0 0 360 405"
          preserveAspectRatio="none"
        >
          <rect x="0" y="0" width="360" height="180" fill="none" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
          <rect x="0" y="225" width="360" height="180" fill="none" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
          <line x1="0" y1="180" x2="0" y2="225" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
          <line x1="360" y1="180" x2="360" y2="225" stroke="currentColor" stroke-width="2" class="text-base-content/60" />

          <line x1="0" y1="0" x2="0" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          <line x1="360" y1="0" x2="360" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          <line v-for="c in 7" :key="'v-top-'+c" :x1="c*45" y1="0" :x2="c*45" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />

          <line x1="0" y1="225" x2="0" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          <line x1="360" y1="225" x2="360" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          <line v-for="c in 7" :key="'v-bot-'+c" :x1="c*45" y1="225" :x2="c*45" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />

          <line v-for="r in 5" :key="'h-top-'+r" x1="0" :y1="(r-1)*45" x2="360" :y2="(r-1)*45" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          <line v-for="r in 5" :key="'h-bot-'+r" x1="0" :y1="225+(r-1)*45" x2="360" :y2="225+(r-1)*45" stroke="currentColor" stroke-width="1" class="text-base-content/40" />

          <line x1="135" y1="0" x2="225" y2="90" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          <line x1="225" y1="0" x2="135" y2="90" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          <line x1="135" y1="315" x2="225" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          <line x1="225" y1="315" x2="135" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />

          <g v-if="lastMove" pointer-events="none">
            <circle
              :cx="svgX(lastMove.from.y)"
              :cy="svgY(lastMove.from.x)"
              r="22"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              class="text-base-content/25"
            />
            <circle
              :cx="svgX(lastMove.from.y)"
              :cy="svgY(lastMove.from.x)"
              r="22"
              fill="none"
              stroke="currentColor"
              stroke-width="5"
              stroke-dasharray="8 6"
              stroke-linecap="round"
              class="text-accent"
            />

            <circle
              :cx="svgX(lastMove.to.y)"
              :cy="svgY(lastMove.to.x)"
              r="22"
              fill="none"
              stroke="currentColor"
              stroke-width="8"
              class="text-base-content/25"
            />
            <circle
              :cx="svgX(lastMove.to.y)"
              :cy="svgY(lastMove.to.x)"
              r="22"
              fill="none"
              stroke="currentColor"
              stroke-width="5"
              stroke-linecap="round"
              class="text-warning"
            />
          </g>
        </svg>

        <!-- pieces grid -->
        <div class="relative" style="width: 360px; height: 405px;">
          <div
            v-for="r in 10"
            :key="'row'+r"
            class="absolute"
            :style="{ top: ((r-1) <= 4 ? (r-1)*45 : 225 + ((r-1)-5)*45) + 'px', left: 0, right: 0 }"
          >
            <div
              v-for="c in 9"
              :key="'cell'+c"
              class="absolute"
              :style="{ left: ((c-1)*45) + 'px', transform: 'translate(-50%, -50%)', width: '45px', height: '45px' }"
              @click="onCellClick(r-1, c-1)"
            >
              <button
                v-if="board && board[r-1]?.[c-1]"
                type="button"
                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base leading-none font-bold shadow-md transition z-10"
                :class="[
                  getPieceClasses(board[r-1][c-1]),
                  selected && selected.x === (r-1) && selected.y === (c-1) ? 'ring-2 ring-primary ring-offset-2' : ''
                ]"
                @click.stop.prevent="onCellClick(r-1, c-1)"
              >
                <span class="select-none" :class="{ 'rotate-180': rotateBoard }">{{ pieceText(board[r-1][c-1]) }}</span>
              </button>
            </div>
          </div>

          <!-- River text -->
          <div class="absolute left-0 right-0 text-center pointer-events-none select-none" style="top: 180px; height: 45px;">
            <div class="h-full flex items-center justify-between px-8 text-base-content/70 font-bold text-lg" :class="{ 'rotate-180': rotateBoard }">
              <span class="font-serif tracking-widest">{{ rotateBoard ? '汉界' : '楚河' }}</span>
              <span class="font-serif tracking-widest inline-block rotate-180">{{ rotateBoard ? '楚河' : '汉界' }}</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- Current turn legend (Othello-lite style) -->
    <div v-if="gameStatus === 'playing'" class="flex items-center justify-center gap-3 mt-2 -mb-2 text-sm">
      <div class="w-[1.4em] h-[1.4em] flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
        <span
          class="w-full h-full rounded-full"
          :class="currentPlayer?.attributes?.side === 'red'
            ? 'bg-red-600 border border-white/20 shadow-md'
            : 'bg-green-600 border border-white/20 shadow-md'"
        />
      </div>
      <b class="text-base-content">{{ currentPlayer?.name }}</b>
      <span class="opacity-70">·</span>
      <span class="opacity-80">{{ countdown }}s</span>
    </div>

    <div 
      v-if="isPlaying && showControl" class="fixed z-100 bg-base-300/60 top-0 left-0 w-full h-full flex flex-col items-center justify-center">
      <div v-if="isPlaying && roomPlayer.role === PlayerRole.player" class="group flex gap-2">
        <button class="btn btn-circle btn-soft btn-warning tooltip" 
          @click="requestDraw"
          :disabled="currentPlayer?.id !== roomPlayer.id"
          data-tip="请求和棋"
        >
          <Icon icon="mdi:handshake" />
        </button>
        <button class="btn btn-circle btn-soft btn-success tooltip" 
          @click="requestLose"
          :disabled="currentPlayer?.id !== roomPlayer.id"
          data-tip="认输"
        >
          <Icon icon="mdi:flag" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PlayerRole, type Room, type RoomPlayer } from 'tiaoom/client'
import type { GameCore } from '@/core/game'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useXiangqi } from './useXiangqi'
import hotkeys from 'hotkeys-js'

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  isPlaying,
  gameStatus,
  currentPlayer,
  board,
  selected,
  lastMove,
  countdown,
  trySelectOrMove,
  requestDraw,
  requestLose,
} = useXiangqi(props.game, props.roomPlayer)

const containerRef = ref<HTMLElement>()
const scale = ref(1)
const scaledWidth = computed(() => 360 * scale.value)
const scaledHeight = computed(() => 405 * scale.value)

const boardTransform = computed(() => {
  const s = scale.value
  // Keep the rotated board inside the (scaled) viewport.
  // Note: CSS transforms apply right-to-left, so this does: rotate -> translate -> scale.
  return rotateBoard.value
    ? `scale(${s}) translate(360px, 405px) rotate(180deg)`
    : `scale(${s})`
})

function recomputeScale() {
  // Fit the fixed 360x405 board into current viewport/container.
  const rect = containerRef.value?.getBoundingClientRect()
  const maxW = (rect?.width ?? window.innerWidth) * 0.98
  const maxH = (rect?.height ?? window.innerHeight) * 0.80
  const next = Math.min(1, maxW / 360, maxH / 405)
  scale.value = Math.max(0.5, next)
}

onMounted(() => {
  recomputeScale()
  window.addEventListener('resize', recomputeScale)

  // Optional: shrink the popup window height to content, like TetrisLite.
  const rect = containerRef.value?.parentElement?.getBoundingClientRect()
  if (rect && rect.height < window.innerHeight) {
    window.resizeTo(window.innerWidth, rect.height)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', recomputeScale)
})

function onCellClick(x: number, y: number) {
  trySelectOrMove(x, y)
}

const showControl = ref(false);
hotkeys('esc', () => {
  if (props.roomPlayer.role == PlayerRole.watcher) return;
  showControl.value = !showControl.value;
});

function pieceText(p: string) {
  const side = p[0] === 'r' ? 'red' : 'green'
  const t = p[1]
  const mapRed: Record<string, string> = { R: '车', N: '马', B: '相', A: '士', K: '帅', C: '炮', P: '兵' }
  const mapGreen: Record<string, string> = { R: '車', N: '馬', B: '象', A: '仕', K: '将', C: '砲', P: '卒' }
  return side === 'red' ? (mapRed[t] || t) : (mapGreen[t] || t)
}

function getPieceClasses(p: string) {
  if (!p) return 'bg-transparent'
  const side = p[0] === 'r' ? 'red' : 'green'
  return side === 'red' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
}

const rotateBoard = computed(() => {
  if ((props.roomPlayer as any).role !== 'player') return false
  const side = (props.roomPlayer as any).attributes?.side
  return side === 'green'
})

function svgX(col: number) {
  return col * 45
}

function svgY(row: number) {
  return row <= 4 ? row * 45 : 225 + (row - 5) * 45
}

const emit = defineEmits<{
  (e: 'loaded'): void
}>()
onMounted(() => {
  emit("loaded");
})
</script>

<style scoped>
.xiangqi-board-lite {
  width: 360px;
  height: 405px;
  font-family: var(--font-kai);
  -webkit-user-select: none;
  user-select: none;
  transform-origin: top left;
}
</style>
