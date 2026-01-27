<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import Icon from '@/components/common/Icon.vue'

interface HistoryItem {
  type: 'draw'
  lineType: 'horizontal' | 'vertical'
  row: number
  col: number
  player: string
  time: number
}

const props = defineProps<{
  history: HistoryItem[]
  players: { id: string; name: string, color: number }[]
  beginTime: number
  winner?: string | null
}>()

// --- Game Logic ---

const BOARD_SIZE = 4

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const currentStep = ref(0)
const currentDisplayTime = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
let animationFrame: number | null = null
let lastTimestamp = 0

function jumpToStep(step: number) {
  currentStep.value = step
  pause()
}

// Computed State based on currentStep
const gameState = computed(() => {
  // Initialize board
  const hLines: boolean[][] = Array(BOARD_SIZE + 1).fill(null).map(() =>
    Array(BOARD_SIZE).fill(false)
  )
  const vLines: boolean[][] = Array(BOARD_SIZE).fill(null).map(() =>
    Array(BOARD_SIZE + 1).fill(false)
  )
  const boxes: number[][] = Array(BOARD_SIZE).fill(null).map(() =>
    Array(BOARD_SIZE).fill(0)
  )
  const scores = [0, 0]

  const steps = Math.min(currentStep.value, props.history.length)

  for (let i = 0; i < steps; i++) {
    const move = props.history[i]
    if (move.type === 'draw') {
      if (move.lineType === 'horizontal') {
        hLines[move.row][move.col] = true
      } else if (move.lineType === 'vertical') {
        vLines[move.row][move.col] = true
      }

      // Check for completed boxes
      const playerIndex = props.players.findIndex(p => p.id === move.player)
      if (playerIndex !== -1) {
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (boxes[r][c] === 0) {
              const top = hLines[r][c]
              const bottom = hLines[r + 1]?.[c] || false
              const left = vLines[r][c]
              const right = vLines[r][c + 1]
              if (top && bottom && left && right) {
                boxes[r][c] = playerIndex + 1
                scores[playerIndex]++
              }
            }
          }
        }
      }
    }
  }

  const lastMove = steps > 0 ? props.history[steps - 1] : null
  const currentPlayer = steps < props.history.length ? props.history[steps].player : null

  return {
    hLines,
    vLines,
    boxes,
    scores,
    lastMove,
    currentPlayer
  }
})

const moveListRef = ref<HTMLElement | null>(null)

