<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import Icon from '@/components/common/Icon.vue';
import { IRoomMessage } from '@/api';

const props = defineProps<{
  history: { place: string; time: number }[];
  players: { name: string; color: number }[];
  message: IRoomMessage[];
}>();

const currentStep = ref(0);
const isPlaying = ref(false);
const playbackSpeed = ref(1);
const currentTime = ref(0);
let rafId: number | null = null;
let lastFrameTime = 0;
const isAutoStepping = ref(false);

function togglePlay() {
  isPlaying.value = !isPlaying.value;
}

function setSpeed(speed: number) {
  playbackSpeed.value = speed;
}

function stopPlay() {
  isPlaying.value = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastFrameTime = 0;
}

function loop(timestamp: number) {
  if (!isPlaying.value) return;
  
  if (!lastFrameTime) lastFrameTime = timestamp;
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  currentTime.value += delta * playbackSpeed.value;

  // Advance steps if needed
  let step = currentStep.value;
  while (step < props.history.length && currentTime.value >= props.history[step].time) {
    step++;
  }

  if (step !== currentStep.value) {
    isAutoStepping.value = true;
    currentStep.value = step;
  }

  if (currentStep.value >= props.history.length) {
    stopPlay();
    // Ensure time matches end
    if (props.history.length > 0) {
        currentTime.value = props.history[props.history.length - 1].time;
    }
  } else {
    rafId = requestAnimationFrame(loop);
  }
}

watch(isPlaying, (playing) => {
  if (playing) {
    if (currentStep.value >= props.history.length) {
      currentStep.value = 0;
      currentTime.value = 0;
    }
    lastFrameTime = 0;
    rafId = requestAnimationFrame(loop);
  } else {
    stopPlay();
  }
});

watch(currentStep, (newStep) => {
  if (isAutoStepping.value) {
    isAutoStepping.value = false;
    return;
  }
  // Manual jump
  currentTime.value = newStep > 0 ? props.history[newStep - 1].time : 0;
});

onUnmounted(() => {
  stopPlay();
});

// --- Game Logic (Ported from backend) ---

function isValidPlace(board: number[][], { x, y }: { x: number; y: number }, player: number) {
  const piece = board[x][y];
  const size = board.length;
  if ([1, 2].includes(piece)) return false;

  const piecesValid: {x: number, y: number}[] = [];
  const pieces: {x: number, y: number}[] = [];

  function checkPieces(x: number, y: number) {
    const piece = board[x][y];
    if (![1, 2].includes(piece)) {
      return false;
    }
    if ((piece ^ player) === 3) {
      pieces.push({x, y});
    }
    if (piece === player) {
      piecesValid.push(...pieces);
      return false;
    }
  }

  for(let i = x - 1; i >= 0; i--) {
    if(checkPieces(i, y) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1; i < size; i++) {
    if(checkPieces(i, y) === false) break;
  }

  pieces.length = 0;
  for(let i = y - 1; i >= 0; i--) {
    if(checkPieces(x, i) === false) break;
  }

  pieces.length = 0;
  for(let i = y + 1; i < size; i++) {
    if(checkPieces(x, i) === false) break;
  }

  pieces.length = 0;
  for(let i = x - 1, j = y - 1; i >= 0 && j >= 0; i--, j--) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1, j = y - 1; i < size && j >= 0; i++, j--) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1, j = y + 1; i < size && j < size; i++, j++) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x - 1, j = y + 1; i >= 0 && j < size; i--, j++) {
    if(checkPieces(i, j) === false) break;
  }

  return piecesValid.length > 0;
}

function markValidPlaces(board: number[][], player: number) {
  const size = board.length;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if ([1, 2].includes(board[i][j])) continue;
      if (!isValidPlace(board, {x: i, y: j}, player))
        board[i][j] = -1;
      else
        board[i][j] = 0; 
    }
  }
  return board;
}

