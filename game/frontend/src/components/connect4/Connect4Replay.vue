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

// --- Replay Logic ---

const historyWithDetails = computed(() => {
  // Connect4 logic: alternate turns.
  // Black (1) starts first.
  let player = 1; 
  
  return props.history.map((move) => {
    const color = player;
    player = 3 - player; // Switch 1 <-> 2
    return {
      ...move,
      color
    };
  });
});

const boardState = computed(() => {
  const rows = 8;
  const cols = 8;
  let board = Array.from({ length: rows }, () => Array(cols).fill(-1));
  // Init bottom row as 0 (playable)
  board[rows - 1] = board[rows - 1].map(() => 0);
  
  const steps = Math.min(currentStep.value, props.history.length);
  let player = 1;

  for (let i = 0; i < steps; i++) {
    const move = props.history[i];
    const place = move.place;
    const y = place.charCodeAt(0) - 65;
    const x = 8 - parseInt(place.slice(1));
    
    if (x >= 0 && x < rows && y >= 0 && y < cols) {
      board[x][y] = player;
      // Activate cell above
      if (x - 1 >= 0 && board[x - 1][y] === -1) {
        board[x - 1][y] = 0;
      }
    }
    player = 3 - player;
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
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden">
    <!-- Board Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4 select-none">
      <div class="relative inline-block bg-base-300 p-3 rounded-lg shadow-2xl m-auto select-none">
        <div class="grid grid-cols-[auto_max-content_auto]">
          <!-- Top Labels -->
          <div></div>
          <div class="flex pl-[4px] mb-1">
            <div v-for="i in 8" :key="i" class="flex items-center justify-center w-12 md:w-16 text-base-content/50 font-mono font-bold text-lg">
              {{ String.fromCharCode(64 + i) }}
            </div>
          </div>
          <div></div>

          <!-- Left Labels -->
          <div class="flex flex-col pt-[4px] mr-1">
            <div v-for="i in 8" :key="i" class="flex items-center justify-center w-8 h-12 md:h-16 text-base-content/50 font-mono font-bold text-lg">
              {{ 9 - i }}
            </div>
          </div>

          <!-- Board -->
          <div class="flex flex-col bg-base-200 rounded border-4 border-base-content/20 overflow-hidden relative">
            <div v-for="(row, rowIndex) in currentBoard" :key="rowIndex" class="flex">
              <div 
                v-for="(cell, colIndex) in row" 
                :key="colIndex" 
                class="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center border border-base-content/10"
              >
                <!-- Hole Background -->
                <div class="w-10 h-10 md:w-14 md:h-14 rounded-full bg-base-content/10 shadow-inner"></div>

                <!-- Pieces -->
                <span 
                  v-if="cell > 0"
                  class="absolute w-10 h-10 md:w-14 md:h-14 rounded-full shadow-lg transition-all duration-200"
                  :class="[
                    cell === 1 ? 'bg-black border border-white/20' : 'bg-white border border-black/20',
                  ]"
                />
                
                <!-- Last move highlight -->
                <div 
                  v-if="currentStep > 0 && props.history[currentStep-1]"
                  class="absolute inset-0 pointer-events-none z-20"
                >
                   <div v-if="(8 - parseInt(props.history[currentStep-1].place.slice(1))) === rowIndex && (props.history[currentStep-1].place.charCodeAt(0) - 65) === colIndex"
                        class="w-full h-full flex items-center justify-center">
                      <div class="w-2 h-2 bg-error rounded-full ring-2 ring-white"></div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Labels -->
          <div class="flex flex-col pt-[4px] ml-1">
            <div v-for="i in 8" :key="i" class="flex items-center justify-center w-8 h-12 md:h-16 text-base-content/50 font-mono font-bold text-lg">
              {{ 9 - i }}
            </div>
          </div>

          <!-- Bottom Labels -->
          <div></div>
          <div class="flex pl-[4px] mt-1">
            <div v-for="i in 8" :key="i" class="flex items-center justify-center w-12 md:w-16 text-base-content/50 font-mono font-bold text-lg">
              {{ String.fromCharCode(64 + i) }}
            </div>
          </div>
          <div></div>
        </div>
      </div>

      <!-- Status -->
      <div class="flex items-center justify-center gap-3 mt-4 text-lg p-1">
        <div class="w-6 h-6 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
          <span 
            class="w-5 h-5 rounded-full"
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
</template>

<style scoped>
  /* No specific styles needed as we use tailwind classes */
</style>
