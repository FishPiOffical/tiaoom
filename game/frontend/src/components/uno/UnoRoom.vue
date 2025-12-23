<template>
  <div class="flex flex-col h-full bg-base-200">
    <!-- 游戏顶部信息栏 -->
    <header class="p-4 shadow-md bg-base-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h2 class="text-xl font-bold">UNO 游戏</h2>
          <div class="badge badge-primary" v-if="gameState">
            {{ Object.keys(gameState?.players || {}).length }} 玩家
          </div>
        </div>
        <div class="flex items-center gap-4">
          <!-- 恢复通知使用中央 transient -->
        </div>
      </div>
    </header>

    <!-- 游戏主区域 -->
    <main class="flex flex-col flex-1 gap-2 p-2 overflow-hidden md:flex-row md:p-4 md:gap-4">
      <!-- 左侧主视图 -->
      <div class="flex flex-col flex-1 md:h-full">
        <div v-if="gameStatus === 'waiting'" class="flex items-center justify-center flex-1">
          <div class="text-center">
            <h3 class="mb-4 text-2xl font-bold">等待玩家准备</h3>
            <div class="mb-6 text-lg">
              {{ (gameStore.roomPlayer?.room?.players?.filter(p => p.role === 'player') || []).length }} / {{ gameStore.roomPlayer?.room?.size }} 玩家
            </div>
            <div v-if="gameStore.roomPlayer?.role === 'watcher'" class="mt-4 text-sm text-gray-600">
              你正在围观这场游戏，等待游戏开始
            </div>
          </div>
        </div>

        <div v-else-if="gameStatus === 'ended' && gameState" class="flex flex-col items-center justify-center flex-1">
          <div class="text-center">
            <h2 class="mb-4 text-3xl font-bold">{{ gameState.winner === gameStore.player?.id ? '你赢了！' : '游戏结束' }}</h2>
            <p v-if="gameState.winner && gameState.winner !== gameStore.player?.id" class="mb-6 text-lg">{{ getPlayerName(gameState.winner) }} 获胜</p>
            <p class="mb-4 text-gray-600">等待玩家准备开始新游戏</p>
          </div>
        </div>

        <div v-else-if="gameStatus === 'playing' && gameState" class="flex flex-col flex-1">
          <!-- 游戏桌面 -->
          <div class="relative flex-1 p-2 rounded-lg md:p-6 bg-base-100">
            <!-- 按位置排列所有玩家（包括自己） -->
            <div class="absolute inset-0">
              <div 
                v-for="(playerInfo, index) in getPlayersByPosition" 
                :key="playerInfo.id"
                class="absolute p-2 md:p-3 rounded-lg bg-base-100 shadow-lg min-w-[70px] md:min-w-[100px] z-30"
                :class="{ 'ring-2 ring-primary ring-offset-2 z-40': gameState.currentPlayer === playerInfo.id }"
                :style="getPlayerPositionStyle(index, getPlayersByPosition.length)"
              >
                <div class="flex flex-col items-center gap-1 md:gap-2">
                  <div :class="['flex items-center gap-2 md:gap-3', playerAnim[playerInfo.id]?.type === 'play' ? 'animate-play' : '', playerAnim[playerInfo.id]?.type === 'draw' ? 'animate-draw' : '', playerAnim[playerInfo.id]?.type === 'skip' ? 'player-skipped' : '']">
                    <div class="flex items-center justify-center w-8 h-8 overflow-hidden text-sm font-bold border rounded-full md:w-10 md:h-10 bg-base-200 border-base-content/20">
                      <template v-if="getRoomPlayer(playerInfo.id)?.attributes?.avatar">
                        <img :src="getRoomPlayer(playerInfo.id)?.attributes?.avatar" alt="avatar" class="object-cover w-full h-full rounded-full" />
                      </template>
                      <template v-else>
                        <span>{{ getRoomPlayer(playerInfo.id)?.name?.substring(0,1).toUpperCase() }}</span>
                      </template>
                    </div>
                    <div v-if="playerAnim[playerInfo.id]?.type === 'skip'" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span class="text-2xl text-red-600 md:text-3xl animate-pulse">⛔</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-xs md:text-sm font-medium truncate max-w-[60px] md:max-w-20">{{ getPlayerDisplayName(playerInfo.id) }}</span>
                      <!-- 托管徽章 -->
                      <span v-if="gameState?.hosted && gameState.hosted[playerInfo.id]" class="ml-1 text-xs badge badge-error">托管</span>
                      <div v-if="gameState.currentPlayer === playerInfo.id" class="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 mb-1">
                    <!-- 只有围观玩家或者非当前玩家才显示倒计时，避免与底部的"你"重复 -->
                    <div v-if="gameState?.currentPlayer === playerInfo.id && currentTimer !== null && (gameStore.roomPlayer?.role === 'watcher' || playerInfo.id !== gameStore.player?.id)" class="text-xs font-bold animate-pulse" :class="currentTimer <= 5 ? 'text-red-500' : 'text-blue-500'">⏱ {{ currentTimer }}s</div>
                    <span class="badge badge-xs md:badge-sm">{{ playerInfo.hand?.length ?? 0 }} 张</span>
                  </div>
                  <div v-if="(playerInfo.hand?.length || 0) === 1" class="text-xs font-bold text-red-500">UNO!</div>
                </div>
              </div>
            </div>

            <!-- 左上角状态信息（方向 / 当前颜色 / 抽牌计数） -->
            <div v-if="gameState" class="absolute z-40 flex flex-wrap items-center gap-2 top-2 left-2 md:top-4 md:left-4 md:gap-3 max-w-60 md:max-w-80">
              <div class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg shadow-md md:gap-2 md:text-sm bg-base-200 md:px-3 md:py-2 backdrop-blur-sm">
                <div class="text-base md:text-lg">{{ gameState.direction === 1 ? '↻' : '↺' }}</div>
                <span class="hidden font-medium md:inline">{{ gameState.direction === 1 ? '顺时针' : '逆时针' }}</span>
              </div>

              <div class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg shadow-md md:gap-2 md:text-sm bg-base-200 md:px-3 md:py-2 backdrop-blur-sm">
                <span class="hidden font-medium md:inline">当前颜色:</span>
                <div class="w-4 h-4 border-2 border-gray-800 rounded md:w-5 md:h-5"
                  :class="{
                    'bg-red-500': gameState.color === 'red',
                    'bg-blue-500': gameState.color === 'blue',
                    'bg-green-500': gameState.color === 'green',
                    'bg-yellow-400': gameState.color === 'yellow'
                  }"></div>
              </div>


            </div>

            <!-- 底部中央：当前玩家（自己）显示块（仅普通玩家可见） -->
            <div v-if="gameStore.roomPlayer?.role === 'player'" class="absolute z-50 p-2 md:p-4 rounded-lg bg-base-100 border border-primary/20 shadow-lg min-w-[120px]" :class="{ 'ring-2 ring-primary ring-offset-2': gameState?.currentPlayer === gameStore.player?.id }" style="bottom: 5%; left: 50%; transform: translate(-50%, 50%)">
              <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-10 h-10 overflow-hidden text-sm font-bold border rounded-full bg-base-200 border-base-content/20">
                  <template v-if="getRoomPlayer(gameStore.player?.id || '')?.attributes?.avatar">
                    <img :src="getRoomPlayer(gameStore.player?.id || '')?.attributes?.avatar" alt="avatar" class="object-cover w-full h-full rounded-full" />
                  </template>
                  <template v-else>
                    <span>{{ getRoomPlayer(gameStore.player?.id || '')?.name?.substring(0,1).toUpperCase() }}</span>
                  </template>
                </div>
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">你</span>
                    <span v-if="gameState?.hosted && gameStore.player?.id && gameState.hosted[gameStore.player.id]" class="ml-1 text-xs badge badge-error">托管</span>
                    <div v-if="gameState?.currentPlayer === gameStore.player?.id" class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <div v-if="gameState?.currentPlayer === gameStore.player?.id && currentTimer !== null" class="text-sm font-bold" :class="currentTimer <= 5 ? 'text-red-500' : 'text-blue-500'">⏱ {{ currentTimer }}s</div>
                    <span class="badge badge-xs md:badge-sm">{{ (gameState?.players?.[gameStore.player?.id || '']?.length) || 0 }} 张</span>
                  </div>
                  <div v-if="(gameState?.players?.[gameStore.player?.id || '']?.length || 0) === 1" class="text-sm font-bold text-red-500 animate-pulse">UNO!</div>
                </div>
              </div>
            </div>

            <!-- 中央方向指示器（装饰性，置于弃牌/牌堆下方） -->
            <div v-if="gameState" class="absolute z-0 flex items-center justify-center w-48 h-48 pointer-events-none md:w-80 md:h-80 left-1/2" style="top: calc(20% + 0.75rem); transform: translateX(-50%);">
              <div class="relative w-full h-full">
                <div class="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out">
                  <div class="relative">
                    <div class="text-3xl text-blue-500 md:text-6xl opacity-30 animate-pulse">{{ gameState.direction === 1 ? '↻' : '↺' }}</div>
                  </div>
                </div>
                <div class="absolute inset-0 border border-blue-300 rounded-full opacity-10 md:border-2"></div>
                <div class="absolute border border-blue-200 rounded-full inset-2 md:inset-3 opacity-5"></div>
              </div>
            </div>

            <!-- 中央区域：弃牌与牌堆（下移以避开中央方向指示器） -->
            <div class="relative z-10 flex flex-col items-center gap-4 transform translate-y-16 md:gap-8 md:translate-y-24">
              <div class="text-center">
                <p class="mb-2 text-sm text-gray-600">弃牌堆</p>
                <div v-if="gameState.discardPile.length > 0" class="relative">
                  <UnoCard :card="gameState.discardPile[gameState.discardPile.length - 1]" />
                </div>
              </div>

              <div class="text-center">
                <p class="mb-2 text-sm text-gray-600">抽牌堆</p>
                <div class="relative flex items-center justify-center w-20 font-bold text-white bg-gray-800 rounded-lg h-28">
                  <span>{{ gameState.deck.length }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 自己的手牌区域 -->
          <div v-if="gameStore.roomPlayer?.role === 'player'" class="p-2 rounded-lg md:p-4 bg-base-100">
            <div class="flex items-center justify-between mb-2 md:mb-4">
              <span class="text-sm md:font-medium">我的手牌</span>
              <!-- <div class="flex items-center gap-2">
                <button v-if="gameState.players?.[gameStore.player?.id || '']?.length === 2" @click="callUno" class="btn btn-xs md:btn-sm btn-warning">UNO!</button>
              </div> -->
            </div>

            <div class="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4 min-h-20 md:min-h-[100px] max-h-44 md:max-h-40 overflow-y-auto">
              <UnoCard v-for="card in (gameState.players[gameStore.player?.id || ''] || [])" :key="card.id" :card="card" :playable="isCurrentPlayer && canPlayCard(card)" @play="playCard" @cant-play="showCantPlayNotification" />
            </div>

            <div class="flex flex-col gap-2 sm:flex-row">
              <button @click="drawCard" :disabled="!isCurrentPlayer" class="btn btn-sm md:btn-base btn-secondary">抽牌</button>
              <button 
                @click="challengeDraw4" 
                :disabled="!isCurrentPlayer || !canChallengeDraw4"
                class="btn btn-sm md:btn-base"
                :class="canChallengeDraw4 ? 'btn-warning' : 'btn-disabled'"
              >
                质疑+4
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="gameStatus === 'playing' && !gameState" class="flex items-center justify-center flex-1">
          <div class="text-center">
            <h3 class="mb-4 text-2xl font-bold">游戏加载中...</h3>
            <p class="mb-2 text-gray-600" v-if="gameStore.roomPlayer?.role === 'watcher'">正在获取游戏状态，请稍候...</p>
            <p class="mb-2 text-gray-600" v-else>正在从服务器恢复游戏数据</p>
            <div class="loading loading-spinner loading-lg"></div>
          </div>
        </div>
      </div>

      <!-- 右侧栏 -->
      <aside class="flex flex-col flex-none w-full border-t md:pl-4 md:border-t-0 md:border-l border-base-content/20 md:w-80 md:h-full">
        <section class="flex flex-col gap-2 mb-2 md:mb-4 max-h-1/2">
          <h3 class="mb-2 text-base font-bold md:text-lg">📊 计分板</h3>
          <div v-if="Object.keys(achievements).length" class="overflow-auto border rounded-box border-base-content/5 bg-base-100 max-h-48">
            <table class="table text-xs text-center table-pin-rows table-pin-cols md:text-sm">
              <thead>
                <tr>
                  <th class="text-xs bg-base-300">玩家</th>
                  <th class="text-xs bg-base-300">胜</th>
                  <th class="text-xs bg-base-300">负</th>
                  <th class="hidden text-xs bg-base-300 md:table-cell">胜率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(achievement, playerName) in achievements" :key="playerName">
                  <td class="font-medium truncate max-w-[60px]">{{ playerName }}</td>
                  <td class="text-green-600">{{ achievement.win }}</td>
                  <td class="text-red-600">{{ achievement.lost }}</td>
                  <td class="hidden md:table-cell">{{ ((achievement.win / (achievement.win + achievement.lost)) * 100 || 0).toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-4 text-center text-gray-500">暂无战绩</div>
        </section>

        <section class="flex flex-col gap-2 mb-4">
          <h3 class="text-lg font-bold">玩家列表</h3>
          <PlayerList :players="gameStore.roomPlayer?.room?.players || []">
            <template #default="{ player: p }">
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2 truncate">
                  <span v-if="p.role === 'player'">[{{ getPlayerStatus(p) }}]</span>
                  <span v-else class="text-base-content/60">[围观中]</span>
                  <span class="truncate max-w-40">{{ p.name }}</span>
                  <span v-if="gameState?.hosted && gameState.hosted[p.id]" class="ml-1 text-xs badge badge-error">托管</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="badge badge-xs md:badge-sm">{{ gameState?.players?.[p.id]?.length || 0 }} 张</span>
                </div>
              </div>
            </template>
          </PlayerList>
        </section>

        <section v-if="gameStore.roomPlayer" class="flex flex-col flex-1 min-h-0">
          <GameChat :messages="roomMessages" :room-player="gameStore.roomPlayer" @send="sendMessage">
            <template #rules>
              <ul class="space-y-2 text-sm">
                <li>1. 每位玩家轮流出牌，回合默认时长 15 秒；若玩家处于托管，回合时长缩短为 5 秒。</li>
                <li>2. 出牌规则：颜色 或 数值 相同的牌可以出；万能牌（Wild）可以在任意时刻出，并选择颜色。</li>
                <li>3. 功能牌说明：跳过（Skip）跳过下一位；反转（Reverse）改变出牌方向；+2/+4 会让下一位玩家抽牌并跳过回合。</li>
                <li>4. +4规则：只有在没有任何合法可出的牌时才能使用+4。目标玩家可以选择质疑+4的合法性。</li>
                <li>5. 质疑机制：质疑成功时，出牌者抽4张牌，质疑者继续出牌；质疑失败时，质疑者抽6张牌并被跳过。</li>
                <li>6. 当手牌只剩 1 张时须喊 "UNO"（可点击界面上的 UNO 按钮）。未喊将被惩罚抽牌。</li>
                <li>7. 抽牌：当无法出牌或选择抽牌时，执行抽牌动作；+2/+4惩罚会立即执行。</li>
                <li>8. 胜负：当一位玩家出完手牌时，本局结束，该玩家获胜。</li>
              </ul>
            </template>
          </GameChat>
        </section>
      </aside>
    </main>

    <!-- 通知 & 颜色选择 -->
    <div v-if="showNotification" class="fixed z-50 transform -translate-x-1/2 top-4 left-1/2 animate-pulse">
      <div class="px-6 py-3 rounded-lg shadow-lg" :class="{ 'bg-orange-500': forceDrawMessage, 'bg-red-500': cantPlayMessage, 'bg-blue-500': directionChangeMessage }">
        <p class="font-bold text-center text-white">{{ forceDrawMessage || cantPlayMessage || directionChangeMessage }}</p>
      </div>
    </div>

    <div v-if="showColorPicker" class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div class="w-full max-w-sm p-4 rounded-lg shadow-xl md:p-6 bg-base-100">
        <h3 class="mb-4 text-base font-bold text-center md:text-lg">选择颜色</h3>
        <div class="grid grid-cols-2 gap-2 md:gap-4">
          <button @click="selectColor('red')" class="p-3 text-sm font-bold text-white bg-red-500 rounded-lg md:p-4 hover:bg-red-600 md:text-base">红色</button>
          <button @click="selectColor('blue')" class="p-3 text-sm font-bold text-white bg-blue-500 rounded-lg md:p-4 hover:bg-blue-600 md:text-base">蓝色</button>
          <button @click="selectColor('green')" class="p-3 text-sm font-bold text-white bg-green-500 rounded-lg md:p-4 hover:bg-green-600 md:text-base">绿色</button>
          <button @click="selectColor('yellow')" class="p-3 text-sm font-bold text-white bg-yellow-400 rounded-lg md:p-4 hover:bg-yellow-500 md:text-base">黄色</button>
        </div>
        <button @click="cancelColorSelection" class="w-full mt-2 md:mt-4 btn btn-secondary btn-sm md:btn-base">取消</button>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
// 接收父组件可能传入的属性以避免 Vue 的非 props 属性警告
const props = defineProps<{ game?: any; roomPlayer?: any }>();
import { useGameStore } from '@/stores/game'
import { RoomStatus } from 'tiaoom/client'
import UnoCard from './UnoCard.vue'
import { useGameEvents } from '@/hook/useGameEvents'
import type { UnoCard as UnoCardType, UnoGameState } from '$/backend/src/games/uno'

const gameStore = useGameStore()

const gameState = ref<UnoGameState | null>(null)
// 游戏结果信息
const gameResult = ref<{ winner?: string } | null>(null)
// 单独维护一个前端用于显示的倒计时值，优先由后端的 timer_update 推送更新
const currentTimer = ref<number | null>(null)
const gameStatus = ref<'waiting' | 'playing' | 'ended'>('waiting')
const achievements = ref<Record<string, { win: number; lost: number }>>({})
const roomMessages = ref<Array<{ content: string, sender?: any }>>([])

// 颜色选择相关状态
const showColorPicker = ref(false)
const pendingCard = ref<UnoCardType | null>(null)

// 游戏提示状态
const cantPlayMessage = ref('')
const forceDrawMessage = ref('')
const directionChangeMessage = ref('')
const showNotification = ref(false)

// 移动历史（用于回放等功能）
const moveHistory = ref<Array<{player: string, action: any, timestamp: number}>>([])

// 游戏恢复通知（占位，暂不使用）

// 动画/视觉提示状态
const playerAnim = ref<Record<string, { type: 'play' | 'draw' | 'skip' | null, until: number }>>({})

// 用于检测方向变化
const previousDirection = ref<number | null>(null)
const previousCurrentPlayer = ref<string | null>(null)
// const lastSwitchAt = ref<number>(0)  // previously unused
const suppressTimerUntil = ref<number>(0)
const pendingSmallTimer = ref<number | null>(null)
const pendingSmallTimerTimeout = ref<number | null>(null)
const waitingForServerTimer = ref(false)
const waitingForServerTimerTimeout = ref<number | null>(null)

// 响应式状态
const isMobile = ref(false)

// 窗口大小变化监听
const handleResize = () => {
  isMobile.value = window.innerWidth < 768
}

const isCurrentPlayer = computed(() => {
  // 围观玩家不能是当前玩家
  if (gameStore.roomPlayer?.role === 'watcher') return false
  return gameState.value?.currentPlayer === gameStore.player?.id
})

// 计算玩家按照游戏顺序的排列（支持 2-6 人）
const getPlayersByPosition = computed(() => {
  if (!gameState.value) return []

  const allPlayerIds = Object.keys(gameState.value.players)
  const totalPlayers = allPlayerIds.length
  if (totalPlayers === 0) return []

  const asWatcher = gameStore.roomPlayer?.role === 'watcher'

  // 如果是围观玩家：显示所有玩家，顺序按游戏内的 players 键顺序
  if (asWatcher) {
    return allPlayerIds.map(id => ({ id, hand: gameState.value!.players[id] || [] }))
  }

  // 对于普通玩家，只显示其他玩家（不包含自己），位置固定不受方向影响
  const myId = String(gameStore.player?.id || '')
  const myIndex = allPlayerIds.indexOf(myId)
  if (myIndex === -1) {
    // 如果当前玩家 ID 不在列表中，回退为展示所有玩家
    return allPlayerIds.map(id => ({ id, hand: gameState.value!.players[id] || [] }))
  }

  const list: Array<{ id: string, hand: any[] }> = []
  const countOthers = totalPlayers - 1
  // 固定位置：始终按顺时针方向排列其他玩家，不受游戏当前方向影响
  for (let i = 1; i <= countOthers; i++) {
    const playerIndex = (myIndex + i) % totalPlayers
    const id = allPlayerIds[playerIndex]
    list.push({ id, hand: gameState.value!.players[id] || [] })
  }

  return list
})

// 监听房间状态变化，同步 gameStatus
watch(() => gameStore.roomPlayer?.room?.status, (newStatus) => {
  console.log('房间状态变化:', newStatus, '角色:', gameStore.roomPlayer?.role, '当前gameStatus:', gameStatus.value)
  
  // 围观玩家的特殊处理：如果房间状态是playing，直接设置为playing状态
  if (gameStore.roomPlayer?.role === 'watcher' && newStatus === 'playing') {
    console.log('围观玩家设置游戏状态为playing')
    gameStatus.value = 'playing'
    return
  }
  
  // 如果已经有游戏状态且游戏未结束，不要切换到waiting
  if (gameStore.roomPlayer?.role === 'watcher' && gameState.value && !gameState.value.winner) {
    console.log('围观玩家保持当前状态，不切换到waiting')
    return
  }
  
  if (newStatus === 'playing' && gameStatus.value !== 'ended') {
    gameStatus.value = 'playing'
  } else if (newStatus === 'waiting') {
    gameStatus.value = 'waiting'
  }
})

const getPlayerName = (playerId: string | number) => {
  const player = gameStore.roomPlayer?.room?.players.find(p => p.id === String(playerId))
  return player?.name || '未知玩家'
}

const getPlayerDisplayName = (playerId: string | number) => {
  // 如果是围观玩家，显示所有玩家的真实名称
  if (gameStore.roomPlayer?.role === 'watcher') {
    return getPlayerName(playerId)
  }
  
  // 如果是普通玩家，自己显示为"你"，其他显示真实名称
  if (String(playerId) === gameStore.player?.id) {
    return '你'
  }
  return getPlayerName(playerId)
}

// 根据 id 获取房间中的玩家对象（包含 attributes.avatar）
const getRoomPlayer = (playerId: string | number) => {
  return gameStore.roomPlayer?.room?.players.find((p: any) => p.id === String(playerId))
}

const canPlayCard = (card: UnoCardType) => {
  // 围观玩家不能出牌
  if (gameStore.roomPlayer?.role === 'watcher') return false
  if (!gameState.value) return false
  const topCard = (gameState.value.discardPile && gameState.value.discardPile.length > 0)
    ? gameState.value.discardPile[gameState.value.discardPile.length - 1]
    : null

  if (card.type === 'wild') return true
  if (card.color === gameState.value.color) return true
  if (topCard && card.value === topCard.value) return true
  return false
}

const showCantPlayNotification = () => {
  cantPlayMessage.value = '这张牌不能出！'
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 1500)
}

const showDirectionChangeNotification = (newDirection: number) => {
  directionChangeMessage.value = `方向改变！现在是${newDirection === 1 ? '顺时针' : '逆时针'}`
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 2000)
}

const showTransient = (msg: string, ms = 2000) => {
  directionChangeMessage.value = msg
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, ms)
}



