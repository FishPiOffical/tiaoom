<template>
  <section class="flex flex-col items-center justify-center p-2 py-4" ref="containerRef">
    <!-- 棋盘 -->
    <div class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto">
      <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
        <div 
          v-for="(cell, colIndex) in row" 
          :key="colIndex"
          :data-pos="`${rowIndex}-${colIndex}`"
          @click="placePiece(rowIndex, colIndex)" 
          class="relative w-[4.7vw] h-[4.7vw] md:w-7 md:h-7 flex items-center justify-center"
          :class="{ 'cursor-pointer': currentPlayer?.id === roomPlayer.id && cell === 0 }"
        >
          <!-- 棋盘网格线 -->
          <div class="absolute bg-base-content/30 h-px top-1/2 -translate-y-1/2 z-0"
            :class="[
              colIndex === 0 ? 'left-1/2 w-1/2' : (colIndex === row.length - 1 ? 'left-0 w-1/2' : 'left-0 w-full')
            ]"
          ></div>
          <div class="absolute bg-base-content/30 w-px left-1/2 -translate-x-1/2 z-0"
            :class="[
              rowIndex === 0 ? 'top-1/2 h-1/2' : (rowIndex === board.length - 1 ? 'top-0 h-1/2' : 'top-0 h-full')
            ]"
          ></div>
          <div v-if="[3, 9, 15].includes(rowIndex) && [3, 9, 15].includes(colIndex)" class="absolute w-1.5 h-1.5 bg-base-content/80 rounded-full z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          
          <!-- 棋子 -->
          <span 
            v-if="cell > 0"
            class="w-[3vw] h-[3vw] md:w-6 md:h-6 rounded-full z-10 relative transition-all duration-200"
            :class="[
              cell === 1 ? 'bg-black border border-white/20 shadow-lg' : 'bg-white border border-black/20 shadow-lg',
              currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error scale-90' : ''
            ]"
          />
        </div>
      </div>
    </div>
    
    <!-- 当前回合 -->
    <div v-if="gameStatus === 'playing'" class="flex items-center justify-center gap-3 mt-2 -mb-2 text-sm">
      <div class="w-[1.4em] h-[1.4em] flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
        <span 
          class="w-full h-full rounded-full"
          :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
        />
      </div>
      <b class="text-base-content">{{ currentPlayer?.name }}</b>
    </div>

    <RoomControlsLite
      :game="game"
      :room-player="roomPlayer"
      :current-player="currentPlayer"
      :enable-draw-resign="true"
    />
  </section>
</template>

<script setup lang="ts">
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useGobang } from './useGobang';
import { onMounted, ref } from 'vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  gameStatus,
  currentPlayer,
  board,
  currentPlace,
  placePiece
} = useGobang(props.game, props.roomPlayer)

const containerRef = ref<HTMLElement>();
onMounted(() => {
  const rect = containerRef.value?.parentElement?.getBoundingClientRect();
  if (!rect) return;
  if (rect.height < window.innerHeight) {
    window.resizeTo(window.innerWidth, rect.height);
  }
})

</script>