// Auto-scroll list
watch(currentStep, () => {
  const time = currentStep.value > 0 ? props.history[currentStep.value - 1].time : 0
  currentDisplayTime.value = time

  nextTick(() => {
    if (!moveListRef.value) return
    const activeEl = moveListRef.value.querySelector('.active-move')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
}, { immediate: true })

// --- Playback Control ---

function togglePlay() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

function play() {
  if (currentStep.value >= props.history.length) {
    currentStep.value = 0
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
  if (!lastTimestamp) lastTimestamp = timestamp
  const elapsed = timestamp - lastTimestamp

  let delay = 1000
  let prevTime = 0
  let nextTime = 0

  if (currentStep.value < props.history.length) {
    const nextMove = props.history[currentStep.value]
    prevTime = currentStep.value > 0 ? props.history[currentStep.value - 1].time : 0
    nextTime = nextMove.time
    if (nextTime >= prevTime) {
      delay = nextTime - prevTime
    }
  }

  // Update display time
  currentDisplayTime.value = prevTime + (elapsed * playbackSpeed.value)
  if (currentDisplayTime.value > nextTime) currentDisplayTime.value = nextTime

  const interval = delay / playbackSpeed.value

  if (elapsed >= interval) {
    if (currentStep.value < props.history.length) {
      currentStep.value++
      lastTimestamp = timestamp
      animationFrame = requestAnimationFrame(loop)
    } else {
      pause()
    }
  } else {
    animationFrame = requestAnimationFrame(loop)
  }
}

// --- UI Helpers ---

function getPlayerName(id: string) {
  return props.players.find(p => p.id === id)?.name || 'Unknown'
}

function getPlayerColor(id: string) {
  const player = props.players.find(p => p.id === id)
  return player ? (player.color === 0 ? 'success' : 'error') : 'neutral'
}

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden p-4">
    <!-- Game Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-center gap-4 bg-base-200 rounded-lg relative overflow-hidden p-4">

      <div class="board relative bg-base-300 p-4 select-none shadow-xl rounded-xl flex items-center justify-center">
        <!-- Dots and Lines -->
        <svg :width="(BOARD_SIZE) * 40" :height="(BOARD_SIZE) * 40" class="overflow-visible">
          <!-- Dots -->
          <g v-for="(_, row) in BOARD_SIZE + 1" :key="'dot-row-' + row">
            <circle
              v-for="(__, col) in BOARD_SIZE + 1"
              :key="'dot-' + row + '-' + col"
              :cx="col * 40"
              :cy="row * 40"
              r="3"
              fill="currentColor"
              class="text-base-content opacity-70"
            />
          </g>

          <!-- Horizontal Lines -->
          <g v-for="(_, row) in BOARD_SIZE + 1" :key="'hline-row-' + row">
            <line
              v-for="(__, col) in BOARD_SIZE"
              :key="'hline-' + row + '-' + col"
              :x1="col * 40"
              :y1="row * 40"
              :x2="(col + 1) * 40"
              :y2="row * 40"
              stroke="currentColor"
              :stroke-width="gameState.hLines[row][col] ? 3 : 1"
              :class="gameState.hLines[row][col] ? 'text-primary' : 'text-base-content/30'"
              stroke-linecap="round"
            />
          </g>

          <!-- Vertical Lines -->
          <g v-for="(_, row) in BOARD_SIZE" :key="'vline-row-' + row">
            <line
              v-for="(__, col) in BOARD_SIZE + 1"
              :key="'vline-' + row + '-' + col"
              :x1="col * 40"
              :y1="row * 40"
              :x2="col * 40"
              :y2="(row + 1) * 40"
              stroke="currentColor"
              :stroke-width="gameState.vLines[row][col] ? 3 : 1"
              :class="gameState.vLines[row][col] ? 'text-primary' : 'text-base-content/30'"
              stroke-linecap="round"
            />
          </g>

          <!-- Boxes -->
          <g v-for="(_, row) in BOARD_SIZE" :key="'box-row-' + row">
            <rect
              v-for="(__, col) in BOARD_SIZE"
              :key="'box-' + row + '-' + col"
              :x="col * 40 + 5"
              :y="row * 40 + 5"
              width="30"
              height="30"
              :fill="gameState.boxes[row][col] === 1 ? 'var(--color-success)' : gameState.boxes[row][col] === 2 ? 'var(--color-error)' : 'transparent'"
              fill-opacity="0.3"
              rx="4"
            />
          </g>
        </svg>
      </div>

      <div class="text-xl font-bold opacity-80 flex items-center gap-2">
        <div
            class="w-4 h-4 rounded-full border-2"
            :class="gameState.currentPlayer ? (getPlayerColor(gameState.currentPlayer) === 'success' ? 'bg-success/10 border-success' : 'bg-error/10 border-error') : 'bg-neutral/10 border-neutral'"
        ></div>
        <span>{{ gameState.currentPlayer ? getPlayerName(gameState.currentPlayer) : 'Game Over' }} {{ formatTime(currentDisplayTime) }}</span>
      </div>

      <div class="flex gap-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-success/10 border border-success"></div>
          <span>{{ getPlayerName(props.players[0]?.id) }}: {{ gameState.scores[0] }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-error/10 border border-error"></div>
          <span>{{ getPlayerName(props.players[1]?.id) }}: {{ gameState.scores[1] }}</span>
        </div>
      </div>

    </section>

    <!-- History / Controls -->
    <aside class="w-full md:w-80 flex-none border-t md:border-t-0 md:border-l border-base-content/20 md:pt-0 md:pl-4 flex flex-col h-[40vh] md:h-full min-h-0">
      <h3 class="text-lg font-bold p-2 flex items-center gap-2">
        <Icon icon="mdi:history" />
        对局记录
      </h3>

      <!-- Move List -->
      <div class="flex-1 min-h-0 overflow-y-auto space-y-1 p-2 bg-base-200 rounded-lg" ref="moveListRef">
        <div
          v-for="(move, index) in history"
          :key="index"
          class="text-sm p-2 rounded cursor-pointer transition-colors hover:bg-base-100 flex justify-between items-center"
          :class="{
            'bg-base-100 active-move ring-1 ring-primary/20': index === currentStep - 1,
            'opacity-50': index >= currentStep
          }"
          @click="jumpToStep(index + 1)"
        >
          <div class="flex items-center gap-2">
            <span class="font-bold w-6 text-center">{{ index + 1 }}.</span>
            <div
                class="w-3 h-3 rounded-full border"
                :class="getPlayerColor(move.player) === 'success' ? 'bg-success/10 border-success' : 'bg-error/10 border-error'"
            ></div>
            <span class="font-medium">{{ move.lineType === 'horizontal' ? '横线' : '竖线' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span>({{ move.row }},{{ move.col }})</span>
            <span class="text-xs opacity-50 ml-2 font-mono">{{ formatTime(move.time) }}</span>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="mt-4 flex flex-col gap-2">
        <!-- Progress Bar -->
        <input
          type="range"
          min="0"
          :max="history.length"
          v-model.number="currentStep"
          class="range range-xs range-primary"
          @input="pause"
        />

        <!-- Buttons -->
        <div class="flex justify-center items-center gap-4">
          <button class="btn btn-circle btn-sm" @click="currentStep = Math.max(0, currentStep - 1); pause()">
            <Icon icon="mdi:skip-previous" />
          </button>

          <button class="btn btn-circle btn-primary" @click="togglePlay">
            <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" class="text-xl" />
          </button>

          <button class="btn btn-circle btn-sm" @click="currentStep = Math.min(history.length, currentStep + 1); pause()">
            <Icon icon="mdi:skip-next" />
          </button>
        </div>

        <!-- Speed Control -->
        <div class="flex justify-center gap-2 mt-2">
          <button
            v-for="speed in [0.5, 1, 2, 4]"
            :key="speed"
            class="btn btn-xs"
            :class="playbackSpeed === speed ? 'btn-primary' : 'btn-ghost'"
            @click="setSpeed(speed)"
          >
            x{{ speed }}
          </button>
        </div>
      </div>
    </aside>
  </section>
</template>