const getPlayerStatus = (p: any) => {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting' || gameStatus.value === 'ended') return '已准备'
  if (p.id === gameState.value?.currentPlayer) return '出牌中'
  if (gameStatus.value === 'playing') return '等待中'
  return '已准备'
}

// 根据玩家位置计算样式（使用极坐标计算，支持 2-6 人）
const getPlayerPositionStyle = (index: number, totalPlayers: number) => {
  const isWatcher = gameStore.roomPlayer?.role === 'watcher'

  // 需要在渲染时知道这次布局实际放置的玩家数量：
  // - 围观者：放置 totalPlayers
  // - 普通玩家：放置 totalPlayers (已由 getPlayersByPosition 返回，只包含其他玩家)
  const placeCount = Math.max(1, totalPlayers)

  // 角度范围：围观者使用完整环形（360°），普通玩家使用上半环（180°）
  const fullCircle = isWatcher
  const startDeg = fullCircle ? -90 : -180 // -90 表示从正上方开始，中点向右展开
  const spanDeg = fullCircle ? 360 : 180

  // 在移动端稍微收缩半径
  const radius = isMobile.value ? 30 : 36 // 百分比

  // 计算角度（将玩家均匀分布在 spanDeg 上）
  const step = spanDeg / placeCount
  // offset 使分布居中：将起始角度左移半个 step
  const angleDeg = startDeg + step * (index + 0.5)
  const rad = angleDeg * (Math.PI / 180)

  const cx = 50
  const cy = 50
  const x = cx + radius * Math.cos(rad)
  const y = cy + radius * Math.sin(rad)

  return {
    top: `${y}%`,
    left: `${x}%`,
    transform: 'translate(-50%, -50%)'
  }
}



