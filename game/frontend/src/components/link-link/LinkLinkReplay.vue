<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden select-none">
    <!-- Board Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4 relative">
      <h2 class="text-xl font-bold mb-4 md:absolute md:top-4">连连看 · 对战回放</h2>
      
      <div v-if="history.length > 1" class="grid gap-4 items-start w-full mt-8 md:mt-0" :class="{
        'grid-cols-1': (playerOrder?.length ?? 0) === 1,
        'grid-cols-1 md:grid-cols-2': (playerOrder?.length ?? 0) === 2,
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': (playerOrder?.length ?? 0) === 3,
        'grid-cols-2 md:grid-cols-2 lg:grid-cols-4': (playerOrder?.length ?? 0) >= 4,
      }">
        <div v-for="playerId in playerOrder" :key="playerId" class="flex flex-col items-center gap-2">
          <div class="text-sm md:text-base font-semibold">
            {{ playerName(playerId) }}
            <span class="ml-2 text-xs md:text-sm opacity-60 font-normal">
              剩余 {{ boardLeft(playerId) }} · 消除 {{ currentEntry?.pairsDone[playerId] ?? 0 }} 对
            </span>
          </div>
          <div class="bg-base-200 rounded-xl border border-base-300 p-1.5 md:p-2 shadow-lg">
            <div v-for="(row, r) in currentBoards[playerId] ?? []" :key="r" class="flex">
              <div
                v-for="(val, c) in row"
                :key="c"
                class="w-6 h-6 md:w-8 md:h-8 m-0.5 rounded-md flex items-center justify-center text-base md:text-lg leading-none transition-all duration-150"
                :class="[
                  val === 0 ? 'opacity-20 bg-base-300' : 'bg-base-100 border border-base-300 shadow-sm',
                  isHighlighted(playerId, r, c) ? 'ring-2 ring-primary scale-110 z-10' : '',
                ]"
              >
                <span v-if="val !== 0">{{ EMOJIS[val] ?? '?' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center text-base-content/40 text-base py-8 w-full">暂无回放数据</div>

      <!-- Status -->
      <div v-if="history.length > 1" class="flex flex-col items-center justify-center gap-2 mt-6 text-lg p-2">
        <div class="text-base-content font-bold min-h-[1.5em]">{{ currentMoveDesc }}</div>
        <span class="text-base opacity-60 font-mono">
          {{ formatTime(currentTime) }}
        </span>
        <div class="text-base font-bold text-primary mt-2" v-if="winnerName && currentStep === history.length - 1">
          🎉 {{ winnerName }} 获胜
        </div>
      </div>
    </section>

    <!-- History / Controls -->
    <aside v-if="history.length > 1" class="w-full md:w-80 flex-none border-t md:border-t-0 md:border-l border-base-content/20 md:pt-0 md:pl-4 flex flex-col h-[50vh] md:h-full min-h-0">
      <h3 class="text-lg font-bold p-2 flex items-center gap-2 shrink-0">
        <span class="flex items-center gap-2">
          <Icon icon="mdi:history" />
          对局记录
        </span>
      </h3>
      
      <div class="flex-1 min-h-0 overflow-y-auto space-y-1 pr-2 pb-2">
        <div 
          class="p-2 rounded cursor-pointer hover:bg-base-200 transition-colors flex justify-between items-center"
          :class="{ 'bg-primary text-primary-content hover:bg-primary': currentStep === 0 }"
          @click="currentStep = 0"
        >
          <span>开始</span>
          <span class="text-xs opacity-70">00:00</span>
        </div>
        <div 
          v-for="(entry, index) in history.slice(1)" 
          :key="index"
          class="p-2 rounded cursor-pointer hover:bg-base-200 transition-colors flex justify-between items-center"
          :class="{ 'bg-primary text-primary-content hover:bg-primary': currentStep === index + 1 }"
          @click="currentStep = index + 1"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono w-6 text-right text-xs opacity-50">{{ index + 1 }}.</span>
            <span class="font-bold text-sm">{{ shortName(entry.move!.playerId) }}</span>
            <span class="text-xs" v-if="entry.move!.type === 'pair-cleared'">消除一对</span>
            <span class="text-xs text-warning" v-if="entry.move!.type === 'shuffle'">无解重排</span>
          </div>
          <span class="text-xs opacity-70 font-mono">{{ formatTime(entry.move!.time) }}</span>
        </div>
      </div>
      
      <!-- Controls -->
      <div class="p-2 bg-base-100 border-t border-base-content/10 shrink-0">
        <div class="flex flex-col gap-2">
          <input
            type="range"
            class="range range-xs flex-1"
            min="0"
            :max="Math.max(0, history.length - 1)"
            :value="currentStep"
            @input="onScrub"
          />
          <div class="flex justify-between items-center gap-2">
            <button class="btn btn-sm px-2" @click="currentStep = Math.max(0, currentStep - 1)" :disabled="currentStep === 0">
              <Icon icon="mdi:chevron-left" class="text-lg" />
            </button>
            
            <div class="flex items-center justify-center gap-2 flex-1">
              <div class="text-center text-xs opacity-50 font-mono w-12 hidden sm:block">
                {{ currentStep }} / {{ Math.max(0, history.length - 1) }}
              </div>
              <button class="btn btn-sm btn-circle" :class="isPlaying ? 'btn-primary' : 'btn-ghost'" @click="togglePlay">
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

            <button class="btn btn-sm px-2" @click="currentStep = Math.min(history.length - 1, currentStep + 1)" :disabled="currentStep >= history.length - 1">
              <Icon icon="mdi:chevron-right" class="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import Icon from '@/components/common/Icon.vue';

interface Pos { r: number; c: number }
interface GameMove {
  playerId: string;
  type: 'pair-cleared' | 'shuffle';
  a?: Pos;
  b?: Pos;
  board?: number[][];
  time: number;
}
interface HistoryEntry {
  boards: Record<string, number[][]>;
  pairsDone: Record<string, number>;
  move?: GameMove;
}

const props = defineProps<{
  initialBoard?: number[][];
  moves?: GameMove[];
  playerOrder?: string[];
  playerStates?: Record<string, {
    name: string;
    board: number[][];
    leftTiles: number;
    pairsDone: number;
    shuffleCount: number;
    finishedAt: number;
  }>;
  winnerName?: string | null;
}>();

// ─── 从初始棋盘 + 操作日志重建完整历史 ─────────────────────────────────────
const history = computed<HistoryEntry[]>(() => {
  if (!props.initialBoard?.length || !props.playerOrder?.length) return [];

  const clone = (b: number[][]): number[][] => b.map(r => [...r]);
  const cloneAll = (m: Record<string, number[][]>) =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, clone(v)]));

  const boards: Record<string, number[][]> = {};
  const pairsDone: Record<string, number> = {};
  for (const id of props.playerOrder) {
    boards[id] = clone(props.initialBoard);
    pairsDone[id] = 0;
  }

  const entries: HistoryEntry[] = [
    { boards: cloneAll(boards), pairsDone: { ...pairsDone } },
  ];

  for (const move of (props.moves ?? [])) {
    if (move.type === 'pair-cleared' && move.a && move.b) {
      boards[move.playerId][move.a.r][move.a.c] = 0;
      boards[move.playerId][move.b.r][move.b.c] = 0;
      pairsDone[move.playerId] = (pairsDone[move.playerId] ?? 0) + 1;
    } else if (move.type === 'shuffle' && move.board) {
      boards[move.playerId] = clone(move.board);
    }
    entries.push({ boards: cloneAll(boards), pairsDone: { ...pairsDone }, move });
  }

  return entries;
});

