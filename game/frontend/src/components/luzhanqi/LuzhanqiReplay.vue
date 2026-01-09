<template>
  <div class="flex flex-col gap-2 w-full max-w-lg mx-auto p-2">
    <!-- Control Bar -->
    <div class="flex flex-wrap items-center gap-2 bg-base-100 p-2 rounded-lg shadow text-xs sm:text-sm">
      <button class="btn btn-sm btn-circle" @click="jumpToStep(0)">
         <Icon icon="mdi:skip-backward" />
      </button>
      <button class="btn btn-sm btn-circle" @click="isPlaying ? pause() : play()">
         <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" />
      </button>
      <button class="btn btn-sm btn-circle" @click="jumpToStep(history.length)">
         <Icon icon="mdi:skip-forward" />
      </button>
      
      <div class="flex-1 flex flex-col mx-2">
         <div class="flex justify-between mb-1 text-xs opacity-70">
           <span>Step: {{ currentStep }} / {{ history.length }}</span>
           <!-- <span>{{ formatTime(currentDisplayTime) }}</span> --> 
         </div>
         <input 
           type="range" 
           min="0" 
           :max="history.length" 
           v-model.number="currentStep"
           @input="pause()"
           class="range range-xs range-primary" 
         />
      </div>

      <select v-model="playbackSpeed" class="select select-bordered select-xs w-20">
        <option :value="0.5">0.5x</option>
        <option :value="1">1x</option>
        <option :value="2">2x</option>
        <option :value="4">4x</option>
      </select>
    </div>

    <!-- Board -->
    <div class="relative bg-base-200 border-4 border-neutral rounded shadow-2xl overflow-hidden shrink-0 select-none" 
         style="aspect-ratio: 5 / 12; width: 100%;">
        <!-- SVG Board Background -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="-0.5 -0.5 5 12">
            <!-- Background -->
            <rect x="-0.5" y="-0.5" width="6" height="13" class="fill-base-200" />
            <!-- River -->
            <rect x="-0.5" y="5.1" width="6" height="0.8" class="fill-info/20" />
            <!-- Grid Lines & Camps -->
            <g class="stroke-base-content/30" stroke-width="0.04" stroke-linecap="round">
            <!-- Basic Grid -->
            <template v-for="r in 12">
                <line :x1="0" :y1="r-1" :x2="4" :y2="r-1" />
            </template>
            <template v-for="c in 5">
                <line :x1="c-1" :y1="0" :x2="c-1" :y2="5" />
                <line :x1="c-1" :y1="6" :x2="c-1" :y2="11" />
            </template>
            <!-- Diagonals (Camps) -->
            <line x1="0" y1="1" x2="2" y2="3" /> <line x1="2" y1="1" x2="0" y2="3" />
            <line x1="2" y1="1" x2="4" y2="3" /> <line x1="4" y1="1" x2="2" y2="3" />
            <line x1="1" y1="2" x2="3" y2="4" /> <line x1="3" y1="2" x2="1" y2="4" />
            <line x1="0" y1="3" x2="2" y2="5" /> <line x1="2" y1="3" x2="0" y2="5" />
            <line x1="2" y1="3" x2="4" y2="5" /> <line x1="4" y1="3" x2="2" y2="5" />
            
            <line x1="0" y1="6" x2="2" y2="8" /> <line x1="2" y1="6" x2="0" y2="8" />
            <line x1="2" y1="6" x2="4" y2="8" /> <line x1="4" y1="6" x2="2" y2="8" />
            <line x1="1" y1="7" x2="3" y2="9" /> <line x1="3" y1="7" x2="1" y2="9" />
            <line x1="0" y1="8" x2="2" y2="10" /> <line x1="2" y1="8" x2="0" y2="10" />
            <line x1="2" y1="8" x2="4" y2="10" /> <line x1="4" y1="8" x2="2" y2="10" />

            <!-- Railroads -->
            <g class="stroke-base-content/50" stroke-width="0.08" stroke-dasharray="0.1,0.05">
                <line x1="0" y1="1" x2="4" y2="1" /> <line x1="0" y1="5" x2="4" y2="5" />
                <line x1="0" y1="6" x2="4" y2="6" /> <line x1="0" y1="10" x2="4" y2="10" />
                <line x1="0" y1="1" x2="0" y2="10" /> <line x1="4" y1="1" x2="4" y2="10" />
                <line x1="0" y1="5" x2="0" y2="6" stroke-dasharray="0" />
                <line x1="2" y1="5" x2="2" y2="6" stroke-dasharray="0" />
                <line x1="4" y1="5" x2="4" y2="6" stroke-dasharray="0" />
            </g>
            </g>
            <!-- Camps Circles -->
            <g fill="none" class="stroke-base-content/30" stroke-width="0.05">
            <circle v-for="(c,i) in CAMPS" :key="i" :cx="c[1]" :cy="c[0]" r="0.35" class="fill-base-300" />
            </g>
            <!-- HQs -->
            <g v-for="(h,i) in HQS" :key="i">
            <rect :x="h[1]-0.6" :y="h[0]-0.4" width="1.2" height="0.8" rx="0.2" class="fill-warning/20 stroke-warning" stroke-width="0.05" />
            <text :x="h[1]" :y="h[0]" font-size="0.3" text-anchor="middle" dominant-baseline="middle" class="fill-warning">大本营</text>
            </g>
            <text x="2" y="5.7" font-size="0.4" text-anchor="middle" class="fill-info/50">山 界 &nbsp; 山 界</text>
        </svg>

        <!-- Pieces -->
        <div 
            v-for="p in gameState.pieces" 
            :key="p.key"
            class="absolute pointer-events-none flex items-center justify-center transition-all duration-300"
            :style="{
                top: (p.r * 8.333) + '%',
                left: (p.c * 20) + '%',
                width: '20%',
                height: '8.333%',
                padding: '2px'
            }"
        >
            <div 
                class="w-full h-full rounded shadow-md border-2 flex flex-col items-center justify-center text-sm font-bold bg-base-100 relative"
                :class="[
                p.side === 0 ? 'border-error text-error' : 
                p.side === 1 ? 'border-success text-success' : 'border-neutral',
                p.lastMove ? 'ring-2 ring-accent' : ''
                ]"
            >
                <!-- Show '?' if hidden in replay? Usually show all. 
                     For Flip Mode, maybe show '?' until flipped. 
                     But the history now has 'init-flip', so we know everything.
                     Let's show everything to be 'God View', but maybe with opacity if not revealed? 
                -->
                <span class="text-[10px] sm:text-xs md:text-sm font-black" :class="(p.isFlipMode && !p.revealed) ? 'opacity-50' : ''">{{ p.name }}</span>
                <span v-if="p.isFlipMode && !p.revealed" class="absolute top-0 right-0 text-[8px] text-base-content/40 px-0.5">?</span>
            </div>
        </div>
    </div>
    
    <!-- Info -->
    <div class="bg-base-100 rounded-lg shadow-sm border border-base-content/10 p-3 flex justify-between items-center text-xs">
        <div v-if="gameState.lastAction">
            <span class="font-bold">{{ gameState.lastAction }}</span>
        </div>
        <div class="flex items-center gap-2">
            <span class="font-black text-error">红方: {{ getPlayerName(0) }}</span>
            <span class="font-black text-success">绿方: {{ getPlayerName(1) }}</span>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import Icon from '@/components/common/Icon.vue'

