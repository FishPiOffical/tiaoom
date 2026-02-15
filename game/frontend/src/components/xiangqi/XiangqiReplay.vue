<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  history: { from: string, to: string, piece: string, time: number }[]
  players: { username: string, name: string, side: string }[]
  beginTime: number
}>()

// --- Game Logic ---

type Piece = string | ''
type Side = 'red' | 'green'

function createInitialBoard(): Piece[][] {
  const emptyRow = () => Array(9).fill('') as Piece[]
  const b: Piece[][] = Array(10).fill(0).map(() => emptyRow())
  // Green (top half: rows 0-4)
  b[0] = ['gR','gN','gB','gA','gK','gA','gB','gN','gR']
  b[2][1] = 'gC'; b[2][7] = 'gC'
  b[3][0] = 'gP'; b[3][2] = 'gP'; b[3][4] = 'gP'; b[3][6] = 'gP'; b[3][8] = 'gP'
  // Red (bottom half: rows 5-9)
  b[6][0] = 'rP'; b[6][2] = 'rP'; b[6][4] = 'rP'; b[6][6] = 'rP'; b[6][8] = 'rP'
  b[7][1] = 'rC'; b[7][7] = 'rC'
  b[9] = ['rR','rN','rB','rA','rK','rA','rB','rN','rR']
  return b
}

function parseCoord(coord: string) {
  // coord: "A1" -> y=0, x=9. "I10" -> y=8, x=0
  // y: A-I -> 0-8
  // x: 10-1 -> 0-9
  const y = coord.charCodeAt(0) - 65
  const numStr = coord.slice(1)
  const num = parseInt(numStr)
  const x = 10 - num
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

const currentBoard = computed(() => {
  const board = createInitialBoard()
  const movesToApply = history.value.slice(0, currentStep.value)
  
  for (const move of movesToApply) {
    const from = parseCoord(move.from)
    const to = parseCoord(move.to)
    const p = board[from.x][from.y]
    board[to.x][to.y] = p
    board[from.x][from.y] = ''
  }
  return board
})

const lastMove = computed(() => {
  if (currentStep.value === 0) return null
  const move = history.value[currentStep.value - 1]
  return {
    from: parseCoord(move.from),
    to: parseCoord(move.to)
  }
})

const currentPlayer = computed(() => {
  if (currentStep.value === 0) return 'red' // Red starts
  const last = history.value[currentStep.value - 1]
  // If last move was red, next is green
  return getPieceSide(last.piece) === 'red' ? 'green' : 'red'
})

// --- Playback Control ---

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
  
  // Advance steps if needed
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
    // Ensure time matches end
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
  // Manual jump
  currentTime.value = newStep > 0 ? history.value[newStep - 1].time : 0
})

