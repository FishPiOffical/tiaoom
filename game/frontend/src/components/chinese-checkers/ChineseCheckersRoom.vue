<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center p-4">
      <!-- Players Info -->
      <div class="w-full max-w-[600px] flex flex-wrap gap-4 justify-center mb-4">
        <div v-for="(p, i) in players" :key="p.id"
             class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all shadow-sm"
             :class="[
               {
                 'scale-110 ring-2 ring-primary ring-offset-2 z-10': turnIndex === i,
                 'opacity-60 grayscale': turnIndex !== i
               },
               getZoneData(p.color).border,
               turnIndex === i ? 'bg-base-100 text-base-content' : '',
               turnIndex !== i ? getZoneData(p.color).text : ''
             ]">
          <div class="w-3 h-3 rounded-full shadow-inner" :class="getZoneData(p.color).bg"></div>
          <span>{{ p.name }}</span>
          <span v-if="p.id === roomPlayer.id" class="badge badge-xs ml-1">我</span>
        </div>
      </div>

      <!-- Game Board -->
      <div class="relative w-full max-w-[600px] aspect-square select-none p-4">
        <svg viewBox="-140 -140 280 280" class="w-full h-full drop-shadow-2xl filter transition-transform duration-700 ease-in-out relative z-0" 
             :style="{ transform: `rotate(${boardRotation}deg)` }">
            <!-- Board Base -->
            <polygon :points="boardPolygon" class="fill-base-300 stroke-base-content/10 stroke-1" />

            <!-- Hint Lines (Optional) -->
            
            <!-- Holes -->
            <g v-for="h in hexes" :key="h.key">
                <circle :cx="h.x" :cy="h.y" r="4.8" 
                   class="transition-colors duration-200 stroke-base-content/50 stroke-[0.5] "
                   :class="[
                      // Interactive state (selectable or reachable)
                      isInteractive(h) ? 'fill-base-content/40 cursor-pointer hover:fill-primary/50' : '',
                      
                      // Zone background (if empty and not interactive)
                      !isInteractive(h) && !isReachable(h) && getHexZoneIndex(h.q, h.r, h.s) !== -1 ? 'fill-base-content/20' : '',

                      // Default empty background
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

        <!-- Victory Overlay -->
        <div v-if="winnerText" class="absolute inset-0 z-50 flex items-center justify-center bg-base-300/30 backdrop-blur-[1px] rounded-full">
             <div class="bg-base-100/90 text-primary shadow-xl px-8 py-4 rounded-xl border-2 border-primary/20 text-2xl font-black animate-bounce whitespace-nowrap">
                 {{ winnerText }}
             </div>
        </div>
      </div>

       <div class="h-8 flex items-center justify-center gap-2 relative z-100">
            <button v-if="isMyTurn && isMoving" @click="commitMove" class="btn btn-sm btn-primary">完成</button>
            <button v-if="isMyTurn && isMoving" @click="cancelMove" class="btn btn-sm btn-ghost">重置</button>
            <button v-if="isMyTurn && ((!isMoving && selected))" @click="resetSelection" class="btn btn-sm btn-ghost">取消选择</button>
       
            <!-- Replay Controls -->
            <div class="tooltip tooltip-right" data-tip="重播最后一步">
               <button @click="replayLastMove" class="btn btn-sm btn-circle btn-ghost" :disabled="!canReplay">
                   <Icon icon="mdi:replay" />
               </button>
            </div>
            <div class="dropdown dropdown-right hover:dropdown-open">
             <div tabindex="0" role="button" class="btn btn-sm btn-circle btn-ghost text-sm font-mono">
               {{ playbackSpeed }}x
             </div>
             <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-20 text-sm">
               <li><a @click="playbackSpeed = 0.1">0.1x</a></li>
               <li><a @click="playbackSpeed = 0.2">0.2x</a></li>
               <li><a @click="playbackSpeed = 0.5">0.5x</a></li>
               <li><a @click="playbackSpeed = 1.0">1.0x</a></li>
               <li><a @click="playbackSpeed = 2.0">2.0x</a></li>
             </ul>
            </div>
       </div>
    </div>

    <template #rules>
        <div class="space-y-2 text-sm opacity-80">
            <p>1. 目标：率先将所有棋子移动到对面的三角形区域。</p>
            <p>2. 平移：移动到相邻的一个空位。</p>
            <p>3. 跳跃：隔一个棋子跳到前方空位，且可连续跳跃。</p>
        </div>
    </template>

    <template #actions="{ isPlaying }">
        <section class="flex w-full gap-2">
            <button v-if="isPlaying" class="btn btn-sm flex-1" @click="resign">认输</button>
            <button v-if="isPlaying && players.length == 2" class="btn btn-sm flex-1" @click="offerDraw">求和</button>
        </section>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import { 
    hexes, getHexZoneIndex, getZoneData, useChineseChecker 
} from './useChineseChecker';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>();

const {
    board,
    players,
    turnIndex,
    selected,
    reachable,
    lastMoveFrom,
    lastMoveTo,
    isMoving,
    animatingPiece,
    winnerText,
    boardRotation,
    isMyTurn,
    pieceList,
    getPlayerColorCode,
    handleClick,
    commitMove,
    cancelMove,
    resetSelection,
    isInteractive,
    isReachable,
    onCommand,
    resign,
    offerDraw,
    playbackSpeed,
    replayLastMove,
    canReplay
} = useChineseChecker(props.game, props.roomPlayer);

const boardPolygon = "";
</script>