const playCard = (card: UnoCardType) => {
  if (!isCurrentPlayer.value) return

  if (card.type === 'wild') {
    // 显示颜色选择器
    pendingCard.value = card
    showColorPicker.value = true
  } else {
    gameStore.game?.command(gameStore.roomPlayer?.room?.id || '', { 
      type: 'uno:play_card', 
      data: { cardId: card.id } 
    })
  }
}

const selectColor = (color: 'red' | 'blue' | 'green' | 'yellow') => {
  if (pendingCard.value) {
    gameStore.game?.command(gameStore.roomPlayer?.room?.id || '', { 
      type: 'uno:play_card', 
      data: { cardId: pendingCard.value.id, chosenColor: color } 
    })
  }
  
  // 重置状态
  pendingCard.value = null
  showColorPicker.value = false
}

const cancelColorSelection = () => {
  pendingCard.value = null
  showColorPicker.value = false
}

const drawCard = () => {
  if (!isCurrentPlayer.value) return
  gameStore.game?.command(gameStore.roomPlayer?.room?.id || '', { type: 'uno:draw_card', data: {} })
}

const callUno = () => {
  gameStore.game?.command(gameStore.roomPlayer?.room?.id || '', { type: 'uno:call', data: {} })
}

const canChallengeDraw4 = computed(() => {
  if (!isCurrentPlayer.value || !gameState.value) return false
  
  // 检查顶部牌是否为+4
  const topCard = gameState.value.discardPile[gameState.value.discardPile.length - 1]
  if (!topCard || topCard.value !== 'wild_draw4') return false
  
  // 检查+4是否已经被处理过（新增的检查）
  if (gameState.value.wildDraw4Processed) return false
  
  // 检查最近的移动历史，确保+4是上家刚出的
  if (moveHistory.value.length === 0) return false
  
  const lastMove = moveHistory.value[moveHistory.value.length - 1]
  if (lastMove.action.type !== 'play_card') return false
  
  // 检查最后出牌的玩家是否不是当前玩家
  const currentPlayerId = gameStore.roomPlayer?.id
  if (lastMove.player === currentPlayerId) return false
  
  // 确保当前玩家确实是下家（轮到当前玩家出牌）
  if (gameState.value.currentPlayer !== currentPlayerId) return false
  
  return true
})

