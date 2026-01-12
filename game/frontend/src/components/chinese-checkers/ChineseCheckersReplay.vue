<template>
  <div class="flex flex-col lg:flex-row h-full gap-4 p-4">
    <!-- Left: Board -->
    <div class="flex-1 flex flex-col items-center justify-center bg-base-200 rounded-box p-4">
       <!-- Players Info -->
      <div class="w-full max-w-[600px] flex flex-wrap gap-4 justify-center pb-4">
        <div v-for="(p, i) in players" :key="p.id"
             class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all shadow-sm"
             :class="[
               {
                 'scale-110 ring-2 ring-primary ring-offset-2 z-10': currentPlayerColor === p.color,
                 'opacity-60 grayscale': currentPlayerColor !== p.color
               },
               getZoneData(p.color).border,
               currentPlayerColor === p.color ? 'bg-base-100 text-base-content' : '',
               currentPlayerColor !== p.color ? getZoneData(p.color).text : ''
             ]">
          <div class="w-3 h-3 rounded-full shadow-inner" :class="getZoneData(p.color).bg"></div>
          <span>{{ p.name }}</span>
        </div>
      </div>

      <!-- Game Board -->
      <div class="relative w-full max-w-[600px] aspect-square select-none p-4">
        <svg viewBox="-140 -140 280 280" class="w-full h-full drop-shadow-2xl filter transition-transform duration-700 ease-in-out"
            :style="{ transform: `rotate(${boardRotation}deg)` }">
            <!-- Board Base -->
            <polygon class="fill-base-300 stroke-base-content/10 stroke-1" points="" />

            <!-- Holes -->
            <g v-for="h in hexes" :key="h.key">
                <circle :cx="h.x" :cy="h.y" r="4.8" 
                   class="transition-colors duration-200 stroke-base-content/50 stroke-[0.5] fill-base-content/20" />
            </g>
            
            <!-- Pieces -->
            <g v-for="piece in pieceList" :key="piece.key">
                 <circle :cx="piece.x" :cy="piece.y" r="4.5"
                    class="transition-all duration-300 shadow-sm"
                    :class="[
                        getZoneData(getPlayerColorCode(piece.pid)).fill,
                        {
                            'opacity-80': lastMoveFrom === piece.key,
                            'stroke-2 stroke-base-100': true
                        }
                    ]"
                    style="filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.3));"
                 />
                 <!-- Highlight last moved piece target -->
                 <circle v-if="lastMoveTo === piece.key" :cx="piece.x" :cy="piece.y" r="4.5"
                    class="fill-base-content animate-ping opacity-30 pointer-events-none" />
            </g>

            <!-- Animating Piece -->
            <circle v-if="animatingPiece" :cx="animatingPiece.x" :cy="animatingPiece.y" r="4.8"
                class="transition-none shadow-lg pointer-events-none z-10"
                :class="[
                    getZoneData(animatingPiece.color).fill,
                    'stroke-2 stroke-base-100'
                ]"
                style="filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.4));"
            />
        </svg>
      </div>
      
       <!-- Playback Controls (Moved to Right Side) -->
    </div>

    <!-- Right: History -->
    <div class="w-full lg:w-80 bg-base-100 rounded-box flex flex-col shadow-lg overflow-hidden h-[600px] lg:h-auto">
      <div class="p-4 bg-base-200 font-bold text-lg flex justify-between items-center">
        <span>对局记录</span>
        <span class="badge badge-neutral">{{ history.length }} 手</span>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1" ref="historyContainer">
         <div v-for="(move, index) in history" :key="index"
             @click="jumpToStep(index + 1)"
             class="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-base-200 transition-colors"
             :class="currentStep === index + 1 ? 'bg-primary text-primary-content font-bold' : 'opacity-70'">
             <span class="w-8 text-right opacity-50">{{ index + 1 }}.</span>
             
             <!-- Player Icon -->
             <div class="w-3 h-3 rounded-full shadow-inner" :class="getZoneData(move.color).bg"></div>
             
             <div class="flex-1 text-sm flex gap-1">
                 <span>{{ getPlayerName(move.color) }}</span>
                 <span class="opacity-70">移动</span>
             </div>
             
             <span class="text-xs font-mono opacity-50">{{ formatTime(move.time) }}</span>
         </div>
         
         <div v-if="history.length === 0" class="text-center p-8 opacity-50">
             暂无记录
         </div>
      </div>

         <!-- Controls -->
      <div class="p-4 bg-base-200 border-t border-base-content/10 flex flex-col gap-2">
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
          <button class="btn btn-circle btn-sm" @click="jumpToStep(currentStep - 1)" :disabled="currentStep <= 0">
            <Icon icon="mdi:skip-previous" />
          </button>
          
          <button class="btn btn-circle btn-primary" @click="togglePlay">
            <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" class="text-xl" />
          </button>
          
          <button class="btn btn-circle btn-sm" @click="jumpToStep(currentStep + 1)" :disabled="currentStep >= history.length">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import Icon from '@/components/common/Icon.vue'

