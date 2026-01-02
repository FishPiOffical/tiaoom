<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand" lite>
    <template #player-badge="{ player }">
      <div 
        class="w-4 h-4 rounded-full border-2 ml-2"
        :class="player.attrs?.color === 0 ? 'bg-success/10 border-success' : 'bg-error/10 border-error'"
        v-if="myPlayerIndex !== -1"
      ></div>
    </template>
    <div class="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
      <div 
        class="board relative bg-base-300 p-1 select-none shadow-xl rounded-xl transition-transform duration-500 w-full"
        :class="{ 'rotate-180': myPlayerIndex === 0 }"
      >
        <!-- Grid -->
        <div v-for="(row, y) in board" :key="y" class="flex gap-[0.5vw]">
          <div
            v-for="(cell, x) in row"
            :key="x"
            class="w-[11vw] h-[11vw] m-[0.5vw] rounded-md flex-none flex items-center justify-center relative cursor-pointer transition-all hover:brightness-95"
            :class="getCellClass(x, y)"
            @click="handleCellClick(x, y)"
          >
            <!-- Terrain Labels -->
            <span v-if="isDen(x, y)" class="text-[6vw] absolute pointer-events-none" :class="{ 'rotate-180': myPlayerIndex === 0 }">🏠</span>
            <span v-if="isTrap(x, y)" class="text-[6vw] absolute pointer-events-none" :class="{ 'rotate-180': myPlayerIndex === 0 }">🕸️</span>
            <span v-if="isRiver(x, y)" class="text-[6vw] absolute pointer-events-none animate-pulse" :class="{ 'rotate-180': myPlayerIndex === 0 }">🌊</span>
            
            <!-- Piece -->
            <div
              v-if="cell"
              class="w-[10vw] h-[10vw] rounded-full flex items-center justify-center text-[4vw] font-bold shadow-lg transition-transform border-2 z-10"
              :class="[
                getPieceClass(cell, x, y),
                isSelected(x, y) ? 'scale-110 ring-4 ring-warning ring-offset-2 ring-offset-base-100' : ''
              ]"
            >
              {{ getPieceName(cell.type) }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-4 text-lg font-bold bg-base-100/80 p-2 rounded shadow flex items-center justify-center gap-2">
        <span v-if="winner !== -1" :class="winner === myPlayerIndex ? 'text-success' : 'text-error'">
          {{ winner === myPlayerIndex ? '你赢了！' : '你输了！' }}
        </span>
        <template v-else>
          <div 
            class="w-4 h-4 rounded-full border-2"
            :class="getPlayerColor(turn) === 0 ? 'bg-success/10 border-success' : 'bg-error/10 border-error'"
          ></div>
          <span class="truncate max-w-[150px]">{{ getPlayerName(turn) }}</span>
          <span v-if="isMyTurn" class="badge badge-sm badge-success">你</span>
        </template>
      </div>
    </div>
  </GameView>
</template>

<script setup lang="ts">
import { RoomPlayer, Room } from "tiaoom/client";
import { GameCore } from "@/core/game";
import { useDoushouqi } from "./useDoushouqi";
import { ref } from "vue";

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const { board, turn, winner, players, move, onCommand, isMyTurn, myPlayerIndex } = useDoushouqi(props.game, props.roomPlayer);

const selected = ref<{x: number, y: number} | null>(null);

const PIECE_NAMES: Record<string, string> = {
  rat: '鼠', cat: '猫', dog: '狗', wolf: '狼',
  leopard: '豹', tiger: '虎', lion: '狮', elephant: '象'
};

function getPieceName(type: string) {
  return PIECE_NAMES[type] || type;
}

function isRiver(x: number, y: number) {
  return (y >= 3 && y <= 5) && ((x >= 1 && x <= 2) || (x >= 4 && x <= 5));
}

function isTrap(x: number, y: number) {
  return (x === 2 && y === 0) || (x === 4 && y === 0) || (x === 3 && y === 1) ||
         (x === 2 && y === 8) || (x === 4 && y === 8) || (x === 3 && y === 7);
}

function isDen(x: number, y: number) {
  return (x === 3 && y === 0) || (x === 3 && y === 8);
}

function getCellClass(x: number, y: number) {
  if (isRiver(x, y)) return 'bg-info/10 shadow-inner';
  if (isDen(x, y)) return 'bg-warning/10';
  if (isTrap(x, y)) return 'bg-secondary/10';
  return 'bg-base-100';
}

function getPieceClass(cell: any, x: number, y: number) {
  const highlight = isTrap(x, y) || isDen(x, y) || isRiver(x, y);
  const color = getPlayerColor(cell.player);
  if (color === 0) {
    return highlight ? 'bg-success text-success-content border-success rotate-180' : 'bg-success/10 text-success border-success rotate-180';
  } else {
    return highlight ? 'bg-error text-error-content border-error' : 'bg-error/10 text-error border-error';
  }
}

function getPlayerColor(index: number) {
  const id = players.value[index];
  const p = props.roomPlayer.room.players.find(p => p.id === id);
  return p?.attributes?.color ?? index;
}

function getPlayerName(index: number) {
  const id = players.value[index];
  if (!id) return '等待加入...';
  const p = props.roomPlayer.room.players.find(p => p.id === id);
  return p ? p.name : '未知玩家';
}

function isSelected(x: number, y: number) {
  return selected.value?.x === x && selected.value?.y === y;
}

function handleCellClick(x: number, y: number) {
  if (!isMyTurn.value) return;

  const piece = board.value[y] && board.value[y][x];
  
  if (selected.value) {
    if (selected.value.x === x && selected.value.y === y) {
      selected.value = null; // Deselect
    } else if (piece && piece.player === myPlayerIndex.value) {
      selected.value = { x, y }; // Change selection
    } else {
      // Try move
      move(selected.value, { x, y });
      selected.value = null;
    }
  } else {
    if (piece && piece.player === myPlayerIndex.value) {
      selected.value = { x, y };
    }
  }
}
</script>
