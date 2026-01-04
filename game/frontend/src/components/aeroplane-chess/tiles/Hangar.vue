<template>
  <div class="w-full h-full relative overflow-hidden border-base-100 border-2">
    <div class="w-full h-full opacity-60" :class="getBgColor(color)"></div>
    <div class="absolute inset-0 p-2">
      <div class="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full">
        <div
          v-for="n in 4"
          :key="n"
          class="bg-base-100/80 border-2 border-base-200 rounded-full w-2/3 h-2/3 mx-auto my-auto flex items-center justify-center text-2xl"
          :class="pieces?.some(p => p.index === n - 1) ? getTextColor(color) + ' ' + getBgColor(color) : getTextColor(color, false)"
        >
          <div class="indicator" v-if="pieces?.some(p => p.index === n - 1)">
            <span 
              class="indicator-item badge badge-xs border border-base-100 z-9 scale-80" 
              :class="getBadgeColor(color)" 
            >
              {{ n }}
            </span>
            <span :style="getRotate(planeDir, pieces?.find(p => p.index === n - 1)?.area || 'hangar')">✈</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AeroplaneColor, getBgColor, getTextColor, getBadgeColor } from '../board';
import { AeroplanePlayerState } from '../useAeroplaneChess';

type Dir = 'tl' | 'tr' | 'br' | 'bl';

const props = defineProps<{ 
  color: AeroplaneColor, 
  planeDir?: Dir,
  pieces?: AeroplanePlayerState[]
}>();
const rotateMap: Record<Dir, string> = {
  br: '0deg',
  bl: '90deg',
  tl: '180deg',
  tr: '270deg',
};
const finishRotateMap: Record<Dir, string> = {
  br: '180deg',
  bl: '90deg',
  tl: '0deg',
  tr: '270deg',
};

const pieces = computed(() => {
  return props.pieces?.find(p => p.color === props.color)?.pieces
  .filter(piece => piece.area === 'hangar' || piece.area === 'finish');
});

function getRotate(dir: Dir | undefined, area: string) {
  if (!dir) return {};
  if (area === 'finish') {
    return { transform: `rotate(${finishRotateMap[dir]})` };
  }
  return { transform: `rotate(${rotateMap[dir]})` };
}
</script>