const challengeDraw4 = () => {
  if (!isCurrentPlayer.value || !canChallengeDraw4.value) return
  gameStore.game?.command(gameStore.roomPlayer?.room?.id || '', { type: 'uno:challenge', data: {} })
}

const sendMessage = (message: string) => {
  gameStore.game?.say(message, gameStore.roomPlayer?.room?.id || '')
}

// (已内联请求逻辑，避免未使用函数导致的编译警告)





// 位置提示已移除（换向后描述不准确）

const onRoomStart = () => {
  // 房间开始事件，设置状态为playing
  // 不清除gameState，让它通过game:state命令自然更新
  gameStatus.value = 'playing'
}

const onRoomEnd = () => {
  // 房间结束事件，重置为等待状态
  // 注意：不清除游戏状态，因为游戏可能仍在进行中用于查看结果
  gameStatus.value = 'waiting'
  // 只有在确实需要开始新游戏时才清除状态
}

const onCommand = (command: any) => {
  switch (command.type) {
    case 'game:state':
      console.log('收到game:state命令:', Date.now(), command.data)
      // 检测方向变化 - 仅在有历史状态时才显示通知
      if (previousDirection.value !== null && gameState.value && command.data.direction !== previousDirection.value) {
        showDirectionChangeNotification(command.data.direction)
      }
      previousDirection.value = command.data.direction

      gameState.value = command.data
      
      // 如果命令数据中包含 moveHistory，则更新它
      if (command.data.moveHistory) {
        moveHistory.value = command.data.moveHistory
      }
      
      // 检测玩家切换 - 如果切换了玩家，重新初始化倒计时显示
      const playerSwitched = previousCurrentPlayer.value && command.data.currentPlayer !== previousCurrentPlayer.value
      if (playerSwitched) {
        // 玩家切换时，初始化为完整回合时长，避免显示小值
        const timeoutMs = (typeof command.data.turnTimeout === 'number') ? command.data.turnTimeout : 15000
        const fullSeconds = Math.max(1, Math.round(timeoutMs / 1000))
        console.log('玩家切换，设置完整倒计时:', fullSeconds)
        // 如果该玩家被托管，则直接从5开始（后端也会设置 turnTimeout 为 5000），并立即短促跳到4以避免闪烁
        // 更稳健的托管判定：优先使用 hosted 标志；若无，则根据服务端的 turnTimeout 值判断（托管会使用 5000ms）
        const isHosted = !!(command.data.hosted && command.data.currentPlayer && command.data.hosted[command.data.currentPlayer])
        // 直接写死默认值：托管玩家 5s，正常玩家强制为 15s（避免被后端可能残留的 5s 覆盖）
        if (isHosted) {
          currentTimer.value = 5
        } else {
          currentTimer.value = 15
        }
        // 等待服务端的 timer_update 覆盖显示（避免客户端自行计算产生闪烁）
        waitingForServerTimer.value = true
        if (waitingForServerTimerTimeout.value) {
          clearTimeout(waitingForServerTimerTimeout.value as number)
          waitingForServerTimerTimeout.value = null
        }
        waitingForServerTimerTimeout.value = window.setTimeout(() => {
          waitingForServerTimer.value = false
          waitingForServerTimerTimeout.value = null
        }, 2500)
      } else if (typeof command.data.turnTimeLeft !== 'undefined') {
        // 同一玩家回合，直接使用服务端提供的 turnTimeLeft
        const serverVal = Number(command.data.turnTimeLeft) || 0
        currentTimer.value = Math.max(0, serverVal)
      }
      
      // 更新前一个玩家记录
      previousCurrentPlayer.value = command.data.currentPlayer

      // 根据游戏状态设置正确的状态
      if (command.data.winner) {
        gameStatus.value = 'ended'
      } else {
        gameStatus.value = 'playing'
      }
      break
    case 'game:over':
      // 保存游戏结果
      gameResult.value = { winner: command.data.winner }
      gameStatus.value = 'ended'
      
      // 清除托管标记显示
      if (gameState.value && gameState.value.hosted) {
        gameState.value.hosted = {}
      }
      
      // 同步房间状态为 waiting，这样 RoomControls 会显示等待/准备按钮（由房间状态驱动）
      if (gameStore.roomPlayer && gameStore.roomPlayer.room) {
        try {
          // 使用 RoomStatus 枚举以匹配类型定义
          gameStore.roomPlayer.room.status = RoomStatus.waiting as any
        } catch (e) {
          // 某些情况下对象可能是只读，忽略错误
        }
      }
      // 不立即清理游戏状态，保留它以显示游戏结果
      // gameState.value = null
      break
    case 'game:timer_update':
      // 后端每秒发送剩余时间（秒）。当计时器从隐藏变为可见（currentTimer 为 null）时，
      // 直接显示完整回合时长（默认为 15s 或使用服务端 turnTimeout），避免短暂显示 1s 的闪烁。
      console.log('收到game:timer_update命令:', Date.now(), command.data)
      // 如果我们正在等待服务端的第一条 timer_update，则接受其更新并清除等待标志；
      // 否则按原逻辑处理（包括抑制小值等）。
      if (waitingForServerTimer.value) {
        // 当服务端更新到达，取消等待并继续处理（下方会将 turnTimeLeft 应用到 currentTimer）
        if (waitingForServerTimerTimeout.value) {
          clearTimeout(waitingForServerTimerTimeout.value as number)
          waitingForServerTimerTimeout.value = null
        }
        waitingForServerTimer.value = false
      }
      // 如果在抑制窗口内，通常忽略短小的 timer_update，但如果服务端推送的值 >1s 则允许通过，
      // 以避免错过例如 14s 的合法更新。
      if (suppressTimerUntil.value && Date.now() < suppressTimerUntil.value) {
        const tVal = command.data && typeof command.data.turnTimeLeft !== 'undefined' ? Number(command.data.turnTimeLeft) || 0 : null
        if (tVal === null || tVal <= 1) {
          console.log('忽略 timer_update（抑制窗口 & 小值）', Date.now() - (suppressTimerUntil.value - 1200), 'ms since switch', 't=', tVal)
          return
        }
        console.log('抑制窗口内收到有效 timer_update，允许更新 t=', tVal)
        // fallthrough to normal handling
      }
      // 如果尚未收到 game:state（没有权威 gameState），优先把计时器显示为整轮时长，
      // 避免早期的 server push（如 3/2/1）覆盖显示。
      if (!gameState.value) {
        const timeoutMs = (command.data && typeof command.data.turnTimeout === 'number')
          ? command.data.turnTimeout
          : 15000
        const secs = Math.max(1, Math.round(timeoutMs / 1000))
        console.log('timer_update (no gameState) -> 显示整轮秒数', secs)
        currentTimer.value = secs
        break
      }

      // 如果当前没有初始值（隐藏状态），先将其设置为完整回合时长
      if (currentTimer.value === null) {
        const timeoutMs = (gameState.value && typeof gameState.value.turnTimeout === 'number')
          ? gameState.value.turnTimeout
          : (command.data && typeof command.data.turnTimeout === 'number')
            ? command.data.turnTimeout
            : 15000
        const secs = Math.max(1, Math.round(timeoutMs / 1000))
        console.log('timer visible -> 初始显示秒数', secs, 'previous:', currentTimer.value)
        currentTimer.value = secs
        if (gameState.value) gameState.value.turnTimeLeft = secs
        // 如果服务端也推送了当前剩余时间，避免被非常小的值立刻覆盖，使用 Math.max
        if (command.data && typeof command.data.turnTimeLeft !== 'undefined') {
          const t = Number(command.data.turnTimeLeft) || 0
          const chosen = Math.max(secs, t)
          console.log('timer_update 提供 turnTimeLeft', t, '-> 取 max:', chosen)
          currentTimer.value = chosen
          if (gameState.value) gameState.value.turnTimeLeft = chosen
          break
        }
        // 继续执行下面的计算逻辑以尝试用权威的 startTime+timeout 更新（如果可用）
      }

      // 优先使用服务器推送的 turnTimeLeft（当存在时），作为 UI 的权威来源；
      // 当不存在时，回退到基于 startTime+turnTimeout 的计算。
      if (command.data && typeof command.data.turnTimeLeft !== 'undefined') {
        const t = Number(command.data.turnTimeLeft) || 0
        currentTimer.value = t
        if (gameState.value) gameState.value.turnTimeLeft = t
      } else {
        let computed: number | null = null
        if (gameState.value && typeof gameState.value.turnStartTime === 'number' && typeof gameState.value.turnTimeout === 'number') {
          const remainMs = gameState.value.turnStartTime + gameState.value.turnTimeout - Date.now()
          computed = Math.max(0, Math.ceil(remainMs / 1000))
        }
        if (computed !== null) {
          currentTimer.value = computed
          if (gameState.value) gameState.value.turnTimeLeft = computed
        }
      }
      break
    case 'uno:called':
      // 可以在这里添加叫UNO的提示
      break
    case 'achievements':
      achievements.value = command.data
      break
    case 'message_history':
      roomMessages.value = command.data || []
      break
    case 'game:error':
      console.error('游戏错误:', command.data)
      break
    case 'players_status_update':
      // 更新房间玩家状态
      if (gameStore.roomPlayer?.room && command.data.players) {
        gameStore.roomPlayer.room.players = command.data.players
      }
      break
    case 'status':
      // 处理房间状态响应
      if (command.data && gameStore.roomPlayer?.room) {
        console.log('收到status命令:', command.data.status, '角色:', gameStore.roomPlayer.role)
        gameStore.roomPlayer.room.status = command.data.status
        
        // 围观玩家的特殊处理：如果房间状态是playing，就设置为playing
        if (command.data.status === 'playing') {
          console.log('房间状态为playing，设置游戏状态为playing')
          gameStatus.value = 'playing'
        } else {
          gameStatus.value = command.data.status === 'playing' ? 'playing' : 'waiting'
        }
      }
      break
    /* duplicate timer_update handler removed - handled above */
    case 'game:full_restore':
      // 完整恢复游戏状态（包括历史等）
      if (command.data) {
        console.log('收到game:full_restore命令:', command.data)
        gameState.value = command.data.gameState
        
        // 如果命令数据中包含 moveHistory，则更新它
        if (command.data.moveHistory) {
          moveHistory.value = command.data.moveHistory
        }
        
        achievements.value = command.data.achievements
        roomMessages.value = command.data.messageHistory || []
        moveHistory.value = command.data.moveHistory || []
        // 根据游戏状态设置正确的状态
        if (command.data.gameState) {
          gameStatus.value = command.data.gameState.winner ? 'ended' : 'playing'
        } else {
          gameStatus.value = 'waiting'
        }
        
        // 显示恢复成功通知（使用中央浮动的 transient 通知）
        showTransient('游戏数据已成功恢复', 3000)
      }
      break
  }
}

