<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  history: { action: string; from?: string; to?: string; piece?: string; time: number }[]
  initialBoard: ({ id: number; type: string; side: string; level: number; name: string } | null)[][]
  players: { username: string; name: string; camp: string }[]
  beginTime: number
}>()

type Side = 'red' | 'black'

interface Piece {
  id: number
  type: string
  side: Side
  level: number
  name: string
  isOpen: boolean
}

type Cell = Piece | null

function createInitialBoard(): Cell[][] {
  // 从 initialBoard 创建棋盘，所有棋子初始为未翻开状态
  return props.initialBoard.map(row =>
    row.map(cell =>
      cell ? { ...cell, side: cell.side as Side, isOpen: false } : null
    )
  )
}

function parseCoord(coord: string): { x: number; y: number } {
  // coord: "x,y" 格式
  const [x, y] = coord.split(',').map(Number)
  return { x, y }
}

const history = computed(() => props.history.map(h => ({
  ...h,
  time: h.time - props.beginTime
})))
const players = computed(() => props.players)

const currentStep = ref(0)
const currentTime = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
let animationFrame: number | null = null
let lastTimestamp = 0
const isAutoStepping = ref(false)

// 计算当前棋盘状态
const currentBoard = computed(() => {
  const board = createInitialBoard()
  const movesToApply = history.value.slice(0, currentStep.value)

  for (const move of movesToApply) {
    if (move.action === 'flip' && move.from) {
      const { x, y } = parseCoord(move.from)
      const cell = board[x][y]
      if (cell) {
        cell.isOpen = true
      }
    } else if ((move.action === 'move' || move.action === 'capture') && move.from && move.to) {
      const from = parseCoord(move.from)
      const to = parseCoord(move.to)
      const piece = board[from.x][from.y]
      if (piece) {
        // 如果是吃子，目标棋子需要先翻开（炮吃暗棋）
        if (move.action === 'capture') {
          const target = board[to.x][to.y]
          if (target && !target.isOpen) {
            target.isOpen = true
          }
        }
        board[to.x][to.y] = piece
        board[from.x][from.y] = null
      }
    }
  }
  return board
})

// 最后一步的高亮
const lastMove = computed(() => {
  if (currentStep.value === 0) return null
  const move = history.value[currentStep.value - 1]
  if (!move.from) return null

  const from = parseCoord(move.from)
  const to = move.to ? parseCoord(move.to) : null

  return { from, to, action: move.action }
})

// 当前回合玩家（交替）
const currentPlayer = computed(() => {
  // 根据步数判断当前回合（0步为先手红方还是黑方取决于首翻）
  if (currentStep.value === 0) return null
  // 简单交替：偶数步为第一个翻棋玩家，奇数步为第二个
  return currentStep.value % 2 === 1 ? players.value[0] : players.value[1]
})

// --- 回放控制 ---

function togglePlay() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

function play() {
  if (currentStep.value >= history.value.length) {
    currentStep.value = 0
    currentTime.value = 0
  }
  isPlaying.value = true
  lastTimestamp = 0
  animationFrame = requestAnimationFrame(loop)
}

function pause() {
  isPlaying.value = false
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  lastTimestamp = 0
}

function setSpeed(speed: number) {
  playbackSpeed.value = speed
}

function loop(timestamp: number) {
  if (!isPlaying.value) return

  if (!lastTimestamp) lastTimestamp = timestamp
  const delta = timestamp - lastTimestamp
  lastTimestamp = timestamp

  currentTime.value += delta * playbackSpeed.value

  // 需要时前进步数
  let step = currentStep.value
  while (step < history.value.length && currentTime.value >= history.value[step].time) {
    step++
  }

  if (step !== currentStep.value) {
    isAutoStepping.value = true
    currentStep.value = step
  }

  if (currentStep.value >= history.value.length) {
    pause()
    // 确保时间与结束时间一致
    if (history.value.length > 0) {
      currentTime.value = history.value[history.value.length - 1].time
    }
  } else {
    animationFrame = requestAnimationFrame(loop)
  }
}

watch(isPlaying, (playing) => {
  if (playing) {
    if (currentStep.value >= history.value.length) {
      currentStep.value = 0
      currentTime.value = 0
    }
    lastTimestamp = 0
    animationFrame = requestAnimationFrame(loop)
  } else {
    pause()
  }
})

watch(currentStep, (newStep) => {
  if (isAutoStepping.value) {
    isAutoStepping.value = false
    return
  }
  // 手动跳转
  currentTime.value = newStep > 0 ? history.value[newStep - 1].time : 0
})

// --- UI 辅助函数 ---

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getPieceClasses(cell: Cell) {
  if (!cell) return ''
  if (!cell.isOpen) return 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-900 text-amber-200'
  return cell.side === 'red'
    ? 'bg-red-100 border-red-600 text-red-600'
    : 'bg-gray-100 border-gray-800 text-gray-800'
}

function getPlayerName(camp: string) {
  const p = players.value.find(p => p.camp === camp)
  return p ? p.name : (camp === 'red' ? '红方' : '黑方')
}

