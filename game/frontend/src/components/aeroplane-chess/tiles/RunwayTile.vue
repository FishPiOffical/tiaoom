<template>
  <div class="w-full h-full relative z-10">
    <section 
      class="flex justify-start items-center h-full relative" 
      :style="{ 
        transform: `rotate(${rotateMap[dir]})` + ` translate(${translateMap[dir]})`,
        width: size * 5 + 'px',
        margin: `0 -${size * 2}px`,
      }">
      <div class="h-0 border-4 border-dashed flex-1 w-full" :class="getBorderColor(color)"></div>
      <div
        class="w-0 h-0 border-t-8 border-b-8 border-l-16 border-t-transparent border-b-transparent"
        :class="getBorderColor(color) + ' border-l-' + getBorderColor(color)"
      ></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getBorderColor, AeroplaneColor } from '../board';

type Dir = 'tl' | 'tr' | 'br' | 'bl';
defineProps<{ color: AeroplaneColor; dir: Dir, size: number }>();

const rotateMap: Record<Dir, string> = {
  br: '0deg',
  bl: '90deg',
  tl: '180deg',
  tr: '270deg',
};
const translateMap: Record<Dir, string> = {
  br: '3px, 0%',
  bl: '0%, 3px',
  tl: '3px, 0%',
  tr: '0%, 3px',
};
</script>
