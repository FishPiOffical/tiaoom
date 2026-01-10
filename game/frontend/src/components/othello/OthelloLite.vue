<template>
  <section
    class="flex flex-col items-center justify-center p-2 py-4"
    ref="containerRef"
  >
    <!-- 棋盘 -->
    <div
      class="inline-block bg-base-300 border border-base-content/20 p-1 rounded shadow-2xl m-auto max-w-[99vw] max-h-[90vh] select-none relative"
    >
      <div v-if="isSealed" class="absolute inset-0 z-50 bg-base-100/50 backdrop-blur-sm flex items-center justify-center rounded">
        <div class="text-center">
          <div class="text-xl font-bold mb-2">已封盘</div>
          <button 
            v-if="sealRequesterId === roomPlayer.id"
            class="btn btn-sm btn-primary mt-2" 
            @click="unseal"
          >
            解除封盘
          </button>
        </div>
      </div>
      <!-- 顶部横坐标 (A-H) -->
      <div class="flex">
        <div class="w-[8vw] md:w-7 h-[8vw] md:h-7 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
        <div v-for="colIndex in 8" :key="'col-top-' + colIndex" 
             class="w-[8vw] md:w-7 h-[8vw] md:h-7 flex items-center justify-center text-xs font-bold text-base-content/60">
          {{ String.fromCharCode(64 + colIndex) }}
        </div>
        <div class="w-[8vw] md:w-7 h-[8vw] md:h-7 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
      </div>
      
      <!-- 棋盘行 -->
      <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
        <!-- 左侧纵坐标 (8-1) -->
        <div class="w-[8vw] md:w-7 h-[8vw] md:h-7 flex items-center justify-center text-xs font-bold text-base-content/60">
          {{ 8 - rowIndex }}
        </div>
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          @click="placePiece(rowIndex, colIndex)"
          class="relative w-[8vw] h-[8vw] md:w-7 md:h-7 flex items-center justify-center border border-base-content/10"
          :class="{
            'cursor-pointer group':
              currentPlayer?.id === roomPlayer.id && cell === 0,
            'cursor-not-allowed':
              currentPlayer?.id === roomPlayer.id && cell !== 0,
          }"
        >
          <span
            v-if="!isSealed"
            class="group-hover:inline hidden opacity-80 w-[7vw] h-[7vw] md:w-6 md:h-6 rounded-full transition-all duration-500 z-10"
            :class="[
              currentPlayer?.attributes?.color === 1
                ? 'black-piece border border-base-content/20 shadow-lg'
                : 'white-piece shadow-lg',
            ]"
          >
          </span>
          <span
            v-if="cell > 0 && !isSealed"
            class="w-[7vw] h-[7vw] md:w-6 md:h-6 rounded-full transition-all duration-500 z-10"
            :class="[
              cell === 1
                ? 'black-piece border border-base-content/20 shadow-lg'
                : 'white-piece shadow-lg',
              currentPlace?.x === rowIndex && currentPlace?.y === colIndex
                ? 'ring-2 ring-error scale-105'
                : '',
            ]"
          />
          <div
            v-if="cell === 0 && (currentPlayer?.id === roomPlayer.id || roomPlayer.role !== 'player') && !isSealed"
            class="absolute w-2 h-2 rounded-full bg-base-content/30"
          ></div>
        </div>
        <!-- 右侧纵坐标 (8-1) -->
        <div class="w-[8vw] md:w-7 h-[8vw] md:h-7 flex items-center justify-center text-xs font-bold text-base-content/60">
          {{ 8 - rowIndex }}
        </div>
      </div>
      
      <!-- 底部横坐标 (A-H) -->
      <div class="flex">
        <div class="w-[8vw] md:w-7 h-[8vw] md:h-7 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
        <div v-for="colIndex in 8" :key="'col-bottom-' + colIndex" 
             class="w-[8vw] md:w-7 h-[8vw] md:h-7 flex items-center justify-center text-xs font-bold text-base-content/60">
          {{ String.fromCharCode(64 + colIndex) }}
        </div>
        <div class="w-[8vw] md:w-7 h-[8vw] md:h-7 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
      </div>
    </div>

    <!-- 当前回合 -->
    <div
      v-if="isPlaying"
      class="flex items-center justify-center gap-3 mt-2 -mb-2 text-sm"
    >
      <div
        class="w-[1.4em] h-[1.4em] flex items-center justify-center bg-base-300 rounded-full border border-base-content/20"
      >
        <span
          class="w-full h-full rounded-full"
          :class="
            currentPlayer?.attributes.color === 1
              ? 'bg-black border border-white/20 shadow-md'
              : 'bg-white border border-black/20 shadow-md'
          "
        />
      </div>
      <b class="text-base-content">{{ currentPlayer?.name }}</b>
      <span class="text-xs bg-base-content/10 px-2 py-0.5 rounded" :class="{ 'text-error': timer < 10 }">
        {{ timerStr }}
      </span>
    </div>
    <div 
      v-if="isPlaying && showControl" 
      class="fixed z-100 bg-base-300/60 top-0 left-0 w-full h-full flex flex-col items-center justify-center">
      <div v-if="isPlaying && roomPlayer.role === PlayerRole.player" class="group flex gap-2">
        <button class="btn btn-circle btn-soft btn-warning tooltip" 
          @click="requestDraw"
          :disabled="currentPlayer?.id !== roomPlayer.id"
          data-tip="请求和棋"
        >
          <Icon icon="mdi:handshake" />
        </button>
        <button class="btn btn-circle btn-soft btn-success tooltip" 
          @click="requestLose"
          :disabled="currentPlayer?.id !== roomPlayer.id || isSealed"
          data-tip="认输"
        >
          <Icon icon="mdi:flag" />
        </button>
        <button v-if="!isSealed" class="btn btn-circle btn-soft btn-info tooltip"
          @click="requestSeal"
          data-tip="请求封盘"
        >
          <Icon icon="mdi:pause" />
        </button>
        <button v-if="isSealed && sealRequesterId === roomPlayer.id" class="btn btn-circle btn-soft btn-primary tooltip"
          @click="unseal"
          data-tip="解除封盘"
        >
          <Icon icon="mdi:play" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PlayerRole, Room, RoomPlayer } from "tiaoom/client";
