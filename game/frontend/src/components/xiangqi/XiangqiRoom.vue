<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <!-- Board -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4">
      <div class="inline-block bg-base-200 border-2 border-base-content/20 p-8 rounded shadow-xl">
        <div class="relative xiangqi-board" :class="{ 'rotate-180': rotateBoard }">
          <!-- SVG Grid -->
          <svg class="absolute inset-0 w-full h-full" viewBox="0 0 360 405" preserveAspectRatio="none">
            <!-- Outer border (two separate boxes with river gap) -->
            <rect x="0" y="0" width="360" height="180" fill="none" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
            <rect x="0" y="225" width="360" height="180" fill="none" stroke="currentColor" stroke-width="2" class="text-base-content/60" />

            <!-- River gap border: connect outer edges at both sides -->
            <line x1="0" y1="180" x2="0" y2="225" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
            <line x1="360" y1="180" x2="360" y2="225" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
            
            <!-- Vertical lines (edge lines run full in each section, inner 7 lines break at river) -->
            <!-- Top section (rows 1-5, y=0-160) -->
            <line x1="0" y1="0" x2="0" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line x1="360" y1="0" x2="360" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line v-for="c in 7" :key="'v-top-'+c" :x1="c*45" y1="0" :x2="c*45" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            
            <!-- Bottom section (rows 6-10, y=200-360) -->
            <line x1="0" y1="225" x2="0" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line x1="360" y1="225" x2="360" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line v-for="c in 7" :key="'v-bot-'+c" :x1="c*45" y1="225" :x2="c*45" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            
            <!-- Horizontal lines (5 lines in top section, 4 inner lines in bottom section) -->
            <line v-for="r in 5" :key="'h-top-'+r" x1="0" :y1="(r-1)*45" x2="360" :y2="(r-1)*45" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line v-for="r in 5" :key="'h-bot-'+r" x1="0" :y1="225+(r-1)*45" x2="360" :y2="225+(r-1)*45" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            
            <!-- Palace diagonals (Green top: rows 0-2, at y=0-80) -->
            <line x1="135" y1="0" x2="225" y2="90" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line x1="225" y1="0" x2="135" y2="90" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            
            <!-- Palace diagonals (Red bottom: rows 7-9, at y=280-360) -->
            <line x1="135" y1="315" x2="225" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line x1="225" y1="315" x2="135" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
          </svg>

          <!-- Intersection marks and pieces grid -->
          <div class="relative" style="width: 360px; height: 405px;">
            <div v-for="r in 10" :key="'row'+r" class="absolute" :style="{ top: ((r-1) <= 4 ? (r-1)*45 : 225 + ((r-1)-5)*45) + 'px', left: 0, right: 0 }">
              <div v-for="c in 9" :key="'cell'+c" 
                   class="absolute" 
                   :style="{ left: ((c-1)*45) + 'px', transform: 'translate(-50%, -50%)', width: '45px', height: '45px' }"
                   @click="onCellClick(r-1, c-1)">
                <!-- Intersection marks (corner ticks at non-edge points) -->
                <svg v-if="shouldShowIntersectionMark(r-1, c-1)" class="absolute inset-0 pointer-events-none" width="40" height="40" viewBox="0 0 40 40">
                  <!-- 4 corners: 4 L-shaped right angles, vertex faces the center cross -->
                  <!-- Top-left (vertex near center, legs outward) -->
                  <line x1="16" y1="16" x2="16" y2="12" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="16" y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <!-- Top-right -->
                  <line x1="24" y1="16" x2="24" y2="12" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="24" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <!-- Bottom-left -->
                  <line x1="16" y1="24" x2="16" y2="28" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="16" y1="24" x2="12" y2="24" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <!-- Bottom-right -->
                  <line x1="24" y1="24" x2="24" y2="28" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="24" y1="24" x2="28" y2="24" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                </svg>

                <!-- Piece -->
                <button
                  v-if="board[r-1][c-1]"
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base leading-none font-bold shadow-md transition z-10"
                  :class="[
                    getPieceClasses(board[r-1][c-1]),
                    selected && selected.x === (r-1) && selected.y === (c-1) ? 'ring-2 ring-primary ring-offset-2' : ''
                  ]"
                >
                  <span :class="{ 'rotate-180': rotateBoard }">{{ pieceText(board[r-1][c-1]) }}</span>
                </button>
              </div>
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

      <!-- Turn indicator -->
      <div v-if="gameStatus === 'playing'" class="mt-3 text-base flex items-center gap-3">
        <div>轮到：<b class="ml-1">{{ currentPlayer?.name }}</b></div>
        <div class="text-sm">倒计时：<span class="badge badge-outline">{{ countdown }}s</span></div>
      </div>
    </section>

    <!-- Sidebar -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <RoomControls
        :game="game"
        :room-player="roomPlayer"
        :current-player="currentPlayer"
        :enable-draw-resign="true"
        @draw="requestDraw"
        @lose="requestLose"
      />

      <!-- Explicit leave button -->
      <div class="flex gap-2">
          <button class="btn btn-sm" @click="props.game?.leaveRoom(roomPlayer.room.id)">离开房间</button>
      </div>

      <!-- Player list -->
      <PlayerList :players="roomPlayer.room.players">
        <template #default="{ player: p }">
          <span v-if="p.role === 'player'">
            <span>[{{ getRoleLabel(p) }}]</span>
            <span>[{{ getPlayerStatus(p) }}]</span>
          </span>
          <span v-else>[围观中]</span>
          <span>{{ p.name }}</span>
        </template>
      </PlayerList>

      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. 红方先手；双方轮流走子（服务器校验走法和将帅对脸）。</li>
            <li>2. 棋子落在十字线交点上；河界分隔“楚河/汉界”。</li>
            <li>3. 吃掉对方将/帅即胜。</li>
            <li>4. 每回合有 30 秒思考时间，超时判负。</li>
            <li>5. 明牌聊天：所有人可见；观众在对局中仅能与其他观众交流。</li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import type { RoomPlayer, Room } from 'tiaoom/client'