// --- Types ---
interface Hex {
    q: number;
    r: number;
    s: number;
    x: number;
    y: number;
    key: string;
}

interface Move {
    color: number; // 0-5
    path: { q: number, r: number }[];
    time: number;
}

const props = defineProps<{
    history: Move[];
    players: { id: string, name: string, color: number }[];
    beginTime?: number;
}>();

// --- Constants ---
const HEX_SIZE = 10;
const ZONES = [
  { fill: 'fill-primary', text: 'text-primary', border: 'border-primary', bg: 'bg-primary', name: 'primary' },
  { fill: 'fill-accent', text: 'text-accent', border: 'border-accent', bg: 'bg-accent', name: 'accent' },
  { fill: 'fill-secondary', text: 'text-secondary', border: 'border-secondary', bg: 'bg-secondary', name: 'secondary' },
  { fill: 'fill-info', text: 'text-info', border: 'border-info', bg: 'bg-info', name: 'info' },
  { fill: 'fill-error', text: 'text-error', border: 'border-error', bg: 'bg-error', name: 'error' },
  { fill: 'fill-warning', text: 'text-warning', border: 'border-warning', bg: 'bg-warning', name: 'warning' },
];

function getZoneData(idx: number) {
    return ZONES[idx % ZONES.length];
}

function fillOpacity(zoneIdx: number) {
    // Return CSS class for zone background
    const z = getZoneData(zoneIdx);
    // We want a very light background. fill-primary/20
    // But Tailwind arbitrary values might be better or just using style.
    // Let's rely on standard classes.
    // However, tailwind classes like 'fill-primary/20' might not work directly if not safelisted.
    // But ChineseCheckersRoom uses 'fill-base-content/20'.
    // Let's use matching zone color but low opacity.
    return z.fill + '/20';
}

function getPlayerName(color: number) {
    return props.players.find(p => p.color === color)?.name || 'Unknown';
}

