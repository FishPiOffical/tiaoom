<template>
  <section class="flex flex-col items-center justify-center p-2 py-4" ref="containerRef">
    <!-- 棋盘 -->
    <div class="inline-block p-2 m-auto border rounded shadow-2xl bg-base-300 border-base-content/20">
      <!-- 顶部留白 -->
      <div class="flex">
        <div class="w-[4vw] md:w-6 h-[4vw] md:h-6"></div>
        <div v-for="col in 19" :key="col" class="w-[4vw] md:w-6 h-[4vw] md:h-6"></div>
        <div class="w-[4vw] md:w-6 h-[4vw] md:h-6"></div>
      </div>
      
      <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
        <!-- 左侧数字坐标 -->
        <div class="w-[4vw] md:w-6 h-[4vw] md:h-6 flex items-center justify-center text-base-content/30 text-xs md:text-xs">
          {{ 19 - rowIndex }}
        </div>
        
        <!-- 棋盘格子 -->
        <div 
          v-for="(cell, colIndex) in row" 
          :key="colIndex"
          :data-pos="`${rowIndex}-${colIndex}`"
          @click="placePiece(rowIndex, colIndex)" 
          class="relative w-[4vw] h-[4vw] md:w-6 md:h-6 flex items-center justify-center"
          :class="{ 'cursor-pointer': currentPlayer?.id === roomPlayer.id && cell === 0 }"
        >
          <!-- 棋盘网格线 -->
          <div class="absolute z-0 h-px -translate-y-1/2 bg-base-content/30 top-1/2"
            :class="[
              colIndex === 0 ? 'left-1/2 w-1/2' : (colIndex === row.length - 1 ? 'left-0 w-1/2' : 'left-0 w-full')
            ]"
          ></div>
          <div class="absolute z-0 w-px -translate-x-1/2 bg-base-content/30 left-1/2"
            :class="[
              rowIndex === 0 ? 'top-1/2 h-1/2' : (rowIndex === board.length - 1 ? 'top-0 h-1/2' : 'top-0 h-full')
            ]"
          ></div>
          <div v-if="[3, 9, 15].includes(rowIndex) && [3, 9, 15].includes(colIndex)" class="absolute w-1.5 h-1.5 bg-base-content/80 rounded-full z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          
          <!-- 棋子 -->
          <span 
            v-if="cell > 0"
            class="w-[3vw] md:w-5 h-[3vw] md:h-5 rounded-full z-10 relative transition-all duration-200"
            :class="[
              cell === 1 ? 'bg-black border border-white/20 shadow-lg' : 'bg-white border border-black/20 shadow-lg',
              currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error scale-90' : ''
            ]"
          />
        </div>
        
        <!-- 右侧留白 -->
        <div class="w-[4vw] md:w-6 h-[4vw] md:h-6"></div>
      </div>
      
      <!-- 底部字母坐标 -->
      <div class="flex">
        <div class="w-[4vw] md:w-6"></div>
        <div v-for="col in 19" :key="col" class="w-[4vw] md:w-6 h-[4vw] md:h-6 flex items-center justify-center text-base-content/30 text-xs md:text-xs">
          {{ String.fromCharCode(64 + col) }}
        </div>
        <div class="w-[4vw] md:w-6"></div>
      </div>
    </div>
    
    <!-- 当前回合 -->
    <div v-if="isPlaying" class="flex items-center justify-center gap-3 mt-2 -mb-2 text-sm">
      <div class="w-[1.4em] h-[1.4em] flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
        <span 
          class="w-full h-full rounded-full"
          :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
        />
      </div>
      <b class="text-base-content">{{ currentPlayer?.name }}</b>
    </div>

    <div 
    v-if="roomPlayer.room.status !== 'playing' || showControl" class="fixed z-100 bg-base-300/60 top-0 left-0 w-full h-full flex flex-col items-center justify-center">
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
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PlayerRole, Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useGobang } from './useGobang';
import { onMounted, ref } from 'vue';
import hotkeys from 'hotkeys-js';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  isPlaying,
  currentPlayer,
  board,
  currentPlace,
  placePiece,
  requestDraw,
  requestLose,
} = useGobang(props.game, props.roomPlayer)

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
