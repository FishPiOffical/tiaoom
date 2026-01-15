<template>
  <div 
    class="relative w-12 h-16 md:w-16 md:h-24 rounded-lg border-2 cursor-pointer transition-all duration-200"
    :class="{
      'border-gray-800': !playable,
      'border-blue-500 shadow-lg hover:scale-105': playable,
      'bg-gray-800': !card,
      'bg-white': card && card.color !== 'black',
      'bg-linear-to-br': card && card.color === 'black'
    }"
    @click="handleClick"
  >
    <div v-if="!card" class="flex items-center justify-center h-full text-white font-bold">
      ?
    </div>
    
    <div v-else class="relative w-full h-full flex flex-col items-center justify-center p-1">
      <!-- 背景色 -->
      <div 
        v-if="card.color !== 'black'"
        class="absolute inset-0 rounded-md"
        :class="{
          'bg-red-500': card.color === 'red',
          'bg-blue-500': card.color === 'blue',
          'bg-green-500': card.color === 'green',
          'bg-yellow-400': card.color === 'yellow'
        }"
      ></div>
      
      <div 
        v-else
        class="absolute inset-0 rounded-md bg-linear-to-br from-red-500 via-blue-500 to-green-500"
      ></div>

      <!-- 卡牌内容 -->
      <div class="relative text-white font-bold text-center text-xs md:text-sm">
        <div v-if="card.type === 'number'">
          {{ card.value }}
        </div>
        <div v-else-if="card.value === 'skip'" class="text-xs md:text-xs">
          <div class="text-base md:text-lg">⊘</div>
          <span class="hidden md:inline">跳过</span>
        </div>
        <div v-else-if="card.value === 'reverse'" class="text-xs md:text-xs">
          <div class="text-base md:text-lg">⟲</div>
          <span class="hidden md:inline">反转</span>
        </div>
        <div v-else-if="card.value === 'draw2'" class="text-xs md:text-xs">
          <div class="text-base md:text-lg">+2</div>
        </div>
        <div v-else-if="card.value === 'wild'" class="text-xs md:text-xs">
          <div class="text-base md:text-lg">🌈</div>
          <span class="hidden md:inline">变色</span>
        </div>
        <div v-else-if="card.value === 'wild_draw4'" class="text-xs md:text-xs">
          <div class="text-base md:text-lg">+4</div>
          <div class="text-xs md:text-xs">🌈</div>
        </div>
      </div>

      <!-- 可玩指示器 -->
      <div 
        v-if="playable"
        class="absolute -top-1 -right-1 w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UnoCard } from '$/backend/src/games/uno'

interface Props {
  card: UnoCard | null
  playable?: boolean
}

interface Emits {
  (e: 'play', card: UnoCard): void
  (e: 'cant-play'): void
}

const props = withDefaults(defineProps<Props>(), {
  playable: false
})

const emit = defineEmits<Emits>()

const handleClick = () => {
  if (props.card) {
    if (props.playable) {
      emit('play', props.card)
    } else {
      emit('cant-play')
    }
  }
}
</script>