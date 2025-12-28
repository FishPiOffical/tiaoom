<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  history: any[]
  players: { username: string, name: string }[]
  beginTime: number
}>()

// --- Game Logic ---

interface ReplayPlayer {
  name: string
  word: string
  isSpy: boolean
  isDead: boolean
  isSpeaking: boolean
  voteTarget?: string | null // Name of player voted for
  avatar?: string
}

interface ChatMessage {
  player: string
  content: string
  time: number
  type: 'talk' | 'system' | 'vote' | 'dead'
  stepIndex?: number
}

const history = computed(() => props.history.map(h => ({
  ...h,
  time: h.time - props.beginTime
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

const allMessages = computed(() => {
  return history.value.map((event, index) => {
    let msg: ChatMessage | null = null;
    switch (event.type) {
      case 'start':
        msg = { type: 'system', content: '游戏开始', player: '', time: event.time }
        break
      case 'talk':
        msg = { type: 'talk', content: event.content, player: event.player, time: event.time }
        break
      case 'startVote':
        msg = { type: 'system', content: '开始投票', player: '', time: event.time }
        break
      case 'vote':
        const content = event.target ? `投票给 ${event.target}` : `弃权`
        msg = { type: 'vote', content, player: event.player, time: event.time }
        break
      case 'dead':
        msg = { type: 'dead', content: `${event.player} 出局`, player: '', time: event.time }
        break
    }
    if (!msg) return null;
    return { ...msg, stepIndex: index + 1 };
  }).filter((m): m is (ChatMessage & { stepIndex: number }) => m !== null)
})

const activeMessageIndex = computed(() => {
  let idx = -1
  for (let i = 0; i < allMessages.value.length; i++) {
    if (allMessages.value[i].stepIndex! <= currentStep.value) {
      idx = i
    } else {
      break
    }
  }
  return idx
})

// Computed State based on currentStep
const gameState = computed(() => {
  // Initialize players
  // Find start event to get words and roles
  const startEvent = history.value.find(h => h.type === 'start')
  
  let currentPlayers: ReplayPlayer[] = props.players.map(p => ({
    name: p.name,
    word: '?',
    isSpy: false,
    isDead: false,
    isSpeaking: false
  }))

  if (startEvent && startEvent.players) {
    currentPlayers = startEvent.players.map((p: any) => ({
      name: p.name,
      word: p.word,
      isSpy: p.isSpy,
      isDead: false,
      isSpeaking: false
    }))
  }

  const steps = Math.min(currentStep.value, history.value.length)
  
  for (let i = 0; i < steps; i++) {
    const event = history.value[i]
    
    switch (event.type) {
      case 'start':
        status = 'talking'
        break
      case 'turn':
        currentPlayers.forEach(p => p.isSpeaking = false)
        const speaker = currentPlayers.find(p => p.name === event.player)
        if (speaker) speaker.isSpeaking = true
        break
      case 'talk':
        break
      case 'startVote':
        status = 'voting'
        currentPlayers.forEach(p => p.isSpeaking = false)
        currentPlayers.forEach(p => p.voteTarget = undefined)
        break
      case 'vote':
        const voter = currentPlayers.find(p => p.name === event.player)
        if (voter) {
          voter.voteTarget = event.target
        }
        break
      case 'dead':
        const dead = currentPlayers.find(p => p.name === event.player)
        if (dead) dead.isDead = true
        status = 'talking'
        break
    }
  }

  return {
    players: currentPlayers,
    status
  }
})

const chatListRef = ref<HTMLElement | null>(null)

// Auto-scroll chat
watch(activeMessageIndex, () => {
  nextTick(() => {
    if (!chatListRef.value) return
    const activeEl = chatListRef.value.querySelector('.active-msg')
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

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full overflow-hidden p-4">
    <!-- Game Area -->
    <section class="flex-1 md:h-full flex flex-col gap-4 overflow-hidden">
      <!-- Players Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-2">
        <div 
          v-for="p in gameState.players" 
          :key="p.name" 
          class="relative bg-base-200 border border-base-content/20 p-4 rounded-lg shadow-md flex flex-col items-center gap-2 transition-all"
          :class="{ 
            'opacity-50 grayscale': p.isDead,
            'ring-2 ring-primary': p.isSpeaking,
            'ring-2 ring-accent': gameState.status === 'voting' && p.voteTarget
          }"
        >
          <!-- Avatar -->
          <div class="w-12 h-12 rounded-full bg-base-300 border border-base-content/20 flex items-center justify-center text-xl font-bold relative">
            <span v-if="!p.avatar">{{ p.name.substring(0, 1).toUpperCase() }}</span>
            <img 
              v-else 
              :src="p.avatar" 
              alt="avatar" 
              class="w-full h-full object-cover rounded-full"
            />
            <span v-if="p.isSpy" class="absolute -top-1 -right-1 text-xs bg-error text-white px-1 rounded-full">卧</span>
          </div>
          
          <div class="text-center w-full">
            <div class="font-bold truncate w-full" :class="{ 'line-through': p.isDead }">{{ p.name }}</div>
            <div class="mt-1 badge" :class="{ 'badge-info': !p.isSpy, 'badge-error': p.isSpy}">{{ p.word }}</div>
          </div>

          <!-- Vote Target Indicator -->
          <div v-if="gameState.status === 'voting' && p.voteTarget" class="text-xs text-error font-bold">
            投票给: {{ p.voteTarget }}
          </div>
          <div v-if="gameState.status === 'voting' && p.voteTarget === null" class="text-xs text-base-content/50 font-bold">
            弃权
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="bg-base-200 p-2 rounded-lg flex justify-between items-center">
        <div class="font-bold">
          状态: 
          <span v-if="gameState.status === 'waiting'">等待开始</span>
          <span v-else-if="gameState.status === 'talking'" class="text-primary">发言阶段</span>
          <span v-else-if="gameState.status === 'voting'" class="text-accent">投票阶段</span>
        </div>
        <div class="font-mono opacity-60">{{ formatTime(currentTime) }}</div>
      </div>
    </section>

    <!-- Chat / History / Controls -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-base-content/20 md:pt-0 md:pl-4 flex flex-col h-[50vh] md:h-full min-h-0">
      <h3 class="text-lg font-bold p-2 flex items-center gap-2">
        <Icon icon="mdi:chat" />
        对局记录
      </h3>
      
      <!-- Chat List -->
      <div class="flex-1 min-h-0 overflow-y-auto space-y-2 p-2 bg-base-200 rounded-lg" ref="chatListRef">
        <div 
          v-for="(msg, index) in allMessages" 
          :key="index" 
          class="text-sm p-1 rounded cursor-pointer transition-colors hover:bg-base-100"
          :class="{ 
            'bg-base-100 active-msg ring-1 ring-primary/20': index === activeMessageIndex,
            'opacity-50': index > activeMessageIndex
          }"
          @click="jumpToStep(msg.stepIndex!)"
        >
          <div v-if="msg.type === 'system'" class="text-center text-base-content/50 text-xs my-2 divider">
            {{ msg.content }}
          </div>
          <div v-else-if="msg.type === 'dead'" class="text-center text-error font-bold my-2">
            💀 {{ msg.content }}
          </div>
          <div v-else class="flex flex-col gap-1" :class="msg.type === 'vote' ? 'opacity-70' : ''">
            <div class="flex items-center gap-2">
              <span class="font-bold">{{ msg.player }}</span>
              <span class="text-xs opacity-50">{{ formatTime(msg.time) }}</span>
            </div>
            <div class="bg-base-100 p-2 rounded-lg inline-block" :class="msg.type === 'vote' ? 'italic' : ''">
              {{ msg.content }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Controls -->
      <div class="my-2 flex flex-col gap-2 sticky bottom-0 bg-base-100 pt-2">
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
    </aside>
  </section>
</template>
