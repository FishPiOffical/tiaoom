<template>
  <section
    class="flex flex-col items-center justify-center p-2 py-4"
    ref="containerRef"
  >
    <!-- 棋盘 -->
    <div
      class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto"
    >
      <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          @click="placePiece(rowIndex, colIndex)"
          class="relative w-[11vw] h-[11vw] md:w-8 md:h-8 flex items-center justify-center border border-base-content/10"
          :class="{
            'cursor-pointer group':
              currentPlayer?.id === roomPlayer.id && cell === 0,
            'cursor-not-allowed':
              currentPlayer?.id === roomPlayer.id && cell !== 0,
          }"
        >
          <span
            class="group-hover:inline hidden opacity-80 w-[9vw] h-[9vw] md:w-7 md:h-7 rounded-full transition-all duration-500 z-10"
            :class="[
              currentPlayer?.attributes?.color === 1
                ? 'black-piece border border-base-content/20 shadow-lg'
                : 'white-piece shadow-lg',
            ]"
          >
          </span>
          <span
            v-if="cell > 0"
            class="w-[9vw] h-[9vw] md:w-7 md:h-7 rounded-full transition-all duration-500 z-10"
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
            v-if="cell === 0 && (currentPlayer?.id === roomPlayer.id || roomPlayer.role !== 'player')"
            class="absolute w-2 h-2 rounded-full bg-base-content/30"
          ></div>
        </div>
      </div>
    </div>

    <!-- 当前回合 -->
    <div
      v-if="gameStatus === 'playing'"
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
    </div>
    <RoomControlsLite
      :game="game"
      :room-player="roomPlayer"
      :current-player="currentPlayer"
      :enable-draw-resign="true"
      @draw="requestDraw"
      @lose="requestLose"
    />
  </section>
</template>

<script setup lang="ts">
import { Room, RoomPlayer } from "tiaoom/client";
import { GameCore } from "@/core/game";
import { useOthello } from "./useOthello";
import { onMounted, watch } from "vue";

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const {
  gameStatus,
  currentPlayer,
  board,
  currentPlace,
  placePiece,
  requestDraw,
  requestLose,
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