const CAMPS = [
  [2,1], [2,3], [3,2], [4,1], [4,3],
  [7,1], [7,3], [8,2], [9,1], [9,3]
];
const HQS = [
  [0,1], [0,3], [11,1], [11,3]
];

interface HistoryItem {
    type: string;
    side?: number;
    playerId?: string;
    data?: any; // deploy data or init-flip data
    // Move/Flip
    from?: {r:number, c:number};
    to?: {r:number, c:number};
    attacker?: any;
    defender?: any;
    result?: string;
    piece?: any; // Flip result
    pos?: {r:number, c:number};
}

const props = defineProps<{
  history: HistoryItem[]
  players: { id: string; name: string, color: string }[]
  beginTime: number
  winner?: number
}>()

const currentStep = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
let animationFrame: number | null = null
let lastTimestamp = 0

function getPlayerName(side: number) {
    const color = side === 0 ? 'red' : 'green';
    const p = props.players.find(x => x.color === color);
    return p ? p.name : 'Unknown';
}

function jumpToStep(step: number) {
  currentStep.value = Math.max(0, Math.min(step, props.history.length));
  if (currentStep.value === props.history.length) pause();
}

function play() {
  if (currentStep.value >= props.history.length) currentStep.value = 0;
  isPlaying.value = true;
  lastTimestamp = performance.now();
  animationFrame = requestAnimationFrame(animate);
}