const onPlayMessage = (message: any) => {
  if (!message || !message.content) return;
  if (!roomMessages.value) {
    roomMessages.value = [];
  }
  // 最新消息在前面（unshift）
  roomMessages.value.unshift(message)
  // 解析并触发动画
  try { triggerPlayerAnimByMessage(message) } catch (e) { /* ignore */ }
  // 限制消息数量
  if (roomMessages.value.length > 100) {
    roomMessages.value = roomMessages.value.slice(0, 100)
  }
}

// 解析聊天消息以触发动画（例如：出牌、抓牌、被跳过）
const triggerPlayerAnimByMessage = (message: { content: string, sender?: any }) => {
  const text = message.content || ''
  // 出牌: "X 出了 Y"
  const playMatch = text.match(/(.+) 出了 /)
  if (playMatch) {
    const name = playMatch[1]
    const p = gameStore.roomPlayer?.room?.players.find((pp: any) => pp.name === name)
    if (p) {
      playerAnim.value[p.id] = { type: 'play', until: Date.now() + 800 }
      setTimeout(() => { if (playerAnim.value[p.id]?.type === 'play') playerAnim.value[p.id] = { type: null, until: 0 } }, 800)
    }
  }

  // 抽牌: "X 抽了一张牌" 或 "X 强制抽了 N 张牌"
  const drawMatch = text.match(/(.+) 抽了|(.+) 抽了一张|(.+) 强制抽了/)
  if (drawMatch) {
    const name = (drawMatch[1] || drawMatch[2] || drawMatch[3])?.trim()
    const p = gameStore.roomPlayer?.room?.players.find((pp: any) => pp.name === name)
    if (p) {
      playerAnim.value[p.id] = { type: 'draw', until: Date.now() + 800 }
      setTimeout(() => { if (playerAnim.value[p.id]?.type === 'draw') playerAnim.value[p.id] = { type: null, until: 0 } }, 800)
    }
  }

  // 被跳过: "X 被跳过了！"
  const skipMatch = text.match(/(.+) 被跳过了/)
  if (skipMatch) {
    const name = skipMatch[1]
    const p = gameStore.roomPlayer?.room?.players.find((pp: any) => pp.name === name)
    if (p) {
      playerAnim.value[p.id] = { type: 'skip', until: Date.now() + 1200 }
      setTimeout(() => { if (playerAnim.value[p.id]?.type === 'skip') playerAnim.value[p.id] = { type: null, until: 0 } }, 1200)
    }
  }
}

