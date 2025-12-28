<template>
  <section class="flex flex-col items-center justify-center p-2 py-4" ref="containerRef">
    <!-- 阵营信息 -->
    <div v-if="myCamp" class="mb-2 flex items-center gap-2 text-sm">
      <span>我的阵营：</span>
      <span
        class="font-bold px-2 py-0.5 rounded text-xs"
        :class="myCamp === 'red' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'"
      >
        {{ myCamp === 'red' ? '红方' : '黑方' }}
      </span>
    </div>

    <!-- 棋盘 -->
    <div class="inline-block bg-amber-100 border-2 border-amber-800 p-1 rounded shadow-2xl select-none">
      <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          @click="handleCellClick(rowIndex, colIndex)"
          class="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border border-amber-700 bg-amber-50 cursor-pointer hover:bg-amber-200 transition-colors"
          :class="{
            'ring-2 ring-blue-500': selectedCell?.x === rowIndex && selectedCell?.y === colIndex,
          }"
        >
          <!-- 棋子 -->
          <div
            v-if="cell"
            class="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold shadow-lg border-2 transition-all duration-300"
            :class="[
              cell.isOpen
                ? (cell.side === 'red'
                    ? 'bg-red-100 border-red-600 text-red-600'
                    : 'bg-gray-100 border-gray-800 text-gray-800')
                : 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-900 text-amber-200',
              cell.side === myCamp && cell.isOpen ? 'ring-1 ring-green-400' : ''
            ]"
          >
            <span v-if="cell.isOpen">{{ cell.name }}</span>
            <span v-else class="text-base">?</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 当前回合信息 -->
    <div v-if="isPlaying" class="mt-2 -mb-2 flex items-center gap-2 text-sm">
      <template v-if="isFirstFlip">
        <span class="text-warning">等待翻棋...</span>
      </template>
      <template v-else>
        <span
          class="w-3 h-3 rounded-full"
          :class="currentPlayer?.attributes?.camp === 'red' ? 'bg-red-500' : 'bg-gray-800'"
        ></span>
        <span class="font-bold">{{ currentPlayer?.name }}</span>
        <span :class="isMyTurn ? 'text-success' : 'text-base-content/60'">
          {{ isMyTurn ? '(你)' : '' }}
        </span>
      </template>
    </div>

    <!-- 控制面板 -->
    <div
      v-if="isPlaying && showControl"
      class="fixed z-100 bg-base-300/60 top-0 left-0 w-full h-full flex flex-col items-center justify-center">
      <div v-if="isPlaying && roomPlayer.role === PlayerRole.player" class="group flex gap-2">
        <button class="btn btn-circle btn-soft btn-warning tooltip"
          @click="requestDraw"
          :disabled="!isMyTurn"
          data-tip="请求和棋"
        >
          <Icon icon="mdi:handshake" />
        </button>
        <button class="btn btn-circle btn-soft btn-success tooltip"
          @click="requestLose"
          :disabled="!isMyTurn"
          data-tip="认输"
        >
          <Icon icon="mdi:flag" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PlayerRole, Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useChessflip } from './useChessflip';
import { onMounted, ref } from 'vue';
import hotkeys from 'hotkeys-js';
import Icon from '@/components/common/Icon.vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  isPlaying,
  isMyTurn,
  currentPlayer,
  board,
  myCamp,
  isFirstFlip,
  selectedCell,
  handleCellClick,
  requestDraw,
  requestLose,
} = useChessflip(props.game, props.roomPlayer)

const containerRef = ref<HTMLElement>();
onMounted(() => {
  const rect = containerRef.value?.parentElement?.getBoundingClientRect();
  if (!rect) return;
  if (rect.height < window.innerHeight) {
    window.resizeTo(window.innerWidth, rect.height);
  }
})

const showControl = ref(false);
hotkeys('esc', () => {
  if (props.roomPlayer.role == PlayerRole.watcher) return;
  showControl.value = !showControl.value;
});
</script>