function pause() {
  isPlaying.value = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = null;
}

function animate(timestamp: number) {
  if (!isPlaying.value) return;
  const elapsed = timestamp - lastTimestamp;
  const interval = 1000 / playbackSpeed.value; 
  
  if (elapsed >= interval) {
    if (currentStep.value < props.history.length) {
      currentStep.value++;
      lastTimestamp = timestamp;
    } else {
      pause();
      return;
    }
  }
  animationFrame = requestAnimationFrame(animate);
}

onUnmounted(() => {
  pause();
})

// Game State Construction
const gameState = computed(() => {
    // Reconstruct board at currentStep
    // Board 12x5
    const board: any[][] = Array(12).fill(null).map(() => Array(5).fill(null));
    let lastActionText = '';
    
    // Process history up to currentStep
    for(let i=0; i<currentStep.value; i++) {
        const h = props.history[i];
        if (!h) continue;
        
        if (h.type === 'deploy') {
            if (h.data) {
                h.data.forEach((p: any) => {
                    board[p.r][p.c] = {
                        name: p.name,
                        side: h.side,
                        revealed: false, 
                        isFlipMode: false,
                        key: `${p.r},${p.c}` // key for vue list
                    };
                });
            }
            lastActionText = `布阵: ${getPlayerName(h.side!)}`;
        }
        else if (h.type === 'init-flip') {
             if (h.data) {
                 h.data.forEach((p: any) => {
                     board[p.r][p.c] = {
                         name: p.name,
                         side: p.side,
                         revealed: false,
                         isFlipMode: true,
                         key: `${p.r},${p.c}`
                     };
                 });
             }
             lastActionText = `初始翻棋布局`;
        }
        else if (h.type === 'flip') {
             if (h.pos && board[h.pos.r][h.pos.c]) {
                 board[h.pos.r][h.pos.c].revealed = true;
                 lastActionText = `翻棋: ${h.piece?.name}`;
             }
        }
        else if (h.type === 'move') {
             const from = h.from!;
             const to = h.to!;
             const p = board[from.r][from.c];
             if (p) {
                 // Clear highlights
                 for(let r=0; r<12; r++) for(let c=0; c<5; c++) if(board[r][c]) board[r][c].lastMove = false;
                 
                 p.lastMove = true;
                 
                 // Move
                 board[from.r][from.c] = null;
                 board[to.r][to.c] = p; // If verify logic needed, do it. But replay just trusts history.
                 
                 // Handle combat result
                 // If win: attacker stays
                 // If loss: attacker removed (already moved p to dest, so remove p)
                 // If draw: both removed
                 
                 // Wait, strict replay:
                 // History says 'result'.
                 if (h.result === 'loss') {
                     board[to.r][to.c] = board[from.r][from.c]; // Wait, original defender was there?
                     // Ah, constructing from history is sequential.
                     // Before move, board[to] had defender (if any).
                     // If result is loss, defender stays, attacker dies.
                     // So we should NOT overwrite target if result is loss.
                     // Let's retry:
                     // We need the state BEFORE the move to know who was at 'to'.
                     // Actually, if simply following instructions:
                     // 1. Attacker is at From. Defender is at To.
                     
                     // Reset `p` was wrong line above.
                 }
                 
                 // Correct Logic:
                 // p is Attacker (at from)
                 // target is Defender (at to)
                 
                 // Reset:
                 // p = board[from.r][from.c]
                 
                 let target = null; // We can't easily get target from previous step unless we saved it.
                 // But wait, the loop runs sequentially. `board` IS the state before this move.
                 // So target = board[to.r][to.c]
             }
         }
    }
    
    // Actually, reconstructing step-by-step properly:
    // Reset board for loop
    const replayBoard: any[][] = Array(12).fill(null).map(() => Array(5).fill(null));
    let lastAction = '';

    for(let i=0; i<currentStep.value; i++) {
        const h = props.history[i];
        if (!h) continue;

        if (h.type === 'deploy') {
            if (h.data) {
                h.data.forEach((p: any) => {
                    replayBoard[p.r][p.c] = {
                        name: p.name,
                        side: h.side,
                        revealed: true, // Deploy mode -> visible in replay
                        isFlipMode: false,
                        key: `${h.side}-${p.name}-${p.r}-${p.c}`
                    };
                });
            }
            lastAction = `${getPlayerName(h.side!)} 完成布阵`;
        }
        else if (h.type === 'init-flip') {
             if (h.data) {
                 h.data.forEach((p: any) => {
                     replayBoard[p.r][p.c] = {
                         name: p.name,
                         side: p.side,
                         revealed: false,
                         isFlipMode: true,
                         key: `flip-${p.r}-${p.c}`
                     };
                 });
             }
             lastAction = `翻棋随机布局生成`;
        }
        else if (h.type === 'flip') {
             if (h.pos) {
                 const p = replayBoard[h.pos.r][h.pos.c];
                 if(p) {
                   p.revealed = true;
                   lastAction = `${getPlayerName(h.side!)} 翻开了 (${h.pos.r}, ${h.pos.c}) ${p.name}`;
                 }
             }
        }
        else if (h.type === 'move') {
             const from = h.from!;
             const to = h.to!;
             const attacker = replayBoard[from.r][from.c];
             const defender = replayBoard[to.r][to.c]; // May be null
             
             if (attacker) {
                 // Clear previous highlights
                 replayBoard.flat().forEach(c => c && (c.lastMove = false));
                 
                 // Apply Move Logic from History Result
                 if (h.result === 'move') {
                     replayBoard[to.r][to.c] = attacker;
                     replayBoard[from.r][from.c] = null;
                     lastAction = `${attacker.name} 移动到 (${to.r}, ${to.c})`;
                 }
                 else if (h.result === 'win') {
                     const defenderName = defender ? defender.name : (h.defender ? h.defender.name : '对方棋子');
                     replayBoard[to.r][to.c] = attacker;
                     replayBoard[from.r][from.c] = null;
                     lastAction = `${attacker.name} 吃掉 ${defenderName}`;
                 } 
                 else if (h.result === 'loss') {
                     const defenderName = defender ? defender.name : (h.defender ? h.defender.name : '对方棋子');
                     replayBoard[from.r][from.c] = null; // Attacker dies
                     lastAction = `${defenderName} 吃掉 ${attacker.name}`;
                 } 
                 else if (h.result === 'draw') {
                     const defenderName = defender ? defender.name : (h.defender ? h.defender.name : '对方棋子');
                     replayBoard[from.r][from.c] = null;
                     replayBoard[to.r][to.c] = null;
                     lastAction = `${attacker.name} 与 ${defenderName} 同归于尽`;
                 } 
                 else {
                     // Fallback for older history or safety
                     if (!defender) {
                         replayBoard[to.r][to.c] = attacker;
                         replayBoard[from.r][from.c] = null;
                     } // else assume blocked? No, handled by result usually.
                 }

                 if (h.result !== 'loss' && h.result !== 'draw' && replayBoard[to.r][to.c]) {
                     replayBoard[to.r][to.c].lastMove = true;
                 }
             }
        }
        else if (h.type === 'surrender') {
            lastAction = `${getPlayerName(h.side!)} 认输`;
        }
        else if (h.type === 'timeout') {
            lastAction = `${getPlayerName(h.side!)} 超时`;
        }
    }

    // Flatten for render
    const pieces = [];
    for(let r=0; r<12; r++) {
        for(let c=0; c<5; c++) {
            if (replayBoard[r][c]) {
                const p = replayBoard[r][c];
                pieces.push({
                    ...p,
                    r, c
                });
            }
        }
    }
    
    return {
        pieces,
        lastAction
    };
});

</script>