onMounted(() => {
  handleResize() // 初始化
  window.addEventListener('resize', handleResize)
  
  // 使用 useGameEvents 监听房间事件
  if (gameStore.game && gameStore.roomPlayer) {
    console.log('设置游戏事件监听，roomPlayer:', gameStore.roomPlayer)
    console.log('game对象:', gameStore.game)
    useGameEvents(gameStore.game as any, {
      'room.start': onRoomStart,
      'room.end': onRoomEnd,
      'player.message': onPlayMessage,
      'room.message': onPlayMessage,
      'player.command': onCommand,
      'room.command': onCommand,
    } as any)

    // 请求完整的状态信息，用于刷新时恢复
    const roomId = gameStore.roomPlayer.room.id
    
    // 请求房间状态（重要：围观玩家需要通过这个获取正确的房间状态）
    gameStore.game.command(roomId, { type: 'status', data: {} })
    
    // 请求游戏状态
    gameStore.game.command(roomId, { type: 'game:state' })
    
    // 请求完整恢复数据（包含历史记录等）
    gameStore.game.command(roomId, { type: 'game:full_restore' })
    
    // 请求成就表
    gameStore.game.command(roomId, { type: 'achievements' })
    
    // 请求消息历史
    gameStore.game.command(roomId, { type: 'message_history' })
    
    // 设置初始游戏状态
    gameStatus.value = gameStore.roomPlayer.room.status === 'playing' ? 'playing' : 'waiting'
    
    // 围观玩家的特殊处理：捕获局部引用以避免在闭包中出现可空类型的窄化失效
    if (gameStore.roomPlayer?.role === 'watcher') {
      const rp = gameStore.roomPlayer
      const g = gameStore.game
      const rid = rp?.room?.id
      console.log('围观玩家初始化，当前房间状态:', rp?.room?.status)
      console.log('gameStore.game是否存在:', !!g)
      console.log('roomId:', rid)

      // 等待一小段时间确保socket连接稳定后再请求
      setTimeout(() => {
        console.log('围观玩家开始请求游戏状态')
        console.log('检查gameStore.game:', g)

        // 请求所有必要的状态信息
        console.log('围观玩家发送状态请求，roomId:', rid)
        if (g && rid) {
          g.command(rid, { type: 'status', data: {} })
          g.command(rid, { type: 'game:state', data: {} })
          g.command(rid, { type: 'game:full_restore', data: {} })
        } else {
          console.error('gameStore.game或roomId无效，无法发送命令')
        }

        // 如果房间状态已经是playing，立即设置状态
        if (rp?.room?.status === 'playing') {
          console.log('围观玩家房间状态为playing，设置游戏状态为playing')
          gameStatus.value = 'playing'
        }

        // 简单的重试机制
        setTimeout(() => {
          if (!gameState.value && rp?.room?.status === 'playing' && g && rid) {
            console.log('围观玩家首次未获取到游戏状态，重新请求')
            g.command(rid, { type: 'status', data: {} })
            g.command(rid, { type: 'game:state', data: {} })
            g.command(rid, { type: 'game:full_restore', data: {} })
          }
        }, 1000)

        setTimeout(() => {
          if (!gameState.value && rp?.room?.status === 'playing') {
            console.log('围观玩家多次尝试仍无法获取游戏状态，保持playing状态但显示加载提示')
            gameStatus.value = 'playing'
          }
        }, 3000)
      }, 100)
    }
  }
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('resize', handleResize)
  // 清理可能存在的延迟计时器
  if (pendingSmallTimerTimeout.value) {
    clearTimeout(pendingSmallTimerTimeout.value as any)
    pendingSmallTimerTimeout.value = null
    pendingSmallTimer.value = null
  }
})
</script>

