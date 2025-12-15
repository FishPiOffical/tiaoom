<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4">
      <!-- 棋盘 -->
      <div class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto">
        <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
          <div 
            v-for="(cell, colIndex) in row" 
            :key="colIndex"
            :data-pos="`${rowIndex}-${colIndex}`"
            @click="placePiece(rowIndex, colIndex)" 
            class="relative w-[6vw] h-[6vw] md:w-7 md:h-7 flex items-center justify-center"
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
              class="w-[4.5vw] h-[4.5vw] md:w-6 md:h-6 rounded-full z-10 relative transition-all duration-200"
              :class="[
                cell === 1 ? 'bg-black border border-white/20 shadow-lg' : 'bg-white border border-black/20 shadow-lg',
                currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error scale-90' : ''
              ]"
            />
          </div>
        </div>
      </div>
      
      <!-- 当前回合 -->
      <div v-if="gameStatus === 'playing'" class="flex items-center justify-center gap-3 mt-4 text-lg">
        <div class="w-5 h-5 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
          <span 
            class="w-4 h-4 rounded-full"
            :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
          />
        </div>
        <b class="text-base-content">{{ currentPlayer?.name }}</b>
      </div>
    </section>
    
    <!-- 侧边栏 -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <section class="inline-flex flex-col gap-2 max-h-1/2">
        <!-- 成就表 -->
        <section v-if="Object.keys(achivents).length" class="overflow-auto rounded-box border border-base-content/5 bg-base-100 max-h-50 min-h-30">
          <table class="table table-pin-rows table-pin-cols text-center">
            <thead>
              <tr>
                <th class="bg-base-300">玩家</th>
                <th class="bg-base-300">胜</th>
                <th class="bg-base-300">负</th>
                <th class="bg-base-300">和</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(achivement, playerName) in achivents" :key="playerName">
                <td class="">{{ playerName }}</td>
                <td class="">{{ achivement.win }}</td>
                <td class="">{{ achivement.lost }}</td>
                <td class="">{{ achivement.draw }}</td>
              </tr>
            </tbody>
          </table>
        </section>
        
        <hr v-if="Object.keys(achivents).length" class="border-base-content/20" />
        
        <!-- 玩家列表 -->
        <ul class="space-y-1 max-h-50 overflow-auto">
          <li 
            v-for="p in roomPlayer.room.players" 
            :key="p.id" 
            class="flex items-center gap-2 text-sm p-1 rounded hover:bg-surface/50"
            :class="{ 'text-gray-500': p.role === 'watcher' }"
          >
            <span v-if="p.role === 'player'">[{{ getPlayerStatus(p) }}]</span>
            <span v-else>[围观中]</span>
            <span>{{ p.name }}</span>
          </li>
        </ul>
        
        <!-- 操作按钮 -->
        <RoomControls
          :game="game"
          :room-player="roomPlayer"
          :current-player="currentPlayer"
          :enable-draw-resign="true"
          @draw="requestDraw"
          @lose="requestLose"
        />
        
        <hr class="border-base-content/20" />
        
      </section>
      
      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. 双方轮流在棋盘交叉点落子。</li>
            <li>2. 先在横、竖、斜方向连成5子者获胜。</li>
            <li>3. 若棋盘填满仍未分胜负，则为平局。</li>
            <li>4. 黑方（先手）实行禁手规则：
              <ul class="pl-4 mt-1 list-disc">
                <li>三三禁手：两个或两个以上的活三。</li>
                <li>四四禁手：两个或两个以上的冲四或活四。</li>
                <li>长连禁手：连成六个或六个以上。</li>
              </ul>
            </li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import type { RoomPlayer, Room } from 'tiaoom/client';
import type { GameCore } from '@/core/game'
import GameChat from '@/components/common/GameChat.vue'
import { useGobang } from './useGobang';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  achivents,
  gameStatus,
  currentPlayer,
  board,
  currentPlace,
  placePiece,
  requestDraw,
  requestLose,
} = useGobang(props.game, props.roomPlayer)


function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting') return '准备好了'
  if (p.id === currentPlayer.value?.id) return '思考中'
  if (gameStatus.value === 'playing') return '等待中'
  return '准备好了'
}

</script>
