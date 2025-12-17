<template>
  <div
    class="relative rounded-lg border-2 cursor-pointer transition-all duration-200"
    :class="[
      small ? 'w-8 h-12 md:w-10 md:h-14' : 'w-12 h-16 md:w-14 md:h-20',
      selected ? 'border-primary ring-2 ring-primary -translate-y-2' : 'border-gray-300',
      selectable ? 'hover:scale-105 hover:shadow-lg' : '',
      'bg-white shadow-md'
    ]"
    @click="handleClick"
  >
    <!-- 牌面内容 -->
    <div class="relative w-full h-full flex flex-col items-center justify-center p-0.5">
      <!-- 花色和数字 -->
      <div
        class="font-bold text-center"
        :class="[
          small ? 'text-xs' : 'text-sm md:text-base',
          suitColor
        ]"
      >
        <!-- 大小王特殊处理 -->
        <template v-if="card.suit === 'joker'">
          <div :class="small ? 'text-lg' : 'text-xl md:text-2xl'">
            {{ card.value === 17 ? '👑' : '🃏' }}
          </div>
          <div :class="small ? 'text-xs' : 'text-xs'">
            {{ card.display }}
          </div>
        </template>
        <!-- 普通牌 -->
        <template v-else>
          <div :class="small ? 'text-xs' : 'text-sm'">{{ suitSymbol }}</div>
          <div :class="small ? 'text-sm' : 'text-lg md:text-xl'">{{ card.display }}</div>
          <div :class="small ? 'text-xs' : 'text-sm'">{{ suitSymbol }}</div>
        </template>
      </div>

      <!-- 选中指示器 -->
      <div
        v-if="selected"
        class="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DoudizhuCard } from '../../../../backend/src/games/doudizhu'

interface Props {
  card: DoudizhuCard
  selected?: boolean
  selectable?: boolean
  small?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  selectable: false,
  small: false
})

const emit = defineEmits<{
  (e: 'click', card: DoudizhuCard): void
}>()

const suitSymbol = computed(() => {
  switch (props.card.suit) {
    case 'spade': return '♠'
    case 'heart': return '♥'
    case 'diamond': return '♦'
    case 'club': return '♣'
    default: return ''
  }
})

const suitColor = computed(() => {
  if (props.card.suit === 'joker') {
    return props.card.value === 17 ? 'text-red-600' : 'text-gray-800'
  }
  if (props.card.suit === 'heart' || props.card.suit === 'diamond') {
    return 'text-red-600'
  }
  return 'text-gray-800'
})

const handleClick = () => {
  if (props.selectable) {
    emit('click', props.card)
  }
}
</script>

<style scoped>
</style>