<style scoped>
/* 出牌动画 - 轻微放大并向上移动 */
.animate-play {
  animation: playAnim 700ms ease-out;
}
@keyframes playAnim {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.08); }
  100% { transform: translateY(0) scale(1); }
}

/* 抓牌动画 - 轻微抖动 */
.animate-draw {
  animation: drawAnim 700ms ease-out;
}
@keyframes drawAnim {
  0% { transform: translateY(0); }
  25% { transform: translateY(-6px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-3px); }
  100% { transform: translateY(0); }
}

/* 被跳过效果：半透明 + 红色外发光 */
.player-skipped {
  opacity: 0.7;
  box-shadow: 0 0 12px rgba(220,38,38,0.85);
  transform-origin: center;
  animation: skippedShake 900ms ease-in-out;
}

@keyframes skippedShake {
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-4px) rotate(-1deg); }
  50% { transform: translateY(0) rotate(1deg); }
  75% { transform: translateY(-2px) rotate(-0.5deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

/* 强化的被禁止出牌样式（使头像灰化并降低可见性） */
.player-skipped .rounded-full,
.player-skipped img {
  filter: grayscale(80%);
  opacity: 0.6;
  transition: filter 200ms ease, opacity 200ms ease;
}

/* 覆盖图标位置样式（中心大图标） */
.player-skipped-overlay {
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>