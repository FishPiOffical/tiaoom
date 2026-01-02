<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  history: { type: 'bid' | 'open'; playerId: string; data?: any; time: number }[]
  dice: Record<string, number[]>
  players: { id: string; name: string }[]
  beginTime: number
}>()

// --- Game Logic ---

const history = computed(() => props.history.map(h => ({
  ...h,
  time: h.time
})))

const currentStep = ref(0)
const currentTime = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
let animationFrame: number | null = null
let lastTimestamp = 0
const isAutoStepping = ref(false)

function jumpToStep(step: number) {
  currentStep.value = step
  pause()
}

// Computed State based on currentStep
const gameState = computed(() => {
  let lastBid = null
  let isZhai = false
  let revealedDice = null
  let currentPlayerId = null
  
  const steps = Math.min(currentStep.value, history.value.length)
  
  for (let i = 0; i < steps; i++) {
    const move = history.value[i]
    if (move.type === 'bid') {
      lastBid = { ...move.data, playerId: move.playerId }
      if (move.data.zhai) isZhai = true
    } else if (move.type === 'open') {
      revealedDice = props.dice
    }
  }

  const lastMove = steps > 0 ? history.value[steps - 1] : null
  
  // Determine current player (who is about to move)
  // In Liar's Dice, we can infer from history who is next
  if (steps < history.value.length) {
      currentPlayerId = history.value[steps].playerId
  } else if (lastMove?.type === 'bid') {
      // If last move was bid, next player would be next in circle, but we don't have room info here easily
      // unless we pass it. But for replay, we mainly care about what happened.
  }
  
  return {
    lastBid,
    isZhai,
    revealedDice,
    lastMove,
    currentPlayerId
  }
})

const moveListRef = ref<HTMLElement | null>(null)

// Auto-scroll list
watch(currentStep, () => {
  nextTick(() => {
    if (!moveListRef.value) return
    const activeEl = moveListRef.value.querySelector('.active-move')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
})

// --- Playback Control ---

function togglePlay() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

function play() {
  if (currentStep.value >= history.value.length) {
    currentStep.value = 0
    currentTime.value = 0
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
  if (!isPlaying.value) return
  
  if (!lastTimestamp) lastTimestamp = timestamp
  const delta = timestamp - lastTimestamp
  lastTimestamp = timestamp
  
  currentTime.value += delta * playbackSpeed.value
  
  // Advance steps if needed
  let step = currentStep.value
  while (step < history.value.length && currentTime.value >= history.value[step].time) {
    step++
  }

  if (step !== currentStep.value) {
    isAutoStepping.value = true
    currentStep.value = step
  }

  if (currentStep.value >= history.value.length) {
    pause()
    // Ensure time matches end
    if (history.value.length > 0) {
        currentTime.value = history.value[history.value.length - 1].time
    }
  } else {
    animationFrame = requestAnimationFrame(loop)
  }
}

watch(isPlaying, (playing) => {
  if (playing) {
    if (currentStep.value >= history.value.length) {
      currentStep.value = 0
      currentTime.value = 0
    }
    lastTimestamp = 0
    animationFrame = requestAnimationFrame(loop)
  } else {
    pause()
  }
})

watch(currentStep, (newStep) => {
  if (isAutoStepping.value) {
    isAutoStepping.value = false
    return
  }
  // Manual jump
  currentTime.value = newStep > 0 ? history.value[newStep - 1].time : 0
})

// --- UI Helpers ---

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getPlayerName(id: string) {
  return props.players.find(p => p.id === id)?.name || id
}

function getDiceIcon(face: number) {
  return `mdi:dice-${face}`;
}

function isHit(face: number) {
    if (!gameState.value.lastBid) return false;
    if (gameState.value.isZhai) {
        return face === gameState.value.lastBid.face;
    }
    return face === gameState.value.lastBid.face || face === 1;
}

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden p-4">
    <!-- Game Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-center gap-8 bg-base-200 rounded-lg relative overflow-hidden p-4">
      
      <!-- Status Info -->
      <div class="absolute top-4 left-4 text-sm opacity-60 font-mono">
        {{ formatTime(currentTime) }}
      </div>

      <!-- Last Bid Info -->
      <div class="text-xl font-bold">
        <span>游戏开始</span>
        <span class="text-sm font-normal opacity-60 ml-2">{{ formatTime(currentTime) }}</span>
      </div>

      <!-- Revealed Dice (Always show in replay if game over, or show masked?) -->
      <!-- Usually replay shows everything. Let's show all dice. -->
      <div class="w-full mt-4 overflow-y-auto">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="(dices, pid) in dice" :key="pid" class="bg-base-100 p-2 rounded flex justify-between items-center" :class="{'ring-2 ring-primary': gameState.currentPlayerId === pid}">
            <div class="font-bold truncate">{{ getPlayerName(pid) }}</div>
            <div class="flex gap-1">
               <Icon v-for="(d, i) in dices" :key="i" :icon="getDiceIcon(d)" class="text-2xl" :class="{'text-primary': isHit(d)}" />
            </div>
          </div>
        </div>
      </div>

      <div class="text-xl font-bold opacity-80">
        <span v-if="gameState.lastMove" class="inline-flex items-center gap-2">
          {{ getPlayerName(gameState.lastMove.playerId) }} 
          <span v-if="gameState.lastMove.type === 'bid'" class="inline-flex items-center gap-2">
            叫了 {{ gameState.lastMove.data.count }} 个 
            <Icon :icon="getDiceIcon(gameState.lastBid.face)" class="text-2xl" />
            <span v-if="gameState.isZhai" class="badge badge-error">斋</span>
          </span>
          <span v-else class="badge badge-error">开!</span>
        </span>
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
            <span class="font-medium">{{ getPlayerName(move.playerId) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="move.type === 'bid'" class="badge badge-primary badge-sm">
              {{ move.data.count }}个 <Icon :icon="getDiceIcon(move.data.face)" />
              <span v-if="move.data.zhai" class="text-[10px] ml-1">斋</span>
            </span>
            <span v-else class="badge badge-error badge-sm">开</span>
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