import { RoomStatus } from 'tiaoom/client'
import type { GameCore } from '@/core/game'
import { computed } from 'vue'
import RoomControls from '@/components/common/RoomControls.vue'
import GameChat from '@/components/common/GameChat.vue'
import { useXiangqi } from './useXiangqi'

const props = defineProps<{ roomPlayer: RoomPlayer & { room: Room }, game: GameCore }>()

const {
  gameStatus,
  currentPlayer,
  board,
  selected,
  countdown,
  trySelectOrMove,
} = useXiangqi(props.game, props.roomPlayer)

// UI helpers
function onCellClick(x: number, y: number) {
  trySelectOrMove(x, y)
}

function shouldShowIntersectionMark(r: number, c: number): boolean {
  // Show marks at key positions: cannon (row 2,7 at cols 1,7) and pawn/soldier positions
  if ((r === 2 || r === 7) && (c === 1 || c === 7)) return true
  if ((r === 3 || r === 6) && c % 2 === 0) return true
  return false
}

function pieceText(p: string) {
  const side = p[0] === 'r' ? 'red' : 'green'
  const t = p[1]
  const mapRed: Record<string,string> = { R:'车', N:'马', B:'相', A:'士', K:'帅', C:'炮', P:'兵' }
  const mapGreen: Record<string,string> = { R:'車', N:'馬', B:'象', A:'仕', K:'将', C:'砲', P:'卒' }
  return side === 'red' ? (mapRed[t]||t) : (mapGreen[t]||t)
}

function getPieceClasses(p: string) {
  if (!p) return 'bg-transparent'
  const side = p[0] === 'r' ? 'red' : 'green'
  return side === 'red' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
}

const rotateBoard = computed(() => {
  // Players view: their side at bottom; green rotates 180°. Spectators: no rotation.
  if ((props.roomPlayer as any).role !== 'player') return false
  const side = (props.roomPlayer as any).attributes?.side
  return side === 'green'
})

function requestDraw() {
  if (props.roomPlayer.room.status !== RoomStatus.playing) return
  props.game?.command(props.roomPlayer.room.id, { type: 'request-draw' })
}

function requestLose() {
  if (props.roomPlayer.room.status !== RoomStatus.playing) return
  props.game?.command(props.roomPlayer.room.id, { type: 'request-lose' })
}

function getRoleLabel(p: any) {
  if (p.role !== 'player') return '观众'
  if (p.attributes?.side === 'red') return '红方'
  if (p.attributes?.side === 'green') return '绿方'
  return '玩家'
}

function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting') return '准备好了'
  if (currentPlayer.value?.id === p.id) return '思考中'
  if (gameStatus.value === 'playing') return '等待中'
  return '准备好了'
}
</script>

<style scoped>
.xiangqi-board {
  width: 360px;
  height: 405px;
  font-family: var(--font-kai);
}
</style>
