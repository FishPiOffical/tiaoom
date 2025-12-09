<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-hidden p-4">
      <!-- 棋盘 -->
      <div class="relative inline-block bg-base-300 p-3 rounded-lg shadow-2xl m-auto select-none">
        <div class="flex flex-col bg-base-200 rounded border-4 border-base-content/20 overflow-hidden relative">
          <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
            <div 
              v-for="(cell, colIndex) in row" 
              :key="colIndex" 
              @click="handleColumnClick(colIndex)"
              @mouseenter="hoverCol = colIndex"
              @mouseleave="hoverCol = -1"
              class="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center border border-base-content/10"
              :class="{ 
                'cursor-pointer': isMyTurn && cell !== -1,
                'bg-base-content/5': hoverCol === colIndex && isMyTurn
              }"
            >
              <!-- 孔洞背景 -->
              <div class="w-10 h-10 md:w-14 md:h-14 rounded-full bg-base-content/10 shadow-inner"></div>

              <!-- 真实棋子 -->
              <transition name="drop">
                <span 
                  v-if="cell > 0"
                  class="absolute w-10 h-10 md:w-14 md:h-14 rounded-full shadow-lg"
                  :class="[
                    cell === 1 ? 'bg-neutral text-neutral-content border border-base-content/20' : 'bg-base-100 border border-base-content/20',
                    currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-primary' : ''
                  ]"
                />
              </transition>

              <!-- 预览棋子 -->
              <span 
                v-if="cell === 0 && hoverCol === colIndex && isMyTurn"
                class="absolute w-10 h-10 md:w-14 md:h-14 rounded-full opacity-40"
                :class="currentPlayer?.attributes.color === 1 ? 'bg-neutral' : 'bg-base-100'"
              />
            </div>
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
        
        <hr v-if="Object.keys(achivents).length" class="border-border" />
        
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
          <button class="btn" 
            @click="game?.leaveRoom(roomPlayer.room.id)"
            :disabled="roomPlayer.isReady"
          >
            离开
          </button>
          <button class="btn" 
            @click="game?.ready(roomPlayer.room.id, !roomPlayer.isReady)"
          >
            {{ roomPlayer.isReady ? '取消' : '准备' }}
          </button>
          <button class="btn btn-primary" 
            @click="game?.startGame(roomPlayer.room.id)" 
            :disabled="!isAllReady"
          >
            开始游戏
          </button>
        </div>
        
        <div class="group flex gap-2">
          <button class="btn" 
            v-if="roomPlayer.role === 'watcher'" 
            @click="game?.leaveRoom(roomPlayer.room.id)"
            :disabled="roomPlayer.isReady"
          >
            离开
          </button>
          <button class="btn" 
            v-if="roomPlayer.role === 'watcher' && !isRoomFull" 
            @click="game?.joinRoom(roomPlayer.room.id)"
          >
            加入游戏
          </button>
          <button class="btn" 
            v-if="gameStatus === 'playing' && roomPlayer.role === 'player'"
            @click="requestDraw"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            请求和棋
          </button>
          <button class="btn" 
            v-if="gameStatus === 'playing' && roomPlayer.role === 'player'"
            @click="requestLose"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            认输
          </button>
        </div>
        
        <hr class="border-border" />
        
        <!-- 聊天 -->
        <div v-if="roomPlayer.role === 'player'" class="join">
          <input 
            v-model="msg" 
            type="text"
            @keyup.enter="sendMessage" 
            placeholder="随便聊聊" 
            class="flex-1 input join-item"
          />
          <button class="btn join-item" @click="sendMessage">发送</button>
        </div>
      </section>
      
      <section class="bg-base-300/30 p-3 rounded h-48 overflow-auto border border-base-content/20 flex-1">
        <p v-for="(m, i) in roomMessages" :key="i" class="text-sm text-primary/90">{{ m }}</p>
      </section>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RoomPlayer, Room, Player } from 'tiaoom/client';
import type { GameCore } from '@/core/game'

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore | null
}>()

const gameStatus = ref<'waiting' | 'playing'>('waiting')
const currentPlayer = ref<any>()
const board = ref(Array(8).fill(0).map(() => Array(8).fill(-1)))
const achivents = ref<Record<string, any>>({})
const currentPlace = ref<{ x: number; y: number } | null>(null)
const msg = ref('')
const roomMessages = ref<string[]>([])
const hoverCol = ref<number>(-1)

const isMyTurn = computed(() => 
  gameStatus.value === 'playing' && 
  currentPlayer.value?.id === props.roomPlayer.id
)

// 初始化最底行为可落子位置
board.value[board.value.length - 1] = board.value[board.value.length - 1].map(() => 0)

props.game?.onRoomStart(() => {
  roomMessages.value = []
  gameStatus.value = 'playing'
  currentPlace.value = null
}).onRoomEnd(() => {
  gameStatus.value = 'waiting'
  currentPlayer.value = null
}).onCommand(onCommand).onPlayMessage((msg: { content: string, sender?: Player }) => {
  roomMessages.value.unshift(`[${msg.sender?.name || '系统'}]: ${msg.content}`)
})

function onCommand(cmd: any) {
  if (props.roomPlayer.room.attrs?.type !== 'connect4') return
  
  switch (cmd.type) {
    case 'status':
      gameStatus.value = cmd.data.status
      currentPlayer.value = cmd.data.current
      roomMessages.value = (cmd.data.messageHistory || []).map((m: any) => `[${m.sender?.name || '系统'}]: ${m.message}`)
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

function handleColumnClick(col: number) {
  if (!isMyTurn.value) return
  // 找到该列值为 0 的行 (可落子位置)
  const row = board.value.findIndex(r => r[col] === 0)
  if (row !== -1) {
    placePiece(row, col)
  }
}

function placePiece(row: number, col: number) {
  if (gameStatus.value !== 'playing') return
  if (currentPlayer.value?.id !== props.roomPlayer.id) return
  if (board.value[row][col] !== 0) return
  props.game?.command(props.roomPlayer.room.id, { type: 'place', data: { x: row, y: col } })
  // 本地乐观更新，等待服务器确认
  // board.value[row][col] = currentPlayer.value.attributes?.color
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
.drop-enter-active {
  animation: drop-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes drop-in {
  0% {
    transform: translateY(-600px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
