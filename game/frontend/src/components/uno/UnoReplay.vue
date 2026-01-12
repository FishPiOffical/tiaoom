<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import UnoCard from './UnoCard.vue';
import Icon from '@/components/common/Icon.vue';

// --- Types ---

interface UnoCardType {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string;
  type: 'number' | 'action' | 'wild';
  score?: number;
}

interface UnoInitialState {
  players: Record<string, UnoCardType[]>;
  deck: UnoCardType[];
  direction: 1 | -1;
  currentPlayer: string;
  topCard: UnoCardType;
}

interface UnoHistoryAction {
  type: string;
  cardId?: string;
  card?: UnoCardType;
  count?: number; // for draw
  color?: string; // for wild/chosen color
  chosenColor?: string; // from backend
  previousColor?: string;
  targetPlayer?: string; // for challenge
  result?: string; // for challenge
}

interface UnoHistoryItem {
  player: string;
  action: UnoHistoryAction;
  time: number;
}

const props = defineProps<{
  history: UnoHistoryItem[];
  players: { id: string; name: string }[];
  beginTime: number;
  winner?: string;
  initialState: UnoInitialState | undefined;
}>();

const allCardsMap = computed(() => {
  const map = new Map<string, UnoCardType>();
  if (!props.initialState) return map;

  props.initialState.deck.forEach(c => map.set(c.id, c));
  if(props.initialState.topCard) map.set(props.initialState.topCard.id, props.initialState.topCard);
  Object.values(props.initialState.players).forEach(hand => {
    hand.forEach(c => map.set(c.id, c));
  });
  return map;
});

function getCardById(id: string | undefined): UnoCardType | undefined {
  if (!id) return undefined;
  return allCardsMap.value.get(id);
}

// --- Playback Control ---

const currentStep = ref(0);
const isPlaying = ref(false);
const playbackSpeed = ref(1);
const speeds = [0.5, 1, 2, 4];
let playbackTimer: any = null;

const currentState = computed(() => {
  if (!props.initialState) return null;

  // Deep clone initial state
  const state = {
    players: JSON.parse(JSON.stringify(props.initialState.players)) as Record<string, UnoCardType[]>,
    deck: [...props.initialState.deck] as UnoCardType[], // Array of cards
    discardPile: [props.initialState.topCard] as UnoCardType[],
    direction: props.initialState.direction,
    currentPlayer: props.initialState.currentPlayer,
    color: props.initialState.topCard.color === 'black' ? 'black' : props.initialState.topCard.color, // Initial color
  };

  // Apply history up to currentStep
  for (let i = 0; i < currentStep.value && i < props.history.length; i++) {
    const item = props.history[i];
    const { player, action } = item;
    const hand = state.players[player];

    if (!hand) continue;

    switch (action.type) {
      case 'play_card': {
        const card = action.card || getCardById(action.cardId);
        if (!card) break;

        // Remove from hand
        const cardIndex = hand.findIndex(c => c.id === card.id);
        if (cardIndex !== -1) {
          hand.splice(cardIndex, 1);
        }
        // Add to discard
        state.discardPile.push(card);
        // Update color
        if (card.color !== 'black') {
          state.color = card.color;
        } else if (action.chosenColor || action.color) {
           state.color = (action.chosenColor || action.color) as any;
        }
        
        state.currentPlayer = player; 
        
        // Handle effects for state tracking (direction)
        if (card.value === 'reverse') {
          state.direction *= -1;
        }
        break;
      }
      case 'draw_card': {
        const count = action.count || 1;
        for (let k = 0; k < count; k++) {
          if (state.deck.length > 0) {
             const card = state.deck.pop(); // Take from top (end of array?)
             // In backend: deck.pop(). So yes, end of array.
             if (card) hand.push(card);
          } else {
             // Reshuffle discard pile logic is tricky without RNG seed. 
             // Ideally we shouldn't run out of deck in short history or backend handles reshuffle.
             // If backend reshuffle isn't logged... deck sync breaks.
             // Assuming deck serves enough for now or backend logs 'reshuffle'? 
             // Backend `uno.ts` does NOT seem to log reshuffle. 
             // This is a limitation. If deck runs out, replay might fail to show correct drawn cards.
          }
        }
        state.currentPlayer = player;
        break;
      }
      case 'color_change': {
        // Usually part of play_card for wilds, but sometimes separate?
        // Uno backend typically attaches color to play_card for wilds.
        break;
      }
      // Challenge...
      case 'challenge': {
         // Just an event, mechanics handled by draw_card logs that follow.
         break;
      }
    }
  }

  return state;
});


function togglePlay() {
  if (isPlaying.value) pause();
  else play();
}

function play() {
  isPlaying.value = true;
  const speedMs = 1000 / playbackSpeed.value;
  playbackTimer = setInterval(() => {
    if (currentStep.value < props.history.length) {
      currentStep.value++;
    } else {
      pause();
    }
  }, speedMs);
}

function pause() {
  isPlaying.value = false;
  clearInterval(playbackTimer);
}

function nextStep() {
  if (currentStep.value < props.history.length) currentStep.value++;
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value--;
}

function setStep(val: number) {
  currentStep.value = Math.max(0, Math.min(val, props.history.length));
}

// Auto-scroll to current step in sidebar
watch(currentStep, (step) => {
  if (step > 0) {
    const el = document.getElementById(`history-item-${step - 1}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});

// Watch speed change
watch(playbackSpeed, () => {
  if (isPlaying.value) {
    pause();
    play();
  }
});

onUnmounted(() => {
  pause();
});

// --- Formatting ---

const CARD_LOG_MAP: Record<string, string> = {
  skip: '跳过',
  reverse: '反转',
  draw2: '+2',
  wild: '变色',
  wild_draw4: '+4',
};

const COLOR_MAP: Record<string, string> = {
  red: '红',
  blue: '蓝',
  green: '绿',
  yellow: '黄',
  black: '黑',
};

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function getActionCard(action: UnoHistoryAction) {
  return action.card || getCardById(action.cardId);
}

function getActionText(action: UnoHistoryAction) {
  const card = getActionCard(action);
  if (action.type === 'play_card' && card) {
    const color = COLOR_MAP[card.color] || card.color;
    const value = CARD_LOG_MAP[card.value] || card.value;
    return `出牌 ${color}${value}`;
  } else if (action.type === 'draw_card') {
    return `抽牌 ${action.count || 1} 张`;
  } else if (action.type === 'challenge') {
    return `质疑 ${action.result === 'success' ? '成功' : '失败'}`;
  } else {
    return action.type;
  }
}

function getActionIcon(action: UnoHistoryAction) {
  if (action.type === 'play_card') return 'mdi:cards-playing';
  if (action.type === 'draw_card') return 'mdi:cards-outline';
  if (action.type === 'challenge') return 'mdi:alert-circle-outline';
  return 'mdi:circle-small';
}

// --- Layout Helpers ---
// Same logic as UnoRoom roughly
function getPlayerPositionStyle(index: number, total: number) {
  if (total <= 0) return {};
  // Simple circle layout or fixed positions
  // Reusing UnoRoom logic concept:
  // We want to center the 'current POV' if we were a player, but in replay we are observer.
  // So standard circle layout.
  
  const angle = (2 * Math.PI * index) / total + Math.PI / 2; // Start from bottom
  const radiusX = 40; // %
  const radiusY = 35; // %
  const x = 50 + radiusX * Math.cos(angle);
  const y = 50 + radiusY * Math.sin(angle);
  
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)'
  };
}

const getPlayersByPosition = computed(() => {
  return props.players.map(p => ({
     ...p,
     hand: currentState.value?.players[p.id] || []
  }));
});

function getPlayerAvatar(id: string) {
  // Placeholder logic since we don't have full user attributes in props usually, unless passed.
  // Props.players has {id, name}.
  const p = props.players.find(x => x.id === id);
  return p ? undefined : undefined;
}

</script>

<template>
  <div class="flex h-full bg-base-200" v-if="initialState">
    <!-- Main Game Area -->
    <div class="relative flex-1 m-2 rounded-lg bg-base-100 overflow-hidden shadow-md flex flex-col">
       
      <!-- Top Bar (Controls inside main area or separate?) Let's keep controls top of main area -->
      <div class="flex items-center justify-between p-2 border-b border-base-200 bg-base-100/50 backdrop-blur z-30">
        <div class="flex items-center gap-2">
          <button class="btn btn-sm btn-ghost" @click="togglePlay">
            <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" class="w-5 h-5" />
          </button>
          <div class="flex items-center gap-1">
            <button class="btn btn-xs" :class="{ 'btn-primary': playbackSpeed === s }" v-for="s in speeds" :key="s" @click="playbackSpeed = s">x{{ s }}</button>
          </div>
        </div>
        
        <div class="flex items-center flex-1 mx-4 gap-2">
           <span class="text-xs font-mono w-12 text-right">{{ formatTime(props.history[currentStep - 1]?.time || 0) }}</span>
           <input type="range" min="0" :max="history.length" v-model.number="currentStep" class="range range-xs range-primary" @input="pause" />
           <span class="text-xs w-12">{{ currentStep }} / {{ history.length }}</span>
        </div>

        <div class="flex gap-1">
          <button class="btn btn-sm btn-ghost" @click="prevStep" :disabled="currentStep <= 0"><Icon icon="mdi:skip-previous" /></button>
           <button class="btn btn-sm btn-ghost" @click="nextStep" :disabled="currentStep >= history.length"><Icon icon="mdi:skip-next" /></button>
        </div>
      </div>

       <!-- Game Board Visualization -->
       <div class="relative flex-1 w-full bg-base-200/50">
          <!-- Players -->
          <div 
              v-for="(player, index) in getPlayersByPosition" 
              :key="player.id"
              class="absolute p-2 rounded-lg bg-base-100 shadow-md transform transition-all duration-300 z-20 border border-base-200"
              :class="{ 'ring-2 ring-primary': currentState?.currentPlayer === player.id }"
              :style="getPlayerPositionStyle(index, players.length)"
          >
              <div class="flex flex-col items-center gap-1">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 font-bold overflow-hidden relative">
                    <span v-if="!getPlayerAvatar(player.id)">{{ player.name[0].toUpperCase() }}</span>
                    <img v-else :src="getPlayerAvatar(player.id)" class="w-full h-full object-cover">
                </div>
                <span class="text-xs font-bold truncate max-w-[80px]">{{ player.name }}</span>
                <span class="badge badge-sm" :class="player.hand?.length === 1 ? 'badge-error animate-pulse' : 'badge-neutral'">
                  {{ player.hand?.length || 0 }}
                </span>
                
                <!-- Last Action Indicator -->
                <div v-if="history[currentStep - 1]?.player === player.id" class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded shadow-sm animate-bounce whitespace-nowrap z-30 pointer-events-none">
                    {{ getActionText(history[currentStep - 1].action) }}
                </div>
              </div>
          </div>

          <!-- Center: Deck & Discard -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="flex gap-8 items-center pointer-events-auto transform translate-y-4">
                <!-- Deck -->
                <div class="relative">
                    <div class="w-16 h-24 bg-gray-800 rounded-lg shadow-xl border-2 border-white flex items-center justify-center text-white/20">
                      <span class="font-bold text-xs transform -rotate-45">UNO</span>
                    </div>
                    <!-- Deck Count -->
                    <div class="absolute -top-2 -right-2 badge badge-neutral badge-sm">{{ currentState?.deck.length }}</div>
                </div>
                
                <!-- Discard Pile -->
                <div class="relative">
                  <div v-if="currentState?.discardPile.length" class="transform scale-100 transition-transform dropdown dropdown-hover dropdown-top">
                      <UnoCard :card="currentState.discardPile[currentState.discardPile.length - 1]" />
                      <!-- Hover to see card details if needed -->
                  </div>
                  <div v-else class="w-16 h-24 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                    Empty
                  </div>

                  <!-- Color Indicator -->
                  <div class="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-base-100/90 px-3 py-1 rounded-full shadow-lg text-xs border border-base-200">
                      <div class="w-3 h-3 rounded-full border border-gray-300 shadow-sm"
                        :class="{
                          'bg-red-500': currentState?.color === 'red',
                          'bg-blue-500': currentState?.color === 'blue',
                          'bg-green-500': currentState?.color === 'green',
                          'bg-yellow-400': currentState?.color === 'yellow',
                          'bg-black': currentState?.color === 'black'
                        }"></div>
                      <span class="font-mono font-bold text-base-content">{{ currentState?.direction === 1 ? '↻' : '↺' }}</span>
                  </div>
                </div>
              </div>
          </div>
       </div>
    </div>

    <!-- Right Sidebar: Move History -->
    <div class="w-64 bg-base-100 border-l border-base-200 flex flex-col shadow-xl z-20">
      <div class="p-3 border-b border-base-200 font-bold bg-base-200/50">
        游戏记录 ({{ history.length }})
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div 
          v-for="(item, index) in history" 
          :key="index"
          class="flex items-start gap-2 p-2 rounded cursor-pointer text-xs transition-colors hover:bg-base-200"
          :class="{ 'bg-primary/10 border border-primary/20': currentStep === index + 1, 'opacity-50': index >= currentStep }"
          @click="setStep(index + 1)"
          :id="`history-item-${index}`"
        >
          <div class="min-w-[20px] text-gray-400 text-right">{{ index + 1 }}.</div>
          <div class="flex flex-col gap-1 flex-1">
            <div class="flex justify-between items-center">
              <span class="font-bold text-base-content/80 truncate max-w-[80px]" :title="players.find(p => p.id === item.player)?.name">
                {{ players.find(p => p.id === item.player)?.name }}
              </span>
              <span class="text-[10px] font-mono text-gray-400">{{ formatTime(item.time) }}</span>
            </div>
            
            <div class="flex items-center gap-1">
              <Icon :icon="getActionIcon(item.action)" class="text-base text-gray-500" />
              <div v-if="item.action.type === 'play_card' && getActionCard(item.action)" class="flex items-center gap-1">
                 <!-- Tiny card preview -->
                 <div class="w-3 h-4 rounded-sm border"
                      :class="{
                        'bg-red-500 border-red-600': getActionCard(item.action)!.color === 'red',
                        'bg-blue-500 border-blue-600': getActionCard(item.action)!.color === 'blue',
                        'bg-green-500 border-green-600': getActionCard(item.action)!.color === 'green',
                        'bg-yellow-400 border-yellow-500': getActionCard(item.action)!.color === 'yellow',
                        'bg-gray-800 border-gray-900': getActionCard(item.action)!.color === 'black'
                      }"
                 ></div>
                 <span class="font-medium text-base-content">{{ getActionText(item.action).replace('出牌 ', '') }}</span>
              </div>
              <span v-else class="text-base-content truncate">{{ getActionText(item.action) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-full text-gray-500">
     无回放数据 (Initial State Missing)
  </div>
</template>

<style scoped>
/* Add any specific transitions if needed */
</style>