// ─── 回放控制 ────────────────────────────────────────────────────────────────
const currentStep = ref(0);
const isPlaying = ref(false);
const playbackSpeed = ref(1);
const currentTime = ref(0);
let rafId: number | null = null;
let lastFrameTime = 0;
const isAutoStepping = ref(false);

const movesWithTime = computed(() => {
  return [
    { time: 0, move: undefined },
    ...(props.moves || []).map((m) => ({ time: m.time, move: m }))
  ];
});

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

  let step = currentStep.value;
  while (step < movesWithTime.value.length - 1 && currentTime.value >= movesWithTime.value[step + 1].time) {
    step++;
  }

  if (step !== currentStep.value) {
    isAutoStepping.value = true;
    currentStep.value = step;
  }

  if (currentStep.value >= movesWithTime.value.length - 1) {
    stopPlay();
    if (movesWithTime.value.length > 0) {
      currentTime.value = movesWithTime.value[movesWithTime.value.length - 1].time;
    }
  } else {
    rafId = requestAnimationFrame(loop);
  }
}

watch(isPlaying, (playing) => {
  if (playing) {
    if (currentStep.value >= movesWithTime.value.length - 1) {
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
  currentTime.value = newStep >= 0 && newStep < movesWithTime.value.length ? movesWithTime.value[newStep].time : 0;
});

onUnmounted(() => {
  stopPlay();
});

function onScrub(e: Event) {
  stopPlay();
  currentStep.value = Number((e.target as HTMLInputElement).value);
}

// ─── 视图逻辑 ────────────────────────────────────────────────────────────────
const currentEntry = computed(() => history.value[currentStep.value]);
const currentBoards = computed(() => currentEntry.value?.boards ?? {});

function isHighlighted(playerId: string, r: number, c: number): boolean {
  const move = currentEntry.value?.move;
  if (!move || move.playerId !== playerId || move.type !== 'pair-cleared') return false;
  return (move.a?.r === r && move.a?.c === c) || (move.b?.r === r && move.b?.c === c);
}

function boardLeft(playerId: string): number {
  const board = currentBoards.value[playerId];
  if (!board) return 0;
  return board.reduce((sum, row) => sum + row.filter(v => v !== 0).length, 0);
}

function playerName(id: string): string {
  return props.playerStates?.[id]?.name ?? id;
}

function shortName(id: string): string {
  const n = playerName(id);
  return n.length > 4 ? n.slice(0, 4) + '…' : n;
}

const currentMoveDesc = computed(() => {
  const move = currentEntry.value?.move;
  if (!move) return '游戏开始时的初始棋盘';
  const n = shortName(move.playerId);
  if (move.type === 'pair-cleared') return `${n} 消除了一对牌`;
  if (move.type === 'shuffle') return `${n} 的棋盘无可消除牌，产生重排`;
  return '';
});

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  // Only displaying mm:ss to match connect4, can add ms if needed
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

const EMOJIS: Record<number, string> = {
   1:'🐶',  2:'🐱',  3:'🐭',  4:'🐹',  5:'🐰',  6:'🦊',  7:'🐻',  8:'🐼',
   9:'🐨', 10:'🐯', 11:'🦁', 12:'🐮', 13:'🐷', 14:'🐸', 15:'🐵', 16:'🐔',
  17:'🐧', 18:'🐦', 19:'🦆', 20:'🦉', 21:'🦇', 22:'🐺', 23:'🐗', 24:'🐴',
};
</script>