// --- UI Helpers ---

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function shouldShowIntersectionMark(r: number, c: number): boolean {
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

function getPieceSide(p: string) {
  if (!p) return null
  return p[0] === 'r' ? 'red' : 'green'
}

function getPlayerName(side: string) {
  const p = players.value.find(p => p.side === side)
  return p ? p.name : (side === 'red' ? '红方' : '绿方')
}

function svgX(col: number) {
  return col * 45
}

function svgY(row: number) {
  return row <= 4 ? row * 45 : 225 + (row - 5) * 45
}

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden">
    <!-- Board Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4 select-none">
      <div class="inline-block bg-base-200 border-2 border-base-content/20 p-8 rounded shadow-xl scale-90 md:scale-100 origin-center transition-transform">
        <div class="relative xiangqi-board">
          <!-- SVG Grid -->
          <svg class="absolute inset-0 w-full h-full overflow-visible" style="overflow: visible" viewBox="0 0 360 405" preserveAspectRatio="none">
            <!-- Outer border -->
            <rect x="0" y="0" width="360" height="180" fill="none" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
            <rect x="0" y="225" width="360" height="180" fill="none" stroke="currentColor" stroke-width="2" class="text-base-content/60" />

            <!-- River gap border -->
            <line x1="0" y1="180" x2="0" y2="225" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
            <line x1="360" y1="180" x2="360" y2="225" stroke="currentColor" stroke-width="2" class="text-base-content/60" />
            
            <!-- Vertical lines -->
            <line x1="0" y1="0" x2="0" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line x1="360" y1="0" x2="360" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line v-for="c in 7" :key="'v-top-'+c" :x1="c*45" y1="0" :x2="c*45" y2="180" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            
            <line x1="0" y1="225" x2="0" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line x1="360" y1="225" x2="360" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line v-for="c in 7" :key="'v-bot-'+c" :x1="c*45" y1="225" :x2="c*45" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            
            <!-- Horizontal lines -->
            <line v-for="r in 5" :key="'h-top-'+r" x1="0" :y1="(r-1)*45" x2="360" :y2="(r-1)*45" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line v-for="r in 5" :key="'h-bot-'+r" x1="0" :y1="225+(r-1)*45" x2="360" :y2="225+(r-1)*45" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            
            <!-- Palace diagonals -->
            <line x1="135" y1="0" x2="225" y2="90" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line x1="225" y1="0" x2="135" y2="90" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            
            <line x1="135" y1="315" x2="225" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />
            <line x1="225" y1="315" x2="135" y2="405" stroke="currentColor" stroke-width="1" class="text-base-content/40" />

            <!-- Last move highlight -->
            <g v-if="lastMove" pointer-events="none">
              <circle
                :cx="svgX(lastMove.from.y)"
                :cy="svgY(lastMove.from.x)"
                r="22"
                fill="none"
                stroke="currentColor"
                stroke-width="5"
                class="text-base-content/25"
              />
              <circle
                :cx="svgX(lastMove.from.y)"
                :cy="svgY(lastMove.from.x)"
                r="22"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
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
                stroke-width="6"
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

          <!-- Intersection marks and pieces grid -->
          <div class="relative" style="width: 360px; height: 405px;">
            <div v-for="r in 10" :key="'row'+r" class="absolute" :style="{ top: ((r-1) <= 4 ? (r-1)*45 : 225 + ((r-1)-5)*45) + 'px', left: 0, right: 0 }">
              <div v-for="c in 9" :key="'cell'+c" 
                   class="absolute"
                   :style="{ left: ((c-1)*45) + 'px', transform: 'translate(-50%, -50%)', width: '45px', height: '45px' }">
                <!-- Intersection marks -->
                <svg v-if="shouldShowIntersectionMark(r-1, c-1)" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" width="40" height="40" viewBox="0 0 40 40">
                  <line x1="16" y1="16" x2="16" y2="12" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="16" y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="24" y1="16" x2="24" y2="12" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="24" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="16" y1="24" x2="16" y2="28" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="16" y1="24" x2="12" y2="24" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="24" y1="24" x2="24" y2="28" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                  <line x1="24" y1="24" x2="28" y2="24" stroke="currentColor" stroke-width="1.5" class="text-base-content/60" />
                </svg>

                <!-- Piece -->
                <div
                  v-if="currentBoard[r-1][c-1]"
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base leading-none font-bold shadow-md z-10"
                  :class="getPieceClasses(currentBoard[r-1][c-1])"
                >
                  <span class="select-none">{{ pieceText(currentBoard[r-1][c-1]) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- River text -->
          <div class="absolute left-0 right-0 text-center pointer-events-none select-none" style="top: 180px; height: 45px;">
            <div class="h-full flex items-center justify-between px-8 text-base-content/70 font-bold text-lg">
              <span class="font-serif tracking-widest">楚河</span>
              <span class="font-serif tracking-widest inline-block rotate-180">汉界</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div class="flex items-center justify-center gap-3 mt-4 text-lg p-1">
        <div class="w-6 h-6 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
          <span 
            class="w-full h-full rounded-full"
            :class="currentPlayer === 'red' ? 'bg-red-600 border border-white/20 shadow-md' : 'bg-green-600 border border-white/20 shadow-md'"
          />
        </div>
        <b class="text-base-content">{{ getPlayerName(currentPlayer) }}</b>
        <span class="text-base opacity-60 font-mono ml-2">
          {{ formatTime(currentTime) }}
        </span>
      </div>
    </section>

    <!-- History / Controls -->
    <aside class="w-full md:w-80 flex-none border-t md:border-t-0 md:border-l border-base-content/20 md:pt-0 md:pl-4 flex flex-col h-[50vh] md:h-full min-h-0">
      <h3 class="text-lg font-bold p-2 flex items-center gap-2">
        <span class="flex items-center gap-2">
          <Icon icon="mdi:history" />
          对局记录
        </span>
        <span>
          
        </span>
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
            <div class="w-3 h-3 rounded-full border border-base-content/20 shadow-sm"
                 :class="getPieceSide(move.piece) === 'red' ? 'bg-red-600' : 'bg-green-600'"></div>
            <span class="flex-1 font-mono">
              {{ move.from }} → {{ move.to }}
            </span>
          </div>
          <span class="text-xs opacity-70">{{ formatTime(move.time) }}</span>
        </div>
      
        <!-- Controls -->
        <div class="my-2 flex flex-col gap-2 sticky z-100 bottom-0 bg-base-100">
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
.xiangqi-board {
  width: 360px;
  height: 405px;
  font-family: var(--font-kai);
  -webkit-user-select: none;
  user-select: none;
}
</style>
