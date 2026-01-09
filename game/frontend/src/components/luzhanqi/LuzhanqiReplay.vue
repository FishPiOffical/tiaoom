<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden p-4">
    <!-- Game Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-center gap-4 bg-base-200 rounded-lg relative overflow-hidden p-4">
        
        <div class="relative bg-base-200 border-4 border-neutral rounded shadow-2xl overflow-hidden shrink-0 select-none" 
             style="aspect-ratio: 5 / 12; height: 100%; max-height: 80vh;">
            
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
               <div v-if="p.hidden && !p.revealed" class="w-full h-full bg-base-300 flex items-center justify-center pattern-diagonal-lines">
                  <span class="text-base-content/50 text-xs text-center">?</span>
               </div>
               <template v-else>
                    <span class="text-[10px] sm:text-xs md:text-sm font-black" :class="(p.isFlipMode && !p.revealed) ? 'opacity-50' : ''">{{ p.name }}</span>
                    <span v-if="p.isFlipMode && !p.revealed" class="absolute top-0 right-0 text-[8px] text-base-content/40 px-0.5">?</span>
               </template>
                </div>
            </div>
        </div>

        <div class="text-xl font-bold opacity-80 flex items-center gap-2">
            <template v-if="gameState.lastAction">
                <span>{{ gameState.lastAction }}</span>
                <span class="text-base-content/50 text-base ml-2">{{ formatTime(currentDisplayTime) }}</span>
            </template>
            <template v-else>
                <span>游戏开始</span>
                <span class="text-base-content/50 text-base ml-2">{{ formatTime(currentDisplayTime) }}</span>
            </template>
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
          v-for="(move, index) in historyList" 
          :key="index" 
          class="text-sm p-2 rounded cursor-pointer transition-colors hover:bg-base-100 flex justify-between items-center"
          :class="{ 
            'bg-base-100 active-move ring-1 ring-primary/20': index === currentStep - 1,
            'opacity-50': index >= currentStep
          }"
          @click="jumpToStep(index + 1)"
        >
          <div class="flex items-center gap-2 flex-1 overflow-hidden">
            <span class="font-bold min-w-[1.5rem] text-center">{{ index + 1 }}.</span>
            <div 
                v-if="move.side !== undefined"
                class="w-3 h-3 rounded-full border shrink-0"
                :class="move.side === 0 ? 'bg-error/10 border-error' : 'bg-success/10 border-success'"
            ></div>
            <div class="truncate" :title="move.desc">
                {{ move.desc }}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs opacity-50 font-mono">{{ formatTime(move.time) }}</span>
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
          <button class="btn btn-circle btn-sm" @click="jumpToStep(Math.max(0, currentStep - 1))">
            <Icon icon="mdi:skip-previous" />
          </button>
          
          <button class="btn btn-circle btn-primary" @click="togglePlay">
            <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" class="text-xl" />
          </button>
          
          <button class="btn btn-circle btn-sm" @click="jumpToStep(Math.min(history.length, currentStep + 1))">
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

<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
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
    data?: any; 
    from?: {r:number, c:number};
    to?: {r:number, c:number};
    attacker?: any;
    defender?: any;
    result?: string;
    piece?: any;
    pos?: {r:number, c:number};
    time?: number;
}

const props = defineProps<{
  history: HistoryItem[]
  players: { id: string; name: string, color: string }[]
  beginTime: number
  winner?: number
}>()

const currentStep = ref(0)
const currentDisplayTime = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
const moveListRef = ref<HTMLElement | null>(null)
let animationFrame: number | null = null
let lastTimestamp = 0

function getPlayerName(side: number) {
    const color = side === 0 ? 'red' : 'green';
    const p = props.players.find(x => x.color === color);
    return p ? p.name : 'Unknown';
}

function formatTime(ms?: number) {
  if (ms === undefined || ms === null) return '00:00';
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Convert history to list with descriptions
const historyList = computed(() => {
    return props.history.map(h => {
        let desc = '未知操作';
        if (h.type === 'deploy') {
            desc = `${getPlayerName(h.side!)} 完成布阵`;
        } else if (h.type === 'init-flip') {
            desc = `初始化翻棋`;
        } else if (h.type === 'flip') {
            desc = `翻开: ${h.piece?.name}`;
        } else if (h.type === 'move') {
            if (h.result === 'move') desc = `${h.attacker?.name} 移动`;
            else if (h.result === 'win') desc = `${h.attacker?.name} 吃 ${h.defender?.name || '对方棋子'}`;
            else if (h.result === 'loss') desc = `${h.attacker?.name} 撞死于 ${h.defender?.name || '对方棋子'}`;
            else if (h.result === 'draw') desc = `${h.attacker?.name} 与 ${h.defender?.name} 同归于尽`;
        } else if (h.type === 'surrender') {
            desc = `${getPlayerName(h.side!)} 认输`;
        } else if (h.type === 'timeout') {
            desc = `${getPlayerName(h.side!)} 超时`;
        }
        return {
            ...h,
            desc
        }
    });
});

function jumpToStep(step: number) {
  currentStep.value = Math.max(0, Math.min(step, props.history.length));
  // if (currentStep.value === props.history.length) pause(); // Doushouqi doesn't force pause
  pause();
}

function togglePlay() {
  if (isPlaying.value) pause();
  else play();
}

function play() {
  if (currentStep.value >= props.history.length) currentStep.value = 0;
  isPlaying.value = true;
  lastTimestamp = 0; // reset
  animationFrame = requestAnimationFrame(loop);
}

function pause() {
  isPlaying.value = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  lastTimestamp = 0;
}

function setSpeed(s: number) {
    playbackSpeed.value = s;
}

function loop(timestamp: number) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const elapsed = timestamp - lastTimestamp;
  
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

  const interval = delay / playbackSpeed.value;
  
  if (elapsed >= interval) {
    if (currentStep.value < props.history.length) {
      currentStep.value++;
      lastTimestamp = timestamp;
      animationFrame = requestAnimationFrame(loop);
    } else {
      pause();
    }
  } else {
    animationFrame = requestAnimationFrame(loop);
  }
}

// Auto scroll
watch(currentStep, () => {
    const time = currentStep.value > 0 ? props.history[currentStep.value - 1].time || 0 : 0;
    currentDisplayTime.value = time;

    nextTick(() => {
        if (!moveListRef.value) return;
        const activeEl = moveListRef.value.querySelector('.active-move');
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    });
});

onUnmounted(() => {
  pause();
})

// Game State Construction
const gameState = computed(() => {
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
                        revealed: true, // Deploy mode visible in replay
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
                 replayBoard.flat().forEach(c => c && (c.lastMove = false));
                 
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
                     replayBoard[from.r][from.c] = null; 
                     lastAction = `${defenderName} 吃掉 ${attacker.name}`;
                 } 
                 else if (h.result === 'draw') {
                     const defenderName = defender ? defender.name : (h.defender ? h.defender.name : '对方棋子');
                     replayBoard[from.r][from.c] = null;
                     replayBoard[to.r][to.c] = null;
                     lastAction = `${attacker.name} 与 ${defenderName} 同归于尽`;
                 } 
                 else {
                     if (!defender) {
                         replayBoard[to.r][to.c] = attacker;
                         replayBoard[from.r][from.c] = null;
                     }
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