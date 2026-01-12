<template>
  <div class="w-full h-full rounded-xl overflow-hidden relative">
    <!-- 添加四个三角形平分整个矩形区域 -->
    <div
      v-for="n in 4"
      :key="n"
      class="absolute w-full h-full bg-base-100/80 border border-base-content/10 flex items-center justify-center text-2xl"
      :class="getBgColor(colors[n - 1])"
      :style="{
        clipPath: clipMap[n - 1],
      }"
    >
    </div>
  </div>
</template>

<script setup lang="ts">
import { getBgColor } from '../board';
const colors = ['b', 'r', 'g', 'y'] as const;
const clipMap = [
  'polygon(0 0, 100% 0, 50% 50%)',
  'polygon(100% 0, 100% 100%, 50% 50%)',
  'polygon(0 100%, 100% 100%, 50% 50%)',
  'polygon(0 0, 50% 50%, 0 100%)',
]
</script>