function getActionText(action: string) {
  switch (action) {
    case 'flip': return '翻'
    case 'move': return '走'
    case 'capture': return '吃'
    default: return action
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case 'flip': return 'mdi:rotate-3d-variant'
    case 'move': return 'mdi:arrow-right'
    case 'capture': return 'mdi:sword-cross'
    default: return 'mdi:help'
  }
}

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden">
    <!-- 棋盘区域 -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4 select-none">
      <div class="inline-block bg-amber-100 border-4 border-amber-800 p-2 rounded shadow-2xl">
        <!-- 4x8 棋盘 -->
        <div class="grid grid-cols-8">
          <template v-for="(row, x) in currentBoard" :key="x">
            <div
              v-for="(cell, y) in row"
              :key="`${x}-${y}`"
              class="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border border-amber-700 bg-amber-50 transition-all duration-200"
              :class="[
                lastMove?.from?.x === x && lastMove?.from?.y === y ? 'bg-yellow-200' : '',
                lastMove?.to?.x === x && lastMove?.to?.y === y ? 'bg-yellow-200' : ''
              ]"
            >
              <!-- 棋子 -->
              <div
                v-if="cell"
                class="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold shadow-lg border-2 transition-all duration-200"
                :class="getPieceClasses(cell)"
              >
                <span v-if="cell.isOpen" class="select-none">{{ cell.name }}</span>
                <span v-else class="text-lg">?</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 状态 -->
      <div class="flex items-center justify-center gap-3 mt-4 text-lg p-1">
        <template v-if="currentPlayer">
          <div class="w-6 h-6 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
            <span
              class="w-full h-full rounded-full"
              :class="currentPlayer.camp === 'red' ? 'bg-red-500 border border-white/20 shadow-md' : 'bg-gray-800 border border-white/20 shadow-md'"
            />
          </div>
          <b class="text-base-content">{{ getPlayerName(currentPlayer.camp) }}</b>
        </template>
        <span v-else class="text-base-content/60">等待开始</span>
        <span class="text-base opacity-60 font-mono ml-2">
          {{ formatTime(currentTime) }}
        </span>
      </div>
    </section>

    <!-- 历史记录 / 控制 -->
    <aside class="w-full md:w-80 flex-none border-t md:border-t-0 md:border-l border-base-content/20 md:pt-0 md:pl-4 flex flex-col h-[50vh] md:h-full min-h-0">
      <h3 class="text-lg font-bold p-2 flex items-center gap-2">
        <Icon icon="mdi:history" />
        对局记录
      </h3>

      <div class="flex-1 min-h-0 overflow-y-auto space-y-1 pr-2">
        <div
          class="p-2 rounded cursor-pointer hover:bg-base-200 transition-colors flex justify-between items-center"
          :class="{ 'bg-primary text-primary-content hover:bg-primary': currentStep === 0 }"
          @click="currentStep = 0"
        >
          <span>开始</span>
          <span class="text-xs opacity-70">00:00</span>
        </div>
        <div
          v-for="(move, index) in history"
          :key="index"
          class="p-2 rounded cursor-pointer hover:bg-base-200 transition-colors flex justify-between items-center"
          :class="{ 'bg-primary text-primary-content hover:bg-primary': currentStep === index + 1 }"
          @click="currentStep = index + 1"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono w-6 text-right">{{ index + 1 }}.</span>
            <Icon :icon="getActionIcon(move.action)" class="w-4 h-4" />
            <span class="flex-1">
              <span class="badge badge-xs mr-1">{{ getActionText(move.action) }}</span>
              {{ move.piece }}
            </span>
          </div>
          <span class="text-xs opacity-70">{{ formatTime(move.time) }}</span>
        </div>

        <!-- 控制按钮 -->
        <div class="my-2 flex flex-col gap-2 sticky bottom-0 bg-base-100">
          <div class="flex justify-between items-center gap-2">
            <button class="btn btn-sm" @click="currentStep = Math.max(0, currentStep - 1)" :disabled="currentStep === 0">
              <Icon icon="mdi:chevron-left" />
            </button>

            <div class="flex items-center gap-2">
              <div class="text-center text-xs opacity-50 font-mono">
                {{ currentStep }} / {{ history.length }}
              </div>
              <button class="btn btn-sm btn-circle btn-ghost" @click="togglePlay">
                <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" class="text-xl" />
              </button>
              <div class="dropdown dropdown-top dropdown-end">
                <div tabindex="0" role="button" class="btn btn-xs btn-ghost">{{ playbackSpeed }}x</div>
                <ul tabindex="0" class="dropdown-content z-1 menu p-2 shadow bg-base-100 rounded-box w-20">
                  <li v-for="speed in [0.5, 1, 2, 4]" :key="speed" @click="setSpeed(speed)">
                    <a :class="{ 'active': playbackSpeed === speed }">{{ speed }}x</a>
                  </li>
                </ul>
              </div>
            </div>

            <button class="btn btn-sm" @click="currentStep = Math.min(history.length, currentStep + 1)" :disabled="currentStep === history.length">
              <Icon icon="mdi:chevron-right" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  </section>
</template>

<style scoped>
.grid {
  font-family: var(--font-kai);
  -webkit-user-select: none;
  user-select: none;
}
</style>
