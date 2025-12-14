<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4">
      <!-- 棋盘 -->
      <div class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto">
        <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
          <div 
            v-for="(cell, colIndex) in row" 
            :key="colIndex" 
            @click="placePiece(rowIndex, colIndex)" 
            class="relative w-[10vw] h-[10vw] md:w-8 md:h-8 flex items-center justify-center border border-base-content/10"
            :class="{ 
              'cursor-pointer group': currentPlayer?.id === roomPlayer.id && cell === 0,
              'cursor-not-allowed': currentPlayer?.id === roomPlayer.id && cell !== 0
            }"
          >
            <span 
              class="group-hover:inline hidden opacity-80 w-[9vw] h-[9vw] md:w-7 md:h-7 rounded-full transition-all duration-500 z-10" 
              :class="[currentPlayer?.attributes?.color === 1 ? 'black-piece border border-base-content/20 shadow-lg' : 'white-piece shadow-lg']">
            </span>
            <span 
              v-if="cell > 0"
              class="w-[9vw] h-[9vw] md:w-7 md:h-7 rounded-full transition-all duration-500 z-10"
              :class="[
                cell === 1 ? 'black-piece border border-base-content/20 shadow-lg' : 'white-piece shadow-lg',
                currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error scale-105' : ''
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
      <div v-if="gameStatus === 'playing'" class="flex items-center justify-center gap-3 mt-4 text-lg p-1">
        <div class="w-6 h-6 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
          <span 
            class="w-full h-full rounded-full"
            :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
          />
        </div>
        <b class="text-base-content">{{ currentPlayer?.name }}</b>
      </div>
    </section>
    
    <!-- 侧边栏 -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <section class="inline-flex flex-col gap-2">
        <!-- 成就表 -->
        <section class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100 max-h-50">
          <table v-if="Object.keys(achivents).length" class="table table-pin-rows table-pin-cols text-center">
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
        <ul class="space-y-1">
          <li 
            v-for="p in roomPlayer.room.players" 
            :key="p.id" 
            class="flex items-center gap-2 text-sm p-1 rounded hover:bg-surface/50"
            :class="{ 'text-gray-500': p.role === 'watcher' }"
          >
            <span v-if="p.role === 'player'" class="inline-flex gap-2 items-center">
              <span>[{{ getPlayerStatus(p) }}]</span>
              <template v-if="board.flat().filter(b => b > 0).length">
                <div class="w-4 h-4 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
                  <span 
                    class="w-full h-full rounded-full"
                    :class="p.attributes.color === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
                  />
                </div>
                <span>{{ board.flat().filter(b => b == p.attributes.color).length }}</span>
              </template>
            </span>
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
            <li>1. 双方轮流落子，落子时必须夹住对方棋子。</li>
            <li>2. 被夹住的对方棋子会翻转为己方颜色。</li>
            <li>3. 若无处可落子，则跳过回合。</li>
            <li>4. 棋盘填满或双方均无处落子时游戏结束，棋子多者获胜。</li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useOthello } from './useOthello';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  gameStatus,
  currentPlayer,
  board,
  currentPlace,
  achivents,
  placePiece,
  requestDraw,
  requestLose,
} = useOthello(props.game, props.roomPlayer)

function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (props.roomPlayer.room.status === 'waiting') return '准备好了'
  if (p.id === currentPlayer.value?.id) return '思考中'
  if (props.roomPlayer.room.status === 'playing') return '等待中'
  return '准备好了'
}

</script>
<style scoped>
  .piece {
    transition: background 0.5s, transform 0.5s;
  }
  .white-piece {
    background: white;
    color: black;
    transform: rotateY(0deg);
    border: 1px solid rgba(0,0,0,0.2);
  }
  .black-piece {
    background: black;
    color: white;
    transform: rotateY(180deg);
    border: 1px solid rgba(255,255,255,0.2);
  }
  .row .cell::after {
    content: '';
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