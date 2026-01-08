<template>
  <section class="flex flex-col items-center justify-center p-2 py-4" ref="containerRef">
    <!-- 棋盘 -->
    <div class="relative inline-block bg-base-300 p-3 rounded-lg shadow-2xl m-auto select-none">
      
      <div v-if="isSealed" class="absolute inset-0 z-50 bg-base-100/50 backdrop-blur-sm flex items-center justify-center rounded">
        <div class="text-center">
          <div class="text-xl font-bold mb-2">已封盘</div>
          <div class="text-xs opacity-60">请等待请求者解除封盘</div>
          <button 
            v-if="sealRequesterId === roomPlayer.id"
            class="btn btn-sm btn-primary mt-2" 
            @click="unseal"
          >
            解除封盘
          </button>
        </div>
      </div>

      <div class="grid grid-cols-[auto_max-content_auto]">
        <!-- 上方坐标 -->
        <div></div>
        <div class="flex pl-[4px] mb-1">
          <div v-for="i in 8" :key="i" class="flex items-center justify-center w-[10vw] md:w-16 text-base-content/50 font-mono font-bold text-sm md:text-base">
            {{ String.fromCharCode(64 + i) }}
          </div>
        </div>
        <div></div>

        <!-- 左侧坐标 -->
        <div class="flex flex-col pt-[4px] mr-1">
          <div v-for="i in 8" :key="i" class="flex items-center justify-center h-[10vw] md:h-16 text-base-content/50 font-mono font-bold text-sm md:text-base">
            {{ 9 - i }}
          </div>
        </div>

        <!-- 棋盘 -->
        <div class="flex flex-col bg-base-200 rounded border-4 border-base-content/20 overflow-hidden relative">
          <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
            <div 
              v-for="(cell, colIndex) in row" 
              :key="colIndex" 
              @click="handleColumnClick(colIndex)"
              @mouseenter="hoverCol = colIndex"
              @mouseleave="hoverCol = -1"
              class="relative w-[10vw] h-[10vw] md:w-16 md:h-16 flex items-center justify-center border border-base-content/10"
              :class="{ 
                'cursor-pointer': isMyTurn && cell !== -1,
                'bg-base-content/5': hoverCol === colIndex && isMyTurn
              }"
            >
              <!-- 孔洞背景 -->
              <div class="w-[8vw] h-[8vw] md:w-14 md:h-14 rounded-full bg-base-content/10 shadow-inner"></div>

              <!-- 真实棋子 -->
              <transition name="drop">
                <span 
                  v-if="cell > 0 && !isSealed"
                  class="absolute w-[8vw] h-[8vw] md:w-14 md:h-14 rounded-full shadow-lg"
                  :class="[
                    cell === 1 ? 'bg-black border border-white/20' : 'bg-white border border-black/20',
                    currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error' : ''
                  ]"
                />
              </transition>

              <!-- 预览棋子 -->
              <span 
                v-if="cell === 0 && hoverCol === colIndex && isMyTurn"
                class="absolute w-[8vw] h-[8vw] md:w-14 md:h-14 rounded-full opacity-40"
                :class="currentPlayer?.attributes.color === 1 ? 'bg-black' : 'bg-white'"
              />
            </div>
          </div>
        </div>

        <!-- 右侧坐标 -->
        <div class="flex flex-col pt-[4px] ml-1">
          <div v-for="i in 8" :key="i" class="flex items-center justify-center h-[10vw] md:h-16 text-base-content/50 font-mono font-bold text-sm md:text-base">
            {{ 9 - i }}
          </div>
        </div>

        <!-- 下方坐标 -->
        <div></div>
        <div class="flex pl-[4px] mt-1">
          <div v-for="i in 8" :key="i" class="flex items-center justify-center w-[10vw] md:w-16 text-base-content/50 font-mono font-bold text-sm md:text-base">
            {{ String.fromCharCode(64 + i) }}
          </div>
        </div>
        <div></div>
      </div>
    </div>
    
    <!-- 当前回合 -->
    <div v-if="gameStatus === 'playing'" class="flex items-center justify-center gap-3 mt-2 -mb-2 text-sm">
      <div class="w-[1.4em] h-[1.4em] flex items-center justify-center bg-surface-light rounded-full border border-base-content/20">
        <span 
          class="w-full h-full rounded-full"
          :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-white/20' : 'bg-white border border-black/20'"
        />
      </div>
      <b class="text-base-content">{{ currentPlayer?.name }}</b>
      <span class="font-mono text-base-content/70 ml-2" v-if="timer > 0">{{ timerStr }}</span>
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
          :disabled="currentPlayer?.id !== roomPlayer.id"
          data-tip="认输"
        >
          <Icon icon="mdi:flag" />
        </button>
        <button class="btn btn-circle btn-soft btn-info tooltip" 
          @click="requestSeal"
          :disabled="currentPlayer?.id !== roomPlayer.id"
          data-tip="请求封盘"
        >
          <Icon icon="mdi:pause-circle" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PlayerRole, Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useConnect4 } from './useConnect4';
import { onMounted, ref } from 'vue';
import hotkeys from 'hotkeys-js';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  isPlaying,
  gameStatus,
  currentPlayer,
  board,
  currentPlace,
  hoverCol,
  isMyTurn,
  handleColumnClick,
  requestDraw,
  requestLose,
  requestSeal,
  unseal,
  timer,
  timerStr,
  isSealed,
  sealRequesterId,
} = useConnect4(props.game, props.roomPlayer)

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

<style scoped>
.drop-enter-active {
  animation: drop-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes drop-in {
  0% {
    transform: translateY(-600px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
