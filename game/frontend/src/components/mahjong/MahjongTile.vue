<template>
  <div
    class="mahjong-tile relative rounded-md border-2 cursor-pointer transition-all duration-200 flex items-center justify-center"
    :class="[
      sizeClasses,
      selected ? 'border-primary ring-2 ring-primary -translate-y-2' : 'border-gray-300',
      selectable ? 'hover:scale-105 hover:shadow-lg hover:-translate-y-1' : '',
      hidden ? 'bg-green-700' : 'bg-gradient-to-br from-white to-gray-100',
      'shadow-md'
    ]"
    @click="handleClick"
  >
    <!-- 隐藏的牌（背面） -->
    <template v-if="hidden">
      <div class="w-full h-full flex items-center justify-center">
        <div class="w-3/4 h-3/4 rounded border-2 border-green-800 bg-green-600 flex items-center justify-center">
          <span class="text-green-200 font-bold text-xs">麻</span>
        </div>
      </div>
    </template>

    <!-- 显示的牌（正面） -->
    <template v-else>
      <div class="flex flex-col items-center justify-center p-0.5 w-full h-full">
        <!-- 万筒条 -->
        <template v-if="tile.suit === 'wan' || tile.suit === 'tong' || tile.suit === 'tiao'">
          <div class="flex flex-col items-center">
            <span class="font-bold" :class="[textSizeClass, suitColor]">
              {{ getNumberDisplay(tile.value) }}
            </span>
            <span class="font-medium" :class="[smallTextClass, suitColor]">
              {{ getSuitDisplay(tile.suit) }}
            </span>
          </div>
        </template>

        <!-- 风牌 -->
        <template v-else-if="tile.suit === 'feng'">
          <span class="font-bold" :class="[textSizeClass, 'text-blue-700']">
            {{ tile.display }}
          </span>
        </template>

        <!-- 箭牌 -->
        <template v-else-if="tile.suit === 'jian'">
          <span class="font-bold" :class="[textSizeClass, jianColor]">
            {{ tile.display }}
          </span>
        </template>
      </div>

      <!-- 选中指示器 -->
      <div
        v-if="selected"
        class="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MahjongTile, TileSuit } from '$/backend/src/games/mahjong'

interface Props {
  tile: MahjongTile
  selected?: boolean
  selectable?: boolean
  hidden?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  selectable: false,
  hidden: false,
  size: 'md'
})

const emit = defineEmits<{
  (e: 'click', tile: MahjongTile): void
}>()

// 尺寸类
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-6 h-8'
    case 'sm':
      return 'w-8 h-11'
    case 'md':
      return 'w-10 h-14'
    case 'lg':
      return 'w-12 h-16'
    default:
      return 'w-10 h-14'
  }
})

const textSizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'text-xs'
    case 'sm':
      return 'text-sm'
    case 'md':
      return 'text-lg'
    case 'lg':
      return 'text-xl'
    default:
      return 'text-lg'
  }
})

const smallTextClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'text-[8px]'
    case 'sm':
      return 'text-[10px]'
    case 'md':
      return 'text-xs'
    case 'lg':
      return 'text-sm'
    default:
      return 'text-xs'
  }
})

// 花色颜色
const suitColor = computed(() => {
  switch (props.tile.suit) {
    case 'wan':
      return 'text-red-600'
    case 'tong':
      return 'text-blue-600'
    case 'tiao':
      return 'text-green-600'
    default:
      return 'text-gray-800'
  }
})

// 箭牌颜色
const jianColor = computed(() => {
  switch (props.tile.value) {
    case 1: // 中
      return 'text-red-600'
    case 2: // 发
      return 'text-green-600'
    case 3: // 白
      return 'text-gray-400'
    default:
      return 'text-gray-800'
  }
})

// 数字显示
const getNumberDisplay = (value: number): string => {
  const numbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
  return numbers[value - 1] || ''
}

// 花色显示
const getSuitDisplay = (suit: TileSuit): string => {
  switch (suit) {
    case 'wan':
      return '万'
    case 'tong':
      return '筒'
    case 'tiao':
      return '条'
    default:
      return ''
  }
}

const handleClick = () => {
  if (props.selectable && !props.hidden) {
    emit('click', props.tile)
  }
}

</script>

<style scoped>
.mahjong-tile {
  user-select: none;
}
</style>