import { GameCore } from "@/core/game";
import { useOthello } from "./useOthello";
import { onMounted, ref, watch } from "vue";
import hotkeys from 'hotkeys-js';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const {
  isPlaying,
  currentPlayer,
  board,
  currentPlace,
  placePiece,
  requestDraw,
  requestLose,
  timer,
  timerStr,
  isSealed,
  sealRequesterId,
  requestSeal,
  unseal,
} = useOthello(props.game, props.roomPlayer);

onMounted(() => {
  updateDocumentTitle();
});

function updateDocumentTitle() {
  const blackCount = board.value.flat().filter(b => b === 1).length;
  const whiteCount = board.value.flat().filter(b => b === 2).length;
  if (blackCount + whiteCount > 0) {
    document.title = `⚫ ${blackCount} : ${whiteCount} ⚪`;
  }
}

watch(() => board.value, updateDocumentTitle, { deep: true });

const showControl = ref(false);
hotkeys('esc', () => {
  if (props.roomPlayer.role == PlayerRole.watcher) return;
  showControl.value = !showControl.value;
});

const emit = defineEmits<{
  (e: 'loaded'): void
}>()
onMounted(() => {
  emit("loaded");
})
</script>

<style scoped>
.piece {
  transition: background 0.5s, transform 0.5s;
}
.white-piece {
  background: white;
  color: black;
  transform: rotateY(0deg);
  border: 1px solid rgba(0, 0, 0, 0.2);
}
.black-piece {
  background: black;
  color: white;
  transform: rotateY(180deg);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.row .cell::after {
  content: "";
  display: block;
  width: 100%;
  height: 100%;
  border: 1px solid oklch(var(--bc) / 0.2);
  box-sizing: border-box;
  left: 0em;
  top: 0em;
  position: absolute;
  z-index: 0;
}
.cell:last-child::after {
  display: block;
}
.row:last-child .cell::after {
  display: block;
}
.cell {
  margin: -1px -1px 0 0;
}
.row .can-place::after {
  border-color: oklch(var(--su));
}
</style>