function checkOthelloMove(board: number[][], { x, y }: { x: number, y: number }, player: number): false | number[][] {
  const size = board.length;
  
  if (board[x][y] === 1 || board[x][y] === 2) return false; 
  
  const directions = [
    [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]
  ];
  const opponent = player === 1 ? 2 : 1;
  let valid = false;
  const toFlip: number[][] = [];

  for (const [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let pieces: number[][] = [];
    let foundOpponent = false;
    while (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      if (board[nx][ny] === opponent) {
        pieces.push([nx, ny]);
        foundOpponent = true;
      } else if (board[nx][ny] === player && foundOpponent) {
        toFlip.push(...pieces);
        valid = true;
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }

  if (!valid) return false;

  const newBoard = board.map(row => row.slice());
  newBoard[x][y] = player;
  for (const [fx, fy] of toFlip) {
    newBoard[fx][fy] = player;
  }

  return markValidPlaces(newBoard, 3 - player);
}

// --- Replay Logic ---

const historyWithDetails = computed(() => {
  const size = 8;
  let board = Array.from({ length: size }, () => Array(size).fill(-1));
  // Init
  board[size / 2 - 1][size / 2 - 1] = 2; 
  board[size / 2][size / 2] = 2;         
  board[size / 2 - 1][size / 2] = 1;     
  board[size / 2][size / 2 - 1] = 1;     
  
  let player = 1; // Black starts
  markValidPlaces(board, player);

  return props.history.map((move) => {
    const place = move.place;
    const y = place.charCodeAt(0) - 65;
    const x = 8 - parseInt(place.slice(1));
    
    // Check if current player can move
    let hasValidMove = board.flat().some(c => c === 0);
    
    if (!hasValidMove) {
      player = 3 - player;
      markValidPlaces(board, player);
      hasValidMove = board.flat().some(c => c === 0);
    }
    
    const color = player;
    
    const result = checkOthelloMove(board, { x, y }, player);
    if (result) {
      board = result;
      player = 3 - player;
    } else {
      console.warn("Invalid move in replay:", place);
    }
    
    return {
      ...move,
      color
    };
  });
});

const boardState = computed(() => {
  const size = 8;
  let board = Array.from({ length: size }, () => Array(size).fill(-1));
  // Init
  board[size / 2 - 1][size / 2 - 1] = 2; 
  board[size / 2][size / 2] = 2;         
  board[size / 2 - 1][size / 2] = 1;     
  board[size / 2][size / 2 - 1] = 1;     
  
  let player = 1; // Black starts
  markValidPlaces(board, player);

  const steps = Math.min(currentStep.value, props.history.length);
  
  for (let i = 0; i < steps; i++) {
    const move = props.history[i];
    const place = move.place;
    const y = place.charCodeAt(0) - 65;
    const x = 8 - parseInt(place.slice(1));
    
    // Check if current player can move
    let hasValidMove = board.flat().some(c => c === 0);
    
    if (!hasValidMove) {
      player = 3 - player;
      markValidPlaces(board, player);
      hasValidMove = board.flat().some(c => c === 0);
    }
    
    const result = checkOthelloMove(board, { x, y }, player);
    if (result) {
      board = result;
      player = 3 - player;
    } else {
      console.warn("Invalid move in replay:", place);
    }
  }
  
  return { board, currentPlayer: player };
});

const currentBoard = computed(() => boardState.value.board);
const currentPlayer = computed(() => boardState.value.currentPlayer);

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function getPlayerName(color: number) {
  const p = props.players.find(p => p.color === color);
  return p ? p.name : (color === 1 ? '黑方' : '白方');
}

</script>

<template>
  <section v-if="history.length" class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden">
    <!-- Board Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4 select-none">
      <div class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto">
        <!-- Top Coordinates -->
        <div class="flex">
          <div class="w-[8vw] md:w-8 h-8 md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
          <div v-for="colIndex in 8" :key="'col-top-' + colIndex" 
               class="w-[8vw] md:w-8 h-8 md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60">
            {{ String.fromCharCode(64 + colIndex) }}
          </div>
          <div class="w-[8vw] md:w-8 h-8 md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
        </div>
        
        <!-- Board Rows -->
        <div v-for="(row, rowIndex) in currentBoard" :key="rowIndex" class="flex">
          <!-- Left Coordinates -->
          <div class="w-[8vw] md:w-8 h-[8vw] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60">
            {{ 8 - rowIndex }}
          </div>
          <div 
            v-for="(cell, colIndex) in row" 
            :key="colIndex" 
            class="relative w-[8vw] h-[8vw] md:w-8 md:h-8 flex items-center justify-center border border-base-content/10"
          >
            <span 
              v-if="cell > 0"
              class="w-[7vw] h-[7vw] md:w-7 md:h-7 rounded-full transition-all duration-500 z-10"
              :class="[
                cell === 1 ? 'black-piece border border-base-content/20 shadow-lg' : 'white-piece shadow-lg',
              ]"
            />
            <!-- Last move highlight -->
            <div 
              v-if="currentStep > 0 && props.history[currentStep-1]"
              class="absolute inset-0 pointer-events-none"
            >
               <div v-if="(8 - parseInt(props.history[currentStep-1].place.slice(1))) === rowIndex && (props.history[currentStep-1].place.charCodeAt(0) - 65) === colIndex"
                    class="w-full h-full ring-2 ring-error rounded-sm"></div>
            </div>
          </div>
          <!-- Right Coordinates -->
          <div class="w-[8vw] md:w-8 h-[8vw] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60">
            {{ 8 - rowIndex }}
          </div>
        </div>
        
        <!-- Bottom Coordinates -->
        <div class="flex">
          <div class="w-[8vw] md:w-8 h-8 md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
          <div v-for="colIndex in 8" :key="'col-bottom-' + colIndex" 
               class="w-[8vw] md:w-8 h-8 md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60">
            {{ String.fromCharCode(64 + colIndex) }}
          </div>
          <div class="w-[8vw] md:w-8 h-8 md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
        </div>
      </div>

      <!-- Status -->
      <div class="flex items-center justify-center gap-3 mt-4 text-lg p-1">
        <div class="w-6 h-6 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
          <span 
            class="w-full h-full rounded-full"
            :class="currentPlayer === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
          />
        </div>
        <b class="text-base-content">{{ getPlayerName(currentPlayer) }}</b>
        <span class="text-base opacity-60 font-mono ml-2">
          {{ formatTime(currentTime) }}
        </span>
      </div>
    </section>

    <!-- History / Controls -->
    <aside class="w-full md:w-80 flex-none border-t md:border-t-0 md:border-l border-base-content/20 md:pt-0 md:pl-4 flex flex-col h-[50vh] md:h-full">
      <h3 class="text-lg font-bold p-2 flex items-center gap-2">
        <span class="flex items-center gap-2">
          <Icon icon="mdi:history" />
          对局记录
        </span>
        <span>
          
        </span>
      </h3>
      
      <div class="flex-1 overflow-y-auto space-y-1 pr-2">
        <div 
          class="p-2 rounded cursor-pointer hover:bg-base-200 transition-colors flex justify-between items-center"
          :class="{ 'bg-primary text-primary-content hover:bg-primary': currentStep === 0 }"
          @click="currentStep = 0"
        >
          <span>开始</span>
          <span class="text-xs opacity-70">00:00</span>
        </div>
        <div 
          v-for="(move, index) in historyWithDetails" 
          :key="index"
          class="p-2 rounded cursor-pointer hover:bg-base-200 transition-colors flex justify-between items-center"
          :class="{ 'bg-primary text-primary-content hover:bg-primary': currentStep === index + 1 }"
          @click="currentStep = index + 1"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono w-6 text-right">{{ index + 1 }}.</span>
            <div class="w-3 h-3 rounded-full border border-base-content/20 shadow-sm"
                 :class="move.color === 1 ? 'bg-black' : 'bg-white'"></div>
            <span class="font-bold">{{ move.place }}</span>
          </div>
          <span class="text-xs opacity-70">{{ formatTime(move.time) }}</span>
        </div>
      
        <!-- Controls -->
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
  <section v-else class="flex flex-col items-center justify-center h-full p-4">
    <Icon icon="mdi:history" class="text-6xl text-base-content/30 mb-4" />
    <span class="text-base-content/50 text-lg">无回放数据</span>
  </section>
</template>

<style scoped>
  .white-piece {
    background: white;
    color: black;
    transform: rotateY(0deg);
    border: 1px solid rgba(0,0,0,0.2);
  }
  .black-piece {
    background: black;
    color: white;
    transform: rotateY(180deg);
    border: 1px solid rgba(255,255,255,0.2);
  }
</style>