<template>
  <div 
    :id="id"
    class="w-full h-full relative flex items-center justify-center border-base-100" 
    :class="getBgColor(color) + 
      (border == true ? ' border' : border ? 
        (border.t ? ' border-t' : '') + 
        (border.b ? ' border-b' : '') + 
        (border.l ? ' border-l' : '') + 
        (border.r ? ' border-r' : '') 
        : ''
      )"
    >
    <div
      v-if="piece"
      class="bg-base-100/80 border-base-300 border-2 text-base-200 rounded-full text-xl flex items-center justify-center shadow-2xl"
      :class="getBgColor(piece.color) + ' ' + getTextColor(piece.color)"
      :style="{ 
        width: (size - 2) + 'px', 
        height: (size - 2) + 'px', 
        borderRadius: (size - 2) + 'px', 
        ...planeDir ? { transform: `rotate(${rotateMap[planeDir]})` } : {}
      }"
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
      class="bg-base-100/80 border border-base-content/10 rounded-full text-2xl flex items-center justify-center"
      :class="getTextColor(color, false)"
      :style="{ 
        width: size + 'px', 
        height: size + 'px', 
        borderRadius: size + 'px', 
        ...planeDir ? { transform: `rotate(${rotateMap[planeDir]})` } : {}
      }"
    >
      <span v-if="planeDir" class="opacity-50">✈</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AeroplaneColor, getBgColor, getTextColor, getBadgeColor } from '../board';
import { AeroplanePlayerState } from '../useAeroplaneChess';

type Dir = 'tl' | 'tr' | 'br' | 'bl';

const props = withDefaults(defineProps<{
  color: AeroplaneColor;
  size: number;
  planeDir?: Dir;
  border?: boolean | { l?: boolean; r?: boolean; t?: boolean; b?: boolean };
  id: string;
  pieces?: AeroplanePlayerState[]
}>(), {
  border: true,
});

const size = computed(() => props.size - 3);
const rotateMap: Record<Dir, string> = {
  br: '0deg',
  bl: '90deg',
  tl: '180deg',
  tr: '270deg',
};
const piece = computed(() => {
  const player = props.pieces?.find(p => p.pieces.some(piece => piece.pos === props.id && piece.pos !== p.color + '19'));
  return player ? { 
    ...player?.pieces.find(piece => piece.pos === props.id && piece.pos !== player.color + '19'), 
    color: player.color 
  } : null;
});
</script>