function formatTime(ms?: number) {
  if (ms === undefined || ms === null) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// --- Hex Grid Logic (Copied from Room) ---
const hexes: Hex[] = [];
for (let q = -8; q <= 8; q++) {
    for (let r = -8; r <= 8; r++) {
        const s = -q - r;
        if (Math.abs(s) > 8) continue;
        const inInv = q <= 4 && r <= 4 && s <= 4;
        const inUpr = q >= -4 && r >= -4 && s >= -4;
        if (inInv || inUpr) {
             const x = HEX_SIZE * Math.sqrt(3) * (q + r/2);
             const y = HEX_SIZE * 3/2 * r;
             hexes.push({ q, r, s, x, y, key: `${q},${r}` });
        }
    }
}

function getHexZoneIndex(q: number, r: number, s: number): number {
    if (Math.abs(q) <= 4 && Math.abs(r) <= 4 && Math.abs(s) <= 4) return -1;
    if (r > 4) return 0;
    if ((-q-r) < -4) return 1;
    if (q > 4) return 2;
    if (r < -4) return 3;
    if ((-q-r) > 4) return 4;
    if (q < -4) return 5;
    return -1;
}

function getHex(key: string) {
    return hexes.find(h => h.key === key);
}

// --- Replay Logic ---
const currentStep = ref(0);
const isPlaying = ref(false);
const historyContainer = ref<HTMLElement | null>(null);

const animatingPiece = ref<{ x: number, y: number, color: number } | null>(null);
const hiddenPieceKey = ref<string | null>(null);
let animationHandle: number | null = null;
const ANMIATION_MS_PER_STEP = 300; 

const gameState = computed(() => {
    // Reconstruct board at currentStep
    const board: Record<string, string> = {}; // key -> pid
    
    // 1. Initial State
    props.players.forEach(p => {
        // Find all hexes in p.color zone
        hexes.forEach(h => {
             if (getHexZoneIndex(h.q, h.r, h.s) === p.color) {
                 board[h.key] = p.id;
             }
        });
    });

    // 2. Apply Moves
    let lastFrom = null;
    let lastTo = null;
    let turnColor = -1;

    for (let i = 0; i < currentStep.value; i++) {
        const move = props.history[i];
        if (!move) break;
        
        turnColor = move.color;
        // Find player id
        const p = props.players.find(pl => pl.color === move.color);
        if (!p) continue; // Should not happen
        
        const start = move.path[0];
        const end = move.path[move.path.length - 1];
        const startKey = `${start.q},${start.r}`;
        const endKey = `${end.q},${end.r}`;
        
        delete board[startKey];
        board[endKey] = p.id;
        
        lastFrom = startKey;
        lastTo = endKey;
    }

    // Determine current display time
    const time = currentStep.value > 0 ? props.history[currentStep.value - 1].time : 0;
    
    return {
        board,
        lastFrom,
        lastTo,
        turnColor: currentStep.value < props.history.length ? props.history[currentStep.value].color : -1,
        time
    };
});

const pieceList = computed(() => {
    return Object.entries(gameState.value.board).map(([key, pid]) => {
        if (key === hiddenPieceKey.value) return null;
        const h = getHex(key);
        if (!h) return null;
        return { ...h, pid };
    }).filter(Boolean) as (Hex & { pid: string })[];
});

const lastMoveFrom = computed(() => gameState.value.lastFrom);
const lastMoveTo = computed(() => gameState.value.lastTo);
const currentDisplayTime = computed(() => gameState.value.time);
const currentPlayerColor = computed(() => gameState.value.turnColor);

function getPlayerColorCode(pid: string) {
    return props.players.find(p => p.id === pid)?.color ?? 0;
}

const boardRotation = computed(() => {
    // If "I" am playing, rotate (not applicable in replay really, maybe just 0 or rotate to first player?)
    // Default 0 for now. Or maybe configurable.
    // If we want to view from perspective of current mover? No, too dizzy.
    return 0;
});

// Playback Implementation
const playbackSpeed = ref(1);
let timer: any = null;

function togglePlay() {
    // Check if at end, restart
    if (currentStep.value >= props.history.length) {
        currentStep.value = 0;
    }

    isPlaying.value = !isPlaying.value;
    if (isPlaying.value) {
        // Clear any existing timer just in case
        if (timer) clearTimeout(timer);
        playNext();
    } else {
        pause();
    }
}

function pause() {
    isPlaying.value = false; // Ensure state sync for input range drag
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    if (animationHandle) {
        cancelAnimationFrame(animationHandle);
        animationHandle = null;
    }
    // Setup for manual mode: reset animation state
    animatingPiece.value = null;
    hiddenPieceKey.value = null;
}

function setSpeed(speed: number) {
    playbackSpeed.value = speed;
    // 如果正在播放，立即应用新速度（通过重启当前步骤的计时）
    if (isPlaying.value) {
        if (timer) clearTimeout(timer);
        if (animationHandle) cancelAnimationFrame(animationHandle); // Restart current anim
        // Note: restarting animation from start might be jarring but acceptable.
        // A better restart would be complex.
        animatingPiece.value = null; hiddenPieceKey.value = null; // Clean state
        playNext();
    }
}

async function playNext() {
    // If at end, stop.
    if (currentStep.value >= props.history.length) {
        isPlaying.value = false;
        return;
    }
    
    // Determine delay until next step based on recorded time
    // If time is missing (old records), fallback to 1000ms
    const now = (currentStep.value > 0 ? props.history[currentStep.value - 1].time : 0) || 0;
    const next = props.history[currentStep.value].time || (now + 1000);

    let delay = (next - now);
    
    if (isNaN(delay)) delay = 1000;
    
    // Safety clamp 
    if (delay < 500) delay = 500;
    if (delay > 3000) delay = 3000; 

    // Apply speed factor
    delay = delay / playbackSpeed.value;

    // Wait for delay
    await new Promise(resolve => {
        timer = setTimeout(resolve, delay);
    });

    if (!isPlaying.value) return;

    // Animate Move
    const move = props.history[currentStep.value];
    await runAnimation(move);

    if (!isPlaying.value) {
        // Paused during animation
        currentStep.value++;
        scrollToStep(currentStep.value);
        animatingPiece.value = null;
        hiddenPieceKey.value = null;
        return;
    }
    
    // Complete Step
    currentStep.value++;
    scrollToStep(currentStep.value);
    
    // Next
    playNext();
}

function runAnimation(move: Move): Promise<void> {
    return new Promise(resolve => {
        const path = move.path;
        if (!path || path.length < 2) { resolve(); return; }

        // Start Position
        const start = path[0];
        const startKey = `${start.q},${start.r}`;
        
        // Hide board piece
        hiddenPieceKey.value = startKey;
        
        // Init animating piece
        const startHex = getHex(startKey);
        if (!startHex) { resolve(); return; }
        
        animatingPiece.value = {
            x: startHex.x, 
            y: startHex.y,
            color: move.color
        };

        const segments: {from: Hex, to: Hex}[] = [];
        for(let i=0; i<path.length-1; i++) {
            const p1 = getHex(`${path[i].q},${path[i].r}`);
            const p2 = getHex(`${path[i+1].q},${path[i+1].r}`);
            if(p1 && p2) segments.push({ from: p1, to: p2 });
        }
        
        let startTime: number | null = null;
        const segmentDuration = ANMIATION_MS_PER_STEP / playbackSpeed.value;
        const totalDuration = segments.length * segmentDuration;
        
        const animate = (timestamp: number) => {
            if (!isPlaying.value) {
                resolve();
                return;
            }
        
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            
            const currentSegmentIndex = Math.floor(elapsed / segmentDuration);
            
            if (currentSegmentIndex >= segments.length) {
                // Done
                animatingPiece.value = null;
                hiddenPieceKey.value = null;
                resolve();
                return;
            }
            
            const segment = segments[currentSegmentIndex];
            const segmentProgress = (elapsed % segmentDuration) / segmentDuration;
            
            // Linear iterpolation
            const x = segment.from.x + (segment.to.x - segment.from.x) * segmentProgress;
            const y = segment.from.y + (segment.to.y - segment.from.y) * segmentProgress;
            
            if (animatingPiece.value) {
                animatingPiece.value.x = x;
                animatingPiece.value.y = y;
            }
            
            animationHandle = requestAnimationFrame(animate);
        };
        
        animationHandle = requestAnimationFrame(animate);
    });
}


function jumpToStep(step: number) {
    currentStep.value = Math.max(0, Math.min(step, props.history.length));
    isPlaying.value = false;
    pause();
    scrollToStep(currentStep.value);
}

function scrollToStep(step: number) {
    nextTick(() => {
        if (!historyContainer.value) return;
        const param = step - 1; // 0-based index of history item
        if (param < 0) return;
        
        // Find children
        const children = historyContainer.value.children;
        if (children[param]) {
            children[param].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

onUnmounted(() => {
    pause();
});

// Auto-scroll watch not really needed if we call scrollToStep
watch(currentStep, (val) => {
   // Optional side effects
});

</script>
