<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4">
      <!-- 棋盘 -->
      <div class="inline-block bg-surface-light border border-border p-2 rounded shadow-2xl m-auto">
        <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
          <div 
            v-for="(cell, colIndex) in row" 
            :key="colIndex" 
            @click="placePiece(rowIndex, colIndex)" 
            class="relative w-[10vw] h-[10vw] md:w-8 md:h-8 flex items-center justify-center border border-white/10"
            :class="{ 'cursor-pointer hover:bg-white/5': currentPlayer?.id === roomPlayer.id && cell === 0 }"
          >
            <span 
              v-if="cell > 0"
              class="w-[9vw] h-[9vw] md:w-7 md:h-7 rounded-full transition-all duration-500"
              :class="[
                cell === 1 ? 'black-piece border border-gray-700 shadow-lg' : 'white-piece shadow-lg',
                currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-red-500 scale-105' : ''
              ]"
            />
          </div>
        </div>
      </div>
      
      <!-- 当前回合 -->
      <div v-if="gameStatus === 'playing'" class="flex items-center justify-center gap-3 mt-4 text-lg">
        <div class="w-6 h-6 flex items-center justify-center bg-surface-light rounded-full border border-border">
          <span 
            class="w-5 h-5 rounded-full"
            :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-gray-700 shadow-md' : 'bg-white shadow-md'"
          />
        </div>
        <b class="text-primary">{{ currentPlayer?.name }}</b>
      </div>
    </section>
    
    <!-- 侧边栏 -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <section class="inline-flex flex-col gap-2">
        <!-- 成就表 -->
        <table v-if="Object.keys(achivents).length" class="w-full border-collapse border border-border text-sm">
          <thead>
            <tr class="bg-surface-light">
              <th class="border border-border p-2 text-secondary">玩家</th>
              <th class="border border-border p-2 text-secondary">胜</th>
              <th class="border border-border p-2 text-secondary">负</th>
              <th class="border border-border p-2 text-secondary">和</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(achivement, playerName) in achivents" :key="playerName">
              <td class="border border-border p-2">{{ playerName }}</td>
              <td class="border border-border p-2">{{ achivement.win }}</td>
              <td class="border border-border p-2">{{ achivement.lost }}</td>
              <td class="border border-border p-2">{{ achivement.draw }}</td>
            </tr>
          </tbody>
        </table>
        
        <hr class="border-border" />
        
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
        <div v-if="gameStatus === 'waiting' && roomPlayer.role === 'player'" class="group flex gap-2">
          <button 
            @click="game.leaveRoom(roomPlayer.room.id)"
            :disabled="roomPlayer.isReady"
          >
            离开
          </button>
          <button 
            @click="game.ready(roomPlayer.room.id, !roomPlayer.isReady)"
          >
            {{ roomPlayer.isReady ? '取消' : '准备' }}
          </button>
          <button 
            @click="game.startGame(roomPlayer.room.id)" 
            :disabled="!isAllReady"
          >
            开始游戏
          </button>
        </div>
        
        <div class="group flex gap-2">
          <button 
            v-if="roomPlayer.role === 'watcher'" 
            @click="game.leaveRoom(roomPlayer.room.id)"
            :disabled="roomPlayer.isReady"
          >
            离开
          </button>
          <button 
            v-if="roomPlayer.role === 'watcher' && !isRoomFull" 
            @click="game.joinRoom(roomPlayer.room.id)"
          >
            加入游戏
          </button>
          <button 
            v-if="gameStatus === 'playing' && roomPlayer.role === 'player'"
            @click="requestDraw"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            请求和棋
          </button>
          <button 
            v-if="gameStatus === 'playing' && roomPlayer.role === 'player'"
            @click="requestLose"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            认输
          </button>
        </div>
        
        <hr class="border-border" />
        
        <!-- 聊天 -->
        <div v-if="roomPlayer.role === 'player'" class="group flex gap-2">
          <input 
            v-model="msg" 
            type="text"
            @keyup.enter="sendMessage" 
            placeholder="随便聊聊" 
            class="flex-1"
          />
          <button @click="sendMessage">发送</button>
        </div>
      </section>      
      <section class="bg-surface-light/30 p-3 rounded h-48 overflow-auto border border-border/50 flex-1">
        <p v-for="(m, i) in roomMessages" :key="i" class="text-sm text-primary/90">{{ m }}</p>
      </section>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RoomPlayer, Room } from 'tiaoom/client';
import type { GameCore } from '@/core/game'

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const gameStatus = ref<'waiting' | 'playing'>('waiting')
const currentPlayer = ref<any>()
const board = ref(Array(8).fill(0).map(() => Array(8).fill(-1)))
const achivents = ref<Record<string, any>>({})
const currentPlace = ref<{ x: number; y: number } | null>(null)
const msg = ref('')
const roomMessages = ref<string[]>([])

// 初始化黑白棋起始位置
board.value[3][3] = 2
board.value[3][4] = 1
board.value[4][3] = 1
board.value[4][4] = 2

// 标记所有可落子的位置
board.value[2][4] = 0
board.value[4][2] = 0
board.value[2][3] = 0
board.value[3][2] = 0
board.value[4][5] = 0
board.value[5][4] = 0
board.value[5][3] = 0
board.value[3][5] = 0

props.game?.onRoomStart(() => {
  roomMessages.value = []
  gameStatus.value = 'playing'
  currentPlace.value = null
}).onRoomEnd(() => {
  gameStatus.value = 'waiting'
  currentPlayer.value = null
}).onCommand(onCommand).onMessage((msg: string) => {
  roomMessages.value.unshift(`${msg}`)
})

function onCommand(cmd: any) {
  if (props.roomPlayer.room.attrs?.type !== 'othello') return
  
  switch (cmd.type) {
    case 'status':
      gameStatus.value = cmd.data.status
      currentPlayer.value = cmd.data.current
      roomMessages.value = cmd.data.messageHistory || []
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

function sendMessage() {
  if (!msg.value.trim()) return
  props.game?.command(props.roomPlayer.room.id, { type: 'say', data: msg.value })
  msg.value = ''
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
    border: 1px solid #555;
  }
  .black-piece {
    background: black;
    color: white;
    transform: rotateY(180deg);
    box-shadow: none;
    border: 1px solid #555;
  }
  .row .cell::after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    border: 1px solid #aaa;
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
    border-color: #4CAF50;
  }
</style>