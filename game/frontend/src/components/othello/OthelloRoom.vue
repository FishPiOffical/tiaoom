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
              'cursor-pointer hover:bg-base-content/20': currentPlayer?.id === roomPlayer.id && cell === 0,
              'cursor-not-allowed': currentPlayer?.id === roomPlayer.id && cell !== 0
            }"
          >
            <span 
              v-if="cell > 0"
              class="w-[9vw] h-[9vw] md:w-7 md:h-7 rounded-full transition-all duration-500 z-10"
              :class="[
                cell === 1 ? 'black-piece border border-base-content/20 shadow-lg' : 'white-piece shadow-lg',
                currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error scale-105' : ''
              ]"
            />
            <div 
              v-if="cell === 0 && currentPlayer?.id === roomPlayer.id" 
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
            <span v-if="p.role === 'player'">[{{ getPlayerStatus(p) }}]</span>
            <span v-else>[围观中]</span>
            <span>{{ p.name }}</span>
          </li>
        </ul>
        
        <!-- 操作按钮 -->
        <RoomControls
          :game="game"
          :room-player="roomPlayer"
          :game-status="gameStatus"
          :is-all-ready="isAllReady"
          :is-room-full="isRoomFull"
          :current-player="currentPlayer"
          :enable-draw-resign="true"
          @draw="requestDraw"
          @lose="requestLose"
        />
        
        <hr class="border-base-content/20" />
        
      </section>
      <GameChat 
        :messages="roomMessages" 
        :room-player="roomPlayer" 
        @send="sendMessage"
      >
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
import { ref, computed } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { IMessage } from '..';
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const gameStatus = ref<'waiting' | 'playing'>('waiting')
const currentPlayer = ref<any>()
const board = ref(Array(8).fill(0).map(() => Array(8).fill(-1)))
const achivents = ref<Record<string, any>>({})
const currentPlace = ref<{ x: number; y: number } | null>(null)
const roomMessages = ref<IMessage[]>([])

function onRoomStart() {
  roomMessages.value = []
  gameStatus.value = 'playing'
  currentPlace.value = null
}

function onRoomEnd() {
  gameStatus.value = 'waiting'
  currentPlayer.value = null
}

function onPlayMessage(msg: IMessage) {
  roomMessages.value.unshift(msg)
}

useGameEvents(props.game, {
  'room.start': onRoomStart,
  'room.end': onRoomEnd,
  'player.message': onPlayMessage,
  'room.message': onPlayMessage,
  'player.command': onCommand,
  'room.command': onCommand,
})

function onCommand(cmd: any) {
  if (props.roomPlayer.room.attrs?.type !== 'othello') return
  
  switch (cmd.type) {
    case 'status':
      gameStatus.value = cmd.data.status
      currentPlayer.value = cmd.data.current
      roomMessages.value = cmd.data.messageHistory || [];
      board.value = cmd.data.board
      achivents.value = cmd.data.achivents || {}
      break
    case 'board':
      board.value = cmd.data
      break
    case 'request-draw':
      confirm(`玩家 ${cmd.data.player.name} 请求和棋。是否同意？`) && 
        props.game?.command(props.roomPlayer.room.id, { type: 'draw' })
      break
    case 'place-turn':
      currentPlayer.value = cmd.data.player
      gameStatus.value = 'playing'
      break
    case 'achivements':
      achivents.value = cmd.data
      break
    case 'place':
      const { x, y } = cmd.data
      currentPlace.value = { x, y }
      break
  }
}

function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting') return '准备好了'
  if (p.id === currentPlayer.value?.id) return '思考中'
  if (gameStatus.value === 'playing') return '等待中'
  return '准备好了'
}

function placePiece(row: number, col: number) {
  if (gameStatus.value !== 'playing') return
  if (currentPlayer.value.id !== props.roomPlayer.id) return
  if (board.value[row][col] !== 0) return
  props.game?.command(props.roomPlayer.room.id, { type: 'place', data: { x: row, y: col } })
  board.value[row][col] = currentPlayer.value.attributes?.color
}

function requestDraw() {
  if (gameStatus.value !== 'playing') return
  props.game?.command(props.roomPlayer.room.id, { type: 'request-draw' })
}

function requestLose() {
  if (gameStatus.value !== 'playing') return
  props.game?.command(props.roomPlayer.room.id, { type: 'request-lose' })
}

function sendMessage(text: string) {
  props.game?.command(props.roomPlayer.room.id, { type: 'say', data: text })
}

const isRoomFull = computed(() => {
  if (!props.roomPlayer) return true
  return props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= props.roomPlayer.room.size
})

const isAllReady = computed(() => {
  if (!props.roomPlayer) return false
  return props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= props.roomPlayer.room.minSize &&
    props.roomPlayer.room.players.every((p: any) => p.isReady || p.role === 'watcher')
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
    box-shadow: none;
    border: 1px solid rgba(0,0,0,0.2);
  }
  .black-piece {
    background: black;
    color: white;
    transform: rotateY(180deg);
    box-shadow: none;
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