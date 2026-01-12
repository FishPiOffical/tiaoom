<template>
  <div
    class="relative"
    :style="{ width: boardPx + 'px', height: boardPx + 'px' }"
  >
    <div
      class="w-full h-full grid grid-cols-[repeat(17,var(--size))] grid-rows-[repeat(17,var(--size))] gap-0 p-0"
      :style="gridStyle"
    >
      <component
        v-for="t in tiles"
        :key="t.id"
        :is="tileComponent(t)"
        v-bind="t"
        :style="tileStyle(t)"
        :size="cellPx"
        :pieces="pieces"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Hangar from './tiles/Hangar.vue';
import Track from './tiles/Track.vue';
import Runway from './tiles/Runway.vue';
import Corner from './tiles/Corner.vue';
import Center from './tiles/Center.vue';

import { GRID_SIZE } from './board';
import { DEFAULT_TILES, type TilePlacement } from './layout';
import { AeroplaneGameState } from './useAeroplaneChess';

const props = defineProps<{
  state: AeroplaneGameState | null;
  myPlayerId: string;
  movable: (0 | 1 | 2 | 3)[];
  canMove: boolean;
  cellPx: number;
}>();

const emit = defineEmits<{ (e: 'pieceClick', pieceIndex: 0 | 1 | 2 | 3): void }>();

const tiles = computed(() => DEFAULT_TILES);

const boardPx = computed(() => props.cellPx * GRID_SIZE);

const gridStyle = computed(() => {
  return {
    gridTemplateColumns: `repeat(${GRID_SIZE}, ${props.cellPx}px)`,
    gridTemplateRows: `repeat(${GRID_SIZE}, ${props.cellPx}px)`,
    gap: '0px',
    padding: '0px',
  } as Record<string, string>;
});

function tileStyle(t: TilePlacement) {
  return {
    gridColumn: `${t.col + 1} / span ${t.colSpan}`,
    gridRow: `${t.row + 1} / span ${t.rowSpan}`,
  };
}

function tileComponent(t: TilePlacement) {
  switch (t.kind) {
    case 'hangar':
      return Hangar;
    case 'track':
      return Track;
    case 'runway':
      return Runway;
    case 'corner':
      return Corner;
    case 'center':
      return Center;
  }
}

const pieces = computed(() => Object.values(props.state?.players ?? {}))
</script>
