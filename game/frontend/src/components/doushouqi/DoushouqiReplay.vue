<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import Icon from '@/components/common/Icon.vue'

interface Piece {
  player: number;
  type: string;
}

interface Position {
  x: number;
  y: number;
}

interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  turn: number;
  time?: number;
}

const props = defineProps<{
  history: Move[]
  players: { id: string; name: string }[]
  beginTime: number
  winner?: number
}>()

// --- Game Logic ---

const WIDTH = 7;
const HEIGHT = 9;

const PIECE_NAMES: Record<string, string> = {
  rat: '鼠', cat: '猫', dog: '狗', wolf: '狼',
  leopard: '豹', tiger: '虎', lion: '狮', elephant: '象'
};

function getPieceName(type: string) {
  return PIECE_NAMES[type] || type;
}

function formatTime(ms?: number) {
  if (ms === undefined || ms === null) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function isRiver(x: number, y: number) {
  return (y >= 3 && y <= 5) && ((x >= 1 && x <= 2) || (x >= 4 && x <= 5));
}

function isTrap(x: number, y: number) {
  return (x === 2 && y === 0) || (x === 4 && y === 0) || (x === 3 && y === 1) ||
         (x === 2 && y === 8) || (x === 4 && y === 8) || (x === 3 && y === 7);
}

function isDen(x: number, y: number) {
  return (x === 3 && y === 0) || (x === 3 && y === 8);
}

function getCellClass(x: number, y: number) {
  if (isRiver(x, y)) return 'bg-info/10 shadow-inner';
  if (isDen(x, y)) return 'bg-warning/10';
  if (isTrap(x, y)) return 'bg-secondary/10';
  return 'bg-base-100';
}

function getPieceClass(cell: any, x: number, y: number) {
  const highlight = isTrap(x, y) || isDen(x, y) || isRiver(x, y);
  if (cell.player === 0) {
    return highlight ? 'bg-success text-success-content border-success rotate-180' : 'bg-success/10 text-success border-success rotate-180';
  } else {
    return highlight ? 'bg-error text-error-content border-error' : 'bg-error/10 text-error border-error';
  }
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
  const board: (Piece | null)[][] = Array(HEIGHT).fill(null).map(() => Array(WIDTH).fill(null));
  
  const placePiece = (player: number, type: string, x: number, y: number) => {
    board[y][x] = { player, type };
  };

  // Blue (Player 0, Top)
  placePiece(0, 'lion', 0, 0);
  placePiece(0, 'tiger', 6, 0);
  placePiece(0, 'dog', 1, 1);
  placePiece(0, 'cat', 5, 1);
  placePiece(0, 'rat', 0, 2);
  placePiece(0, 'leopard', 2, 2);
  placePiece(0, 'wolf', 4, 2);
  placePiece(0, 'elephant', 6, 2);

  // Red (Player 1, Bottom)
  placePiece(1, 'lion', 6, 8);
  placePiece(1, 'tiger', 0, 8);
  placePiece(1, 'dog', 5, 7);
  placePiece(1, 'cat', 1, 7);
  placePiece(1, 'rat', 6, 6);
  placePiece(1, 'leopard', 4, 6);
  placePiece(1, 'wolf', 2, 6);
  placePiece(1, 'elephant', 0, 6);

  const steps = Math.min(currentStep.value, props.history.length);
  
  for (let i = 0; i < steps; i++) {
    const move = props.history[i];
    const piece = board[move.from.y][move.from.x];
    // In case history has some inconsistency, we trust the move record but verify piece existence
    if (piece) {
        board[move.to.y][move.to.x] = piece;
        board[move.from.y][move.from.x] = null;
    }
  }

  const lastMove = steps > 0 ? props.history[steps - 1] : null;
  const turn = steps < props.history.length ? props.history[steps].turn : (lastMove ? 1 - lastMove.turn : 0);

  return {
    board,
    lastMove,
    turn
  }
})

const moveListRef = ref<HTMLElement | null>(null)

// Auto-scroll list
watch(currentStep, () => {
  const time = currentStep.value > 0 ? props.history[currentStep.value - 1].time || 0 : 0;
  currentDisplayTime.value = time;

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
  
  let delay = 1000;
  let prevTime = 0;
  let nextTime = 0;

  if (currentStep.value < props.history.length) {
    const nextMove = props.history[currentStep.value];
    prevTime = currentStep.value > 0 ? props.history[currentStep.value - 1].time || 0 : 0;
    nextTime = nextMove.time || 0;
    if (nextTime >= prevTime) {
      delay = nextTime - prevTime;
    }
  }
  
  // Update display time
  currentDisplayTime.value = prevTime + (elapsed * playbackSpeed.value);
  if (currentDisplayTime.value > nextTime) currentDisplayTime.value = nextTime;

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

function getPlayerName(index: number) {
  const id = props.players[index]?.id;
  return props.players.find(p => p.id === id)?.name || (index === 0 ? '蓝方' : '红方');
}

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden p-4">
    <!-- Game Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-center gap-4 bg-base-200 rounded-lg relative overflow-hidden p-4">
      
      <div class="board relative bg-base-300 p-1 select-none shadow-xl rounded-xl">
        <!-- Grid -->
        <div v-for="(row, y) in gameState.board" :key="y" class="flex">
          <div
            v-for="(cell, x) in row"
            :key="x"
            class="w-8 h-8 sm:w-10 sm:h-10 m-0.5 rounded-md flex items-center justify-center relative transition-all"
            :class="[
                getCellClass(x, y),
                gameState.lastMove?.from.x === x && gameState.lastMove?.from.y === y ? 'ring-2 ring-primary/50' : '',
                gameState.lastMove?.to.x === x && gameState.lastMove?.to.y === y ? 'ring-2 ring-primary' : ''
            ]"
          >
            <!-- Terrain Labels -->
            <span v-if="isDen(x, y)" class="text-lg absolute pointer-events-none opacity-50">🏠</span>
            <span v-if="isTrap(x, y)" class="text-lg absolute pointer-events-none opacity-30">🕸️</span>
            <span v-if="isRiver(x, y)" class="text-lg absolute pointer-events-none animate-pulse opacity-50">🌊</span>
            
            <!-- Piece -->
            <div
              v-if="cell"
              class="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-transform border-2 z-10"
              :class="getPieceClass(cell, x, y)"
            >
              {{ getPieceName(cell.type) }}
            </div>
          </div>
        </div>
      </div>

      <div class="text-xl font-bold opacity-80 flex items-center gap-2">
        <div 
            class="w-4 h-4 rounded-full border-2"
            :class="gameState.turn === 0 ? 'bg-success/10 border-success' : 'bg-error/10 border-error'"
        ></div>
        <span>{{ getPlayerName(gameState.turn) }} {{ formatTime(currentDisplayTime) }}</span>
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
                :class="move.turn === 0 ? 'bg-success/10 border-success' : 'bg-error/10 border-error'"
            ></div>
            <span class="font-medium">{{ getPieceName(move.piece.type) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span>({{ move.from.x }},{{ move.from.y }})</span>
            <Icon icon="mdi:arrow-right" class="text-xs opacity-50" />
            <span>({{ move.to.x }},{{ move.to.y }})</span>
            <span v-if="move.captured" class="badge badge-error badge-xs ml-1">吃</span>
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
