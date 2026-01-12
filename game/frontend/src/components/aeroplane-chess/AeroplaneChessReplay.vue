<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick, onMounted } from 'vue';
import AeroplaneChessBoard from './AeroplaneChessBoard.vue';
import { AeroplaneColor } from './board';
import { AeroplaneGameState } from './useAeroplaneChess';
import Icon from '@/components/common/Icon.vue';

interface AeroplaneHistoryItem {
  playerId: string;
  action: 'roll' | 'move';
  roll?: number;
  pieceIndex?: number;
  to?: string;
  text: string;
  timestamp: number;
}

interface AeroplanePiece {
  index: 0 | 1 | 2 | 3;
  area: 'hangar' | 'main' | 'home' | 'finish';
  pos: string;
  posIndex: number;
}

interface AeroplanePlayerState {
  playerId: string;
  color: AeroplaneColor;
  pieces: AeroplanePiece[];
}

const props = defineProps<{
  history: AeroplaneHistoryItem[];
  players: { id: string; name: string; color: AeroplaneColor }[];
}>();

// --- Playback State ---
const currentStep = ref(0);
const currentTime = ref(0);
const isPlaying = ref(false);
const playbackSpeed = ref(1);
let animationFrame: number | null = null;
let lastTimestamp = 0;
const isAutoStepping = ref(false);

const cellPx = ref(34);
const moveListRef = ref<HTMLElement | null>(null);
const mainRef = ref<HTMLElement | null>(null);
onMounted(() => {
  if (mainRef.value) {
    const w = mainRef.value.clientWidth;
    cellPx.value = Math.max(Math.min(34, Math.floor((w - 32) / 17)), 24);
  }
});
// --- Game Logic ---

const currentState = computed<AeroplaneGameState>(() => {
  // Initialize state
  const players: Record<string, AeroplanePlayerState> = {};
  
  props.players.forEach(p => {
    players[p.id] = {
      playerId: p.id,
      color: p.color,
      pieces: [0, 1, 2, 3].map(n => ({
        index: n as 0|1|2|3,
        area: 'hangar',
        pos: `${p.color}h${n}`,
        posIndex: -1
      }))
    };
  });

  // Apply history up to step
  for (let i = 0; i < currentStep.value; i++) {
    const item = props.history[i];
    if (item.action === 'move' && item.pieceIndex !== undefined && item.to) {
      const p = players[item.playerId];
      if (p) {
        const piece = p.pieces.find(pc => pc.index === item.pieceIndex);
        if (piece) {
          piece.pos = item.to;
          // Update area
          if (piece.pos.includes('h')) {
            piece.area = 'hangar';
          } else if (piece.pos.endsWith('19') && piece.pos.startsWith(p.color)) {
             piece.area = 'finish';
          } else {
            piece.area = 'main'; // or home
          }
          
          // Check for captures
          Object.values(players).forEach(otherP => {
            if (otherP.playerId === item.playerId) return;
            otherP.pieces.forEach(otherPiece => {
              if (otherPiece.area !== 'hangar' && otherPiece.area !== 'finish' && otherPiece.pos === piece.pos) {
                // Capture!
                otherPiece.area = 'hangar';
                otherPiece.pos = `${otherP.color}h${otherPiece.index}`;
                otherPiece.posIndex = -1;
              }
            });
          });
        }
      }
    }
  }

  return { players } as any as AeroplaneGameState;
});

const currentHistoryItem = computed(() => {
  if (currentStep.value === 0) return null;
  return props.history[currentStep.value - 1];
});

// --- Playback Control ---

function togglePlay() {
  if (isPlaying.value) {
    pause();
  } else {
    play();
  }
}

function play() {
  if (currentStep.value >= props.history.length) {
    currentStep.value = 0;
    currentTime.value = 0;
  }
  isPlaying.value = true;
  lastTimestamp = 0;
  animationFrame = requestAnimationFrame(loop);
}

function pause() {
  isPlaying.value = false;
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  lastTimestamp = 0;
}

function setSpeed(speed: number) {
  playbackSpeed.value = speed;
}

function jumpToStep(step: number) {
  currentStep.value = step;
  pause();
}

function loop(timestamp: number) {
  if (!isPlaying.value) return;
  
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  
  currentTime.value += delta * playbackSpeed.value;
  
  // Advance steps if needed
  let step = currentStep.value;
  
  const startTime = props.history.length > 0 ? props.history[0].timestamp : 0;
  
  while (step < props.history.length) {
      const itemTime = props.history[step].timestamp - startTime;
      if (currentTime.value >= itemTime) {
          step++;
      } else {
          break;
      }
  }

  if (step !== currentStep.value) {
    isAutoStepping.value = true;
    currentStep.value = step;
  }

  if (currentStep.value >= props.history.length) {
    pause();
  } else {
    animationFrame = requestAnimationFrame(loop);
  }
}

// Watchers

watch(currentStep, () => {
  nextTick(() => {
    if (!moveListRef.value) return;
    const activeEl = moveListRef.value.querySelector('.active-move');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
});

watch(isPlaying, (playing) => {
  if (playing) {
    if (currentStep.value >= props.history.length) {
      currentStep.value = 0;
      currentTime.value = 0;
    }
    lastTimestamp = 0;
    animationFrame = requestAnimationFrame(loop);
  } else {
    pause();
  }
});

watch(currentStep, (newStep) => {
  if (isAutoStepping.value) {
    isAutoStepping.value = false;
    return;
  }
  // Manual jump - update time
  if (props.history.length > 0) {
      const startTime = props.history[0].timestamp;
      const targetTime = newStep > 0 ? props.history[newStep - 1].timestamp : startTime;
      currentTime.value = targetTime - startTime;
  } else {
      currentTime.value = 0;
  }
});

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Helpers
function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getPlayerName(id: string) {
  return props.players.find(p => p.id === id)?.name || id;
}

function getPlayerColor(id: string) {
    return props.players.find(p => p.id === id)?.color || 'gray';
}

</script>

<template>
  <section class="flex flex-col md:flex-row gap-4 h-full overflow-hidden p-4">
    <!-- Game Area -->
    <section ref="mainRef" class="flex-1 h-full flex flex-col items-center justify-center bg-base-200 rounded-lg relative overflow-hidden">
        <div class="absolute top-4 left-4 text-sm opacity-60 font-mono z-10">
            {{ formatTime(currentTime) }}
        </div>
        
        <div class="w-full h-full overflow-auto flex md:items-center md:justify-center p-4">
             <AeroplaneChessBoard
                :state="currentState"
                :my-player-id="''"
                :movable="[]"
                :can-move="false"
                :cell-px="cellPx"
                :style="{
                  fontSize: cellPx - 2 + 'px'
                }"
            />
        </div>
        
        <div class="absolute bottom-4 left-0 right-0 text-center pointer-events-none z-11">
             <div class="inline-block bg-base-100/80 backdrop-blur px-4 py-2 rounded-full shadow text-lg font-bold text-primary">
                {{ currentHistoryItem?.text || '游戏开始' }}
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
            <span class="font-medium" :style="{ color: getPlayerColor(move.playerId) }">{{ getPlayerName(move.playerId) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs">{{ move.text }}</span>
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
