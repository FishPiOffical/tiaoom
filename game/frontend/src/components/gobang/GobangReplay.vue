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
  // Gobang logic is simpler: just alternate turns.
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
  const size = 19;
  let board = Array.from({ length: size }, () => Array(size).fill(0));
  
  const steps = Math.min(currentStep.value, props.history.length);
  let player = 1;

  for (let i = 0; i < steps; i++) {
    const move = props.history[i];
    const place = move.place;
    const y = place.charCodeAt(0) - 65;
    const x = 19 - parseInt(place.slice(1));
    
    if (x >= 0 && x < size && y >= 0 && y < size) {
      board[x][y] = player;
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
      <div class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto">
        <!-- Top Coordinates -->
        <div class="flex">
          <div class="w-[6vw] md:w-7 h-[6vw] md:h-7"></div>
          <div v-for="col in 19" :key="col" class="w-[6vw] md:w-7 h-[6vw] md:h-7"></div>
          <div class="w-[6vw] md:w-7 h-[6vw] md:h-7"></div>
        </div>
        
        <div v-for="(row, rowIndex) in currentBoard" :key="rowIndex" class="flex">
          <!-- Left Coordinates -->
          <div class="w-[6vw] md:w-7 h-[6vw] md:h-7 flex items-center justify-center text-base-content/30 text-xs md:text-xs">
            {{ 19 - rowIndex }}
          </div>
          
          <!-- Board Cells -->
          <div 
            v-for="(cell, colIndex) in row" 
            :key="colIndex"
            class="relative w-[6vw] h-[6vw] md:w-7 md:h-7 flex items-center justify-center"
          >
            <!-- Grid Lines -->
            <div class="absolute bg-base-content/30 h-px top-1/2 -translate-y-1/2 z-0"
              :class="[
                colIndex === 0 ? 'left-1/2 w-1/2' : (colIndex === row.length - 1 ? 'left-0 w-1/2' : 'left-0 w-full')
              ]"
            ></div>
            <div class="absolute bg-base-content/30 w-px left-1/2 -translate-x-1/2 z-0"
              :class="[
                rowIndex === 0 ? 'top-1/2 h-1/2' : (rowIndex === 18 ? 'top-0 h-1/2' : 'top-0 h-full')
              ]"
            ></div>
            <!-- Star Points -->
            <div v-if="[3, 9, 15].includes(rowIndex) && [3, 9, 15].includes(colIndex)" class="absolute w-1.5 h-1.5 bg-base-content/80 rounded-full z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            
            <!-- Pieces -->
            <span 
              v-if="cell > 0"
              class="w-[4.5vw] h-[4.5vw] md:w-6 md:h-6 rounded-full z-10 relative transition-all duration-200"
              :class="[
                cell === 1 ? 'bg-black border border-white/20 shadow-lg' : 'bg-white border border-black/20 shadow-lg',
              ]"
            />
            
            <!-- Last move highlight -->
            <div 
              v-if="currentStep > 0 && props.history[currentStep-1]"
              class="absolute inset-0 pointer-events-none z-20"
            >
               <div v-if="(19 - parseInt(props.history[currentStep-1].place.slice(1))) === rowIndex && (props.history[currentStep-1].place.charCodeAt(0) - 65) === colIndex"
                    class="w-full h-full flex items-center justify-center">
                  <div class="w-2 h-2 bg-error rounded-full ring-2 ring-white"></div>
               </div>
            </div>
          </div>
          
          <!-- Right Coordinates -->
          <div class="w-[6vw] md:w-7 h-[6vw] md:h-7"></div>
        </div>
        
        <!-- Bottom Coordinates -->
        <div class="flex">
          <div class="w-[6vw] md:w-7"></div>
          <div v-for="col in 19" :key="col" class="w-[6vw] md:w-7 h-[6vw] md:h-7 flex items-center justify-center text-base-content/30 text-xs md:text-xs">
            {{ String.fromCharCode(64 + col) }}
          </div>
          <div class="w-[6vw] md:w-7"></div>
        </div>
      </div>

      <!-- Status -->
      <div class="flex items-center justify-center gap-3 mt-4 text-lg p-1">
        <div class="w-5 h-5 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
          <span 
            class="w-4 h-4 rounded-full"
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
  /* No specific styles needed as we use tailwind classes */
</style>
