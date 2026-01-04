<template>
  <div class="w-full h-full relative" :id="id" :title="id">
    <div class="absolute inset-0 pr-1 pb-1 w-[200%] -left-full top-0 flex items-end justify-end border-base-100" 
      :class="canTakeOff ? 
      (getBorderColor(color) + ` border-2 border-dashed`) : 
      getBgColor(color) + borderMap[dir]" 
      :style="{ 
        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', 
        transform: `rotate(${rotateMap[dir]}) ` + ` translate(${translateMap[dir]})`, 

     }"
    >
      <div 
        v-if="piece"
        class="bg-base-100/80 text-base-content border-base-300 border-2 rounded-full w-1/2 h-1/2 flex items-center justify-center text-base md:text-xl"
        :class="getBgColor(piece.color) + ' ' + getTextColor(piece.color)"
        :style="planeDir || getPlaneDir ? { transform: `rotate(${rotateMap[getPlaneDir?.(piece.color) || planeDir!]})` } : {}"
      >
        <div class="indicator">
          <span class="indicator-item badge badge-xs border border-base-100 z-9 scale-80" :class="getBadgeColor(piece.color)" v-if="piece.index !== undefined">
            {{ piece.index + 1 }}
          </span>
          <span>✈</span>
        </div>
      </div>
      <div
        v-else
        class="bg-base-100/80 border border-base-content/10 rounded-full w-1/2 h-1/2 flex items-center justify-center text-base md:text-xl"
        :class="getTextColor(color, false)"
        :style="planeDir ? { transform: `rotate(${rotateMap[planeDir]})` } : {}"
      >
        <span v-if="planeDir && showPlane" class="opacity-50">✈</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AeroplaneColor, getBgColor, getBorderColor, getTextColor, getBadgeColor } from '../board';
import type { AeroplanePlayerState } from '../useAeroplaneChess';

type Dir = 'tl' | 'tr' | 'br' | 'bl';

const props = defineProps<{ 
  color: AeroplaneColor; 
  dir: Dir, 
  planeDir?: Dir, 
  getPlaneDir?: (color: AeroplaneColor) => Dir,
  showPlane?: boolean,
  canTakeOff?: boolean, 
  id: string, 
  pieces?: AeroplanePlayerState[]
}>();

const rotateMap: Record<Dir, string> = {
  br: '0deg',
  bl: '90deg',
  tl: '180deg',
  tr: '270deg',
};
const translateMap: Record<Dir, string> = {
  br: '0%, 0%',
  bl: '0%, -50%',
  tl: '-50%, 0%',
  tr: '0%, 0%',
};
const borderMap: Record<Dir, string> = {
  br: ' border-b border-r',
  bl: ' border-b border-l',
  tl: ' border-t border-l',
  tr: ' border-t border-r',
};

const piece = computed(() => {
  const player = props.pieces?.find(p => p.pieces.some(piece => piece.pos === props.id));
  return player ? { ...player?.pieces.find(piece => piece.pos === props.id), color: player.color } : null;
});
</script>
