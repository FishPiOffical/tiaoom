<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  history: { playerId: string; increment: number; time: number }[]
  target: number
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
  let count = 0
  
  const steps = Math.min(currentStep.value, history.value.length)
  
  for (let i = 0; i < steps; i++) {
    count += history.value[i].increment
  }

  const lastMove = steps > 0 ? history.value[steps - 1] : null
  const nextMove = steps < history.value.length ? history.value[steps] : null
  
  // Determine current player (who is about to move)
  // In Click game, players usually alternate. 
  // But we can just look at who is next in history.
  const currentPlayerId = nextMove?.playerId
  
  return {
    count,
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

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden p-4">
    <!-- Game Area -->
    <section class="flex-1 md:h-full flex flex-col items-center justify-center gap-8 bg-base-200 rounded-lg relative overflow-hidden">
      
      <!-- Status Info -->
      <div class="absolute top-4 left-4 text-sm opacity-60 font-mono">
        {{ formatTime(currentTime) }}
      </div>

      <h1 class="text-[50px] font-bold p-4 transition-all duration-300" :class="{ 'scale-110 text-primary': gameState.lastMove }">
        {{ gameState.count }} {{ gameState.count == target ? "=" : "!" }}= {{ target }}
      </h1>

      <!-- Visual Buttons (Disabled) -->
      <div class="join">
        <button
          v-for="n in 4"
          :key="n"
          class="btn btn-primary join-item btn-lg"
          disabled
          :class="{ 'btn-active': gameState.lastMove?.increment === n }"
        >
          +{{ n }}
        </button>
      </div>

      <div class="text-xl font-bold opacity-80">
        <span v-if="gameState.lastMove">
          {{ getPlayerName(gameState.lastMove.playerId) }} +{{ gameState.lastMove.increment }}
        </span>
        <span v-else>
          游戏开始
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
          <div class="flex items-center gap-4">
            <span class="badge badge-primary badge-sm">+{{ move.increment }}</span>
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
