<template>
  <div class="flex flex-col items-center justify-center p-2 w-full h-full">
      <!-- Players Info (Simplified) -->
      <div class="w-full flex flex-wrap gap-2 justify-center mb-2">
        <div v-for="(p, i) in players" :key="p.id"
             class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border"
             :class="[
               {
                 'ring-1 ring-primary z-10': turnIndex === i,
                 'opacity-60 grayscale': turnIndex !== i
               },
               getZoneData(p.color).border,
               turnIndex === i ? 'bg-base-100 text-base-content' : '',
               turnIndex !== i ? getZoneData(p.color).text : ''
             ]">
          <div class="w-2 h-2 rounded-full" :class="getZoneData(p.color).bg"></div>
          <span>{{ p.name }}</span>
        </div>
      </div>

      <!-- Game Board -->
      <div class="relative w-full aspect-square select-none max-w-[300px]">
        <svg viewBox="-140 -140 280 280" class="w-full h-full drop-shadow filter transition-transform duration-700 ease-in-out" 
             :style="{ transform: `rotate(${boardRotation}deg)` }">
            <!-- Holes -->
            <g v-for="h in hexes" :key="h.key">
                <circle :cx="h.x" :cy="h.y" r="4.8" 
                   class="transition-colors duration-200 stroke-base-content/50 stroke-[0.5] "
                   :class="[
                      isInteractive(h) ? 'fill-base-content/40 cursor-pointer hover:fill-primary/50' : '',
                      !isInteractive(h) && !isReachable(h) && getHexZoneIndex(h.q, h.r, h.s) !== -1 ? 'fill-base-content/20' : '',
                      !isInteractive(h) && !isReachable(h) && getHexZoneIndex(h.q, h.r, h.s) === -1 ? 'fill-base-content/20' : '',
                      isReachable(h) ? 'cursor-pointer' : ''
                   ]"
                   @click="handleClick(h)" />
                
                <!-- Reachable Hint -->
                <circle v-if="isReachable(h)" :cx="h.x" :cy="h.y" r="2.5" 
                   class="fill-success/80 animate-pulse pointer-events-none" />
            </g>

            <!-- Selection Ring -->
             <circle v-if="selected" :cx="selected.x" :cy="selected.y" r="7" 
                    class="fill-none stroke-primary stroke-2 opacity-80 pointer-events-none" />

            <!-- Pieces -->
            <g v-for="piece in pieceList" :key="piece.key">
                 <circle :cx="piece.x" :cy="piece.y" r="4.5"
                    class="transition-all duration-300 shadow-sm"
                    :class="[
                        getZoneData(getPlayerColorCode(piece.pid)).fill,
                        {
                            'opacity-50': lastMoveFrom === piece.key,
                            'opacity-60': piece.pid !== players[turnIndex]?.id,
                            'stroke-2 stroke-base-100': true,
                            'cursor-pointer': isMyTurn && piece.pid === roomPlayer.id
                        }
                    ]"
                    style="filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.3));"
                    @click="handleClick(piece)"
                 />
                 <!-- Highlight last moved piece -->
                 <circle v-if="lastMoveTo === piece.key" :cx="piece.x" :cy="piece.y" r="4.5"
                    class="fill-base-content animate-ping opacity-30 pointer-events-none" />
            </g>

            <!-- Animating Piece -->
             <circle v-if="animatingPiece" :cx="animatingPiece.x" :cy="animatingPiece.y" r="4.8"
                class="transition-all duration-300 ease-in-out shadow-lg pointer-events-none"
                :class="[
                   getZoneData(getPlayerColorCode(animatingPiece.pid)).fill,
                   'stroke-2 stroke-base-100'
                ]"
                style="filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.4));"
             />
        </svg>

        <!-- Victory Overlay (Simplified) -->
        <div v-if="winnerText" class="absolute inset-0 z-50 flex items-center justify-center bg-base-300/30 backdrop-blur-[1px]">
             <div class="bg-base-100/90 text-primary shadow px-4 py-2 rounded-lg border border-primary/20 text-lg font-bold">
                 {{ winnerText }}
             </div>
        </div>
      </div>
      
       <!-- Actions for Lite Move Confirmation -->
       <div class="h-8 flex items-center justify-center gap-2 mt-2 sticky bottom-0 bg-base-100/80" v-if="isMyTurn && isMoving">
          <button @click="commitMove" class="btn btn-xs btn-primary">✔</button>
          <button @click="cancelMove" class="btn btn-xs btn-ghost">✘</button>
          <button @click="replayLastMove" class="btn btn-[16px] min-h-0 h-4 w-4 p-0 btn-circle btn-ghost text-[10px]">
              ↺
          </button>
       </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';
import { 
    hexes, getHexZoneIndex, getZoneData, useChineseChecker
} from './useChineseChecker';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>();

const {
    players,
    turnIndex,
    selected,
    lastMoveFrom,
    lastMoveTo,
    isMoving,
    animatingPiece,
    winnerText,
    boardRotation,
    isMyTurn,
    pieceList,
    isReachable,
    isInteractive,
    getPlayerColorCode,
    handleClick,
    commitMove,
    cancelMove,
    onCommand,
    replayLastMove,
    playbackSpeed
} = useChineseChecker(props.game, props.roomPlayer);

useGameEvents(props.game, {
  "player.command": onCommand,
  "room.command": onCommand,
});

onMounted(() => {
    // Request state sync if needed
    // props.game.command(props.roomPlayer.room.id, { type: 'get-state' }); 
});

</script>