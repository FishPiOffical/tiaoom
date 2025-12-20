<template>
  <div class="flex flex-col h-full bg-base-200">
    <!-- 游戏顶部信息栏 -->
    <header class="p-4 shadow-md bg-base-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h2 class="text-xl font-bold">斗地主</h2>
          <div class="badge badge-primary" v-if="gameState && (gameStatus === 'playing' || gameStatus === 'calling' || gameStatus === 'grabbing' || gameStatus === 'counter-grabbing')">
            {{ Object.keys(gameState.players || {}).length }} 玩家
          </div>
          <div v-if="gameState?.landlord && (gameStatus === 'playing' || gameStatus === 'calling' || gameStatus === 'grabbing' || gameStatus === 'counter-grabbing')" class="badge badge-warning">
            地主: {{ getPlayerName(gameState.landlord) }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div v-if="gameState?.bombCount && (gameStatus === 'playing' || gameStatus === 'calling' || gameStatus === 'grabbing' || gameStatus === 'counter-grabbing')" class="badge badge-error">
            炸弹 x{{ gameState.bombCount }}
          </div>
        </div>
      </div>
    </header>

    <!-- 游戏主区域 -->
    <!-- 小窗模式允许垂直滚动，大窗模式保持原布局 -->
    <main class="flex flex-col flex-1 gap-2 p-2 overflow-y-auto md:overflow-hidden md:flex-row md:p-4 md:gap-4">
      <!-- 左侧主视图 -->
      <div class="flex flex-col flex-1 min-h-0 md:h-full">
        <!-- 等待状态 -->
        <div v-if="gameStatus === 'waiting'" class="flex items-center justify-center flex-1">
          <div class="text-center">
            <h3 class="mb-4 text-2xl font-bold">等待玩家准备</h3>
            <div class="mb-6 text-lg">
              {{ gameStore.roomPlayer?.room?.players?.length || 0 }} / 3 玩家
            </div>
          </div>
        </div>

        <!-- 游戏结束状态 -->
        <div v-else-if="gameStatus === 'ended' && gameState" class="flex flex-col items-center justify-center flex-1">
          <div class="text-center">
            <h2 class="mb-4 text-3xl font-bold">
              {{ isWinner ? '你赢了！' : '游戏结束' }}
            </h2>
            <p class="mb-4 text-lg">
              {{ gameState.winnerRole === 'landlord' ? '地主' : '农民' }} 获胜
            </p>
            <p class="mb-6 text-gray-600">等待玩家准备开始新游戏</p>
          </div>
        </div>

        <!-- 游戏进行中 -->
        <div v-else-if="(gameStatus === 'playing' || gameStatus === 'calling' || gameStatus === 'grabbing' || gameStatus === 'counter-grabbing') && gameState" class="flex flex-col flex-1 min-h-0">
          <!-- 游戏桌面 -->
          <div class="relative p-2 md:p-4 rounded-lg bg-base-100 md:flex-1 max-h-[50vh] md:max-h-none overflow-y-auto md:overflow-visible">
            <!-- 其他玩家区域 -->
            <div class="flex justify-between mb-2 md:mb-4 gap-2">
              <div v-for="(playerId, index) in otherPlayers" :key="playerId"
                   class="flex flex-col items-center p-1 md:p-3 rounded-lg bg-base-200 flex-1 min-w-0"
                   :class="{ 'ring-2 ring-primary': isPlayerCurrentTurn(playerId) }">
                <div class="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                  <div class="w-6 h-6 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-base-300 font-bold text-xs md:text-base">
                    {{ getPlayerName(playerId).substring(0, 1).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-medium text-xs md:text-base truncate max-w-[60px] md:max-w-none">{{ getPlayerName(playerId) }}</div>
                    <div class="flex items-center gap-1 flex-wrap">
                      <span v-if="gameState.landlord === playerId" class="badge badge-warning badge-xs">地主</span>
                      <span v-else-if="gameState.landlord" class="badge badge-info badge-xs">农民</span>
                      <span class="badge badge-xs md:badge-sm">{{ gameState.players[playerId]?.length || 0 }} 张</span>
                    </div>
                  </div>
                </div>
                <!-- 倒计时 -->
                <div v-if="isPlayerCurrentTurn(playerId) && currentTimer !== null"
                     class="text-sm font-bold"
                     :class="currentTimer <= 5 ? 'text-red-500' : 'text-blue-500'">
                  ⏱ {{ currentTimer }}s
                </div>
              </div>
            </div>

            <!-- 中央区域：上一手牌/底牌 -->
            <div class="flex flex-col items-center justify-center flex-1 min-h-32">
              <!-- 叫地主阶段显示底牌（翻开后） -->
              <div v-if="gameState.phase === 'calling'" class="text-center">
                <p class="mb-2 text-lg font-bold">叫地主阶段</p>
                <p class="text-gray-600">等待玩家叫地主...</p>
              </div>

              <!-- 抢地主阶段 -->
              <div v-if="gameState.phase === 'grabbing'" class="text-center">
                <p class="mb-2 text-lg font-bold">抢地主阶段</p>
                <p class="text-gray-600">{{ getPlayerName(gameState.caller || '') }} 叫了地主，等待其他玩家抢地主...</p>
              </div>

              <!-- 反抢地主阶段 -->
              <div v-if="gameState.phase === 'counter-grabbing'" class="text-center">
                <p class="mb-2 text-lg font-bold">反抢地主阶段</p>
                <p class="text-gray-600">{{ getPlayerName(gameState.lastGrabber || '') }} 抢了地主，等待 {{ getPlayerName(gameState.caller || '') }} 是否反抢...</p>
              </div>

              <!-- 地主确定后显示底牌 -->
              <div v-if="gameState.landlord && gameState.landlordCards.length > 0" class="mb-4">
                <p class="mb-2 text-sm text-center text-gray-500">底牌</p>
                <div class="flex gap-1 justify-center">
                  <DoudizhuCard v-for="card in gameState.landlordCards" :key="card.id" :card="card" :small="true" />
                </div>
              </div>

              <!-- 上一手牌 -->
              <div v-if="gameState.lastPlay" class="mt-4">
                <p class="mb-2 text-sm text-center text-gray-500">
                  {{ getPlayerName(gameState.lastPlayer || '') }} 出的牌
                </p>
                <div class="flex flex-wrap gap-1 justify-center">
                  <DoudizhuCard v-for="card in gameState.lastPlay.cards" :key="card.id" :card="card" />
                </div>
              </div>

              <!-- 不出提示 -->
              <div v-if="gameState.passCount > 0 && !gameState.lastPlay" class="text-center text-gray-500">
                等待出牌...
              </div>
            </div>

            <!-- 当前玩家信息（底部）- 小窗模式使用普通布局，大窗模式使用绝对定位 -->
            <div v-if="gameStore.roomPlayer?.role === 'player'"
                 class="mt-2 mx-auto p-2 md:p-4 rounded-lg bg-base-200 shadow-lg md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 md:mt-0"
                 :class="{ 'ring-2 ring-primary': isCurrentPlayer }">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 flex items-center justify-center rounded-full bg-base-300 font-bold">
                  {{ (gameStore.player?.player?.name || gameStore.player?.nickname)?.substring(0, 1).toUpperCase() }}
                </div>
                <div>
                  <div class="font-medium">你</div>
                  <div class="flex items-center gap-1">
                    <span v-if="gameState.landlord === gameStore.player?.id" class="badge badge-warning badge-xs">地主</span>
                    <span v-else-if="gameState.landlord" class="badge badge-info badge-xs">农民</span>
                    <span class="badge badge-sm">{{ myHand.length }} 张</span>
                  </div>
                </div>
                <div v-if="isCurrentPlayer && currentTimer !== null"
                     class="text-lg font-bold ml-4"
                     :class="currentTimer <= 5 ? 'text-red-500' : 'text-blue-500'">
                  ⏱ {{ currentTimer }}s
                </div>
              </div>
            </div>
          </div>

          <!-- 自己的手牌区域 -->
          <div v-if="gameStore.roomPlayer?.role === 'player'" class="p-2 md:p-4 rounded-lg bg-base-100 mt-2 flex-shrink-0">
            <!-- 叫地主阶段 -->
            <div v-if="gameState.phase === 'calling' && gameState.currentBidder === gameStore.player?.id" class="mb-4">
              <div class="flex gap-2 justify-center">
                <button @click="callLandlord(true)" class="btn btn-warning">
                  叫地主
                </button>
                <button @click="callLandlord(false)" class="btn btn-secondary">
                  不叫
                </button>
              </div>
            </div>

            <!-- 抢地主阶段（原叫地主者不能抢） -->
            <div v-if="gameState.phase === 'grabbing' && gameState.currentBidder === gameStore.player?.id && gameState.caller !== gameStore.player?.id" class="mb-4">
              <div class="flex gap-2 justify-center">
                <button @click="callLandlord(true)" class="btn btn-warning">
                  抢地主
                </button>
                <button @click="callLandlord(false)" class="btn btn-secondary">
                  不抢
                </button>
              </div>
            </div>

            <!-- 反抢地主阶段（只有原叫地主者可以反抢） -->
            <div v-if="gameState.phase === 'counter-grabbing' && gameState.currentBidder === gameStore.player?.id && gameState.caller === gameStore.player?.id" class="mb-4">
              <div class="flex gap-2 justify-center">
                <button @click="callLandlord(true)" class="btn btn-error">
                  反抢
                </button>
                <button @click="callLandlord(false)" class="btn btn-secondary">
                  不反抢
                </button>
              </div>
            </div>

            <!-- 出牌阶段 -->
            <div v-if="gameState.phase === 'playing'" class="mb-4">
              <div class="flex gap-2 justify-center">
                <button @click="playSelectedCards" :disabled="!canPlay" class="btn btn-primary">
                  出牌 ({{ selectedCards.length }})
                </button>
                <button @click="passPlay" :disabled="!canPass" class="btn btn-secondary">
                  不出
                </button>
                <button @click="clearSelection" class="btn btn-ghost">清空选择</button>
              </div>
            </div>

            <!-- 手牌显示 -->
            <!-- 小窗模式水平滚动，大窗模式换行显示 -->
            <div class="flex gap-1 pb-2 overflow-x-auto md:flex-wrap md:justify-center md:overflow-x-visible md:overflow-y-auto min-h-24 md:max-h-48 scrollbar-thin">
              <DoudizhuCard
                v-for="card in myHand"
                :key="card.id"
                :card="card"
                :selected="selectedCards.includes(card.id)"
                :selectable="gameState.phase === 'playing' && isCurrentPlayer"
                class="flex-shrink-0"
                @click="toggleCardSelection(card.id)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧栏 -->
      <aside class="flex flex-col flex-none w-full overflow-y-auto border-t md:pl-4 md:border-t-0 md:border-l border-base-content/20 md:w-80">
        <!-- 计分板 -->
        <section class="mb-4">
          <h3 class="mb-2 text-lg font-bold">📊 计分板</h3>
          <div v-if="Object.keys(achievements).length" class="overflow-x-auto border rounded-box border-base-content/5 bg-base-100 max-h-48">
            <table class="table text-sm text-center table-pin-rows">
              <thead>
                <tr>
                  <th class="bg-base-300">玩家</th>
                  <th class="bg-base-300">胜</th>
                  <th class="bg-base-300">负</th>
                  <th class="bg-base-300">胜率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(achievement, playerName) in achievements" :key="playerName">
                  <td class="font-medium truncate max-w-[80px]">{{ playerName }}</td>
                  <td class="text-green-600">{{ achievement.win }}</td>
                  <td class="text-red-600">{{ achievement.lost }}</td>
                  <td>{{ ((achievement.win / (achievement.win + achievement.lost)) * 100 || 0).toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-4 text-center text-gray-500">暂无战绩</div>
        </section>

        <!-- 玩家列表 -->
        <section class="mb-4">
          <h3 class="mb-2 text-lg font-bold">玩家列表</h3>
          <PlayerList :players="gameStore.roomPlayer?.room?.players || []">
            <template #default="{ player: p }">
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2 truncate">
                  <span v-if="p.role === 'player'">[{{ getPlayerStatus(p) }}]</span>
                  <span v-else class="text-base-content/60">[围观中]</span>
                  <!-- 只在游戏进行中显示身份标签 -->
                  <template v-if="gameStatus === 'playing' || gameStatus === 'calling' || gameStatus === 'grabbing' || gameStatus === 'counter-grabbing'">
                    <span v-if="gameState?.landlord === p.id" class="badge badge-warning badge-xs">地主</span>
                    <span v-else-if="gameState?.landlord && gameState?.players?.[p.id]" class="badge badge-info badge-xs">农民</span>
                  </template>
                  <span class="truncate max-w-[100px]">{{ p.name }}</span>
                </div>
                <span class="badge badge-sm" v-if="gameStatus === 'playing' || gameStatus === 'calling' || gameStatus === 'grabbing' || gameStatus === 'counter-grabbing'">{{ gameState?.players?.[p.id]?.length || 0 }} 张</span>
              </div>
            </template>
          </PlayerList>

          <div v-if="gameStore.roomPlayer && gameStore.game" class="mt-4">
            <RoomControls
              :game="gameStore.game as any"
              :room-player="gameStore.roomPlayer"
              :game-status="gameStatus"
              :is-all-ready="isAllReady"
              :is-room-full="isRoomFull"
              :enable-draw-resign="false"
            />
          </div>
        </section>

        <!-- 聊天区域 -->
        <section v-if="gameStore.roomPlayer" class="flex flex-col flex-1 min-h-0">
          <GameChat :messages="roomMessages" :room-player="gameStore.roomPlayer" @send="sendMessage">
            <template #rules>
              <ul class="space-y-2 text-sm">
                <li>1. 三人游戏，一人为地主，两人为农民</li>
                <li>2. 地主先出牌，按逆时针顺序出牌</li>
                <li>3. 必须出比上家大的牌，或选择不出</li>
                <li>4. 两人连续不出，则最后出牌者重新出牌</li>
                <li>5. 先出完牌的一方获胜</li>
                <li>6. 炸弹和王炸可以压任何牌</li>
              </ul>
            </template>
          </GameChat>
        </section>
      </aside>
    </main>

    <!-- 提示通知 -->
    <div v-if="showNotification" class="fixed z-50 transform -translate-x-1/2 top-4 left-1/2 animate-pulse">
      <div class="px-6 py-3 rounded-lg shadow-lg bg-red-500">
        <p class="font-bold text-center text-white">{{ notificationMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import DoudizhuCard from './DoudizhuCard.vue'
import { useGameEvents } from '@/hook/useGameEvents'
import { RoomStatus } from 'tiaoom/client'
import type { DoudizhuGameState, DoudizhuCard as DoudizhuCardType } from '$/backend/src/games/doudizhu'

const props = defineProps<{ game?: any; roomPlayer?: any }>()

const gameStore = useGameStore()

const gameState = ref<DoudizhuGameState | null>(null)
const currentTimer = ref<number | null>(null)
const gameStatus = ref<'waiting' | 'calling' | 'grabbing' | 'counter-grabbing' | 'playing' | 'ended'>('waiting')
const achievements = ref<Record<string, { win: number; lost: number }>>({})
const roomMessages = ref<Array<{ content: string, sender?: any }>>([])
const selectedCards = ref<string[]>([])
const showNotification = ref(false)
const notificationMessage = ref('')

// 计算属性
const myHand = computed<DoudizhuCardType[]>(() => {
  if (!gameState.value || !gameStore.player?.id) return []
  return gameState.value.players[gameStore.player.id] || []
})

const otherPlayers = computed(() => {
  if (!gameState.value) return []
  return Object.keys(gameState.value.players).filter(id => id !== gameStore.player?.id)
})

const isCurrentPlayer = computed(() => {
  if (!gameState.value || !gameStore.player?.id) return false
  if (gameState.value.phase === 'calling' || gameState.value.phase === 'grabbing' || gameState.value.phase === 'counter-grabbing') {
    return gameState.value.currentBidder === gameStore.player.id
  }
  return gameState.value.currentPlayer === gameStore.player.id
})

const canPass = computed(() => {
  if (!gameState.value || !isCurrentPlayer.value) return false
  if (gameState.value.phase !== 'playing') return false
  // 如果没有上家出牌或者自己是上家，不能不出
  return gameState.value.lastPlayer && gameState.value.lastPlayer !== gameStore.player?.id
})

const canPlay = computed(() => {
  if (!isCurrentPlayer.value) return false
  if (gameState.value?.phase !== 'playing') return false
  return selectedCards.value.length > 0
})

const isWinner = computed(() => {
  if (!gameState.value?.winner || !gameStore.player?.id) return false
  const isLandlord = gameStore.player.id === gameState.value.landlord
  const landlordWon = gameState.value.winnerRole === 'landlord'
  return isLandlord === landlordWon
})

const isAllReady = computed(() => {
  if (!gameStore.roomPlayer?.room) return false
  const players = gameStore.roomPlayer.room.players.filter((p: any) => p.role === 'player')
  return players.length >= 3 && players.every((p: any) => p.isReady)
})

const isRoomFull = computed(() => {
  if (!gameStore.roomPlayer?.room) return false
  const playerCount = gameStore.roomPlayer.room.players.filter((p: any) => p.role === 'player').length
  return playerCount >= 3
})

// 方法
const getPlayerName = (playerId: string) => {
  const player = gameStore.roomPlayer?.room?.players.find((p: any) => p.id === playerId)
  return player?.name || '未知玩家'
}

const getPlayerStatus = (p: any) => {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting' || gameStatus.value === 'ended') return '已准备'
  // 游戏中，检查是否是当前回合
  if ((gameState.value?.phase === 'calling' || gameState.value?.phase === 'grabbing' || gameState.value?.phase === 'counter-grabbing') && gameState.value.currentBidder === p.id) {
    if (gameState.value.phase === 'calling') return '叫地主中'
    if (gameState.value.phase === 'grabbing') return '抢地主中'
    return '反抢中'
  }
  if (gameState.value?.phase === 'playing' && gameState.value.currentPlayer === p.id) return '出牌中'
  if (gameStatus.value === 'playing' || gameStatus.value === 'calling' || gameStatus.value === 'grabbing' || gameStatus.value === 'counter-grabbing') return '等待中'
  return '已准备'
}

// 判断某玩家是否是当前回合（用于显示高亮和倒计时）
const isPlayerCurrentTurn = (playerId: string) => {
  if (!gameState.value) return false
  if (gameState.value.phase === 'calling' || gameState.value.phase === 'grabbing' || gameState.value.phase === 'counter-grabbing') {
    return gameState.value.currentBidder === playerId
  }
  if (gameState.value.phase === 'playing') {
    return gameState.value.currentPlayer === playerId
  }
  return false
}

const toggleCardSelection = (cardId: string) => {
  if (!isCurrentPlayer.value || gameState.value?.phase !== 'playing') return
  const index = selectedCards.value.indexOf(cardId)
  if (index > -1) {
    selectedCards.value.splice(index, 1)
  } else {
    selectedCards.value.push(cardId)
  }
}

const clearSelection = () => {
  selectedCards.value = []
}

const callLandlord = (bid: boolean) => {
  if (!gameState.value || (gameState.value.phase !== 'calling' && gameState.value.phase !== 'grabbing' && gameState.value.phase !== 'counter-grabbing')) return
  if (gameState.value.currentBidder !== gameStore.player?.id) return

  gameStore.game?.command(gameStore.roomPlayer?.room?.id || '', {
    type: 'doudizhu:bid',
    data: { bid }
  })
}

const playSelectedCards = () => {
  if (!canPlay.value) return

  gameStore.game?.command(gameStore.roomPlayer?.room?.id || '', {
    type: 'doudizhu:play',
    data: { cardIds: selectedCards.value }
  })
  clearSelection()
}

const passPlay = () => {
  if (!canPass.value) return

  gameStore.game?.command(gameStore.roomPlayer?.room?.id || '', {
    type: 'doudizhu:pass',
    data: {}
  })
}

const sendMessage = (message: string) => {
  gameStore.game?.say(message, gameStore.roomPlayer?.room?.id || '')
}

const showError = (msg: string) => {
  notificationMessage.value = msg
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 2000)
}

// 监听房间状态
watch(() => gameStore.roomPlayer?.room?.status, (newStatus) => {
  if (newStatus === 'playing' && gameStatus.value === 'waiting') {
    gameStatus.value = 'playing'
  } else if (newStatus === 'waiting') {
    // 如果当前是 ended 状态，不要覆盖（让用户看到游戏结束界面）
    if (gameStatus.value !== 'ended') {
      gameStatus.value = 'waiting'
    }
  }
})

// 事件处理
const onRoomStart = () => {
  gameState.value = null
  gameStatus.value = 'playing'
  clearSelection()
}

const onRoomEnd = () => {
  gameStatus.value = 'waiting'
  gameState.value = null  // 清空游戏状态，重置身份等信息
  currentTimer.value = null  // 清空倒计时
  clearSelection()  // 清空选中的牌
}

const onCommand = (command: any) => {
  switch (command.type) {
    case 'game:state':
      gameState.value = command.data
      if (command.data.phase === 'ended') {
        gameStatus.value = 'ended'
      } else if (command.data.phase === 'calling') {
        gameStatus.value = 'calling'
      } else if (command.data.phase === 'grabbing') {
        gameStatus.value = 'grabbing'
      } else if (command.data.phase === 'counter-grabbing') {
        gameStatus.value = 'counter-grabbing'
      } else {
        gameStatus.value = 'playing'
      }
      // 更新倒计时
      if (command.data.turnTimeLeft !== undefined) {
        currentTimer.value = command.data.turnTimeLeft
      }
      break
    case 'timer:update':
      // 实时倒计时更新
      if (command.data?.timeLeft !== undefined) {
        currentTimer.value = command.data.timeLeft
      }
      break
    case 'game:over':
      if (gameState.value) {
        gameState.value.winner = command.data.winner
        gameState.value.winnerRole = command.data.winnerRole
      }
      gameStatus.value = 'ended'
      // 同步房间状态为 waiting，这样 RoomControls 会显示等待/准备按钮
      if (gameStore.roomPlayer && gameStore.roomPlayer.room) {
        try {
          gameStore.roomPlayer.room.status = RoomStatus.waiting as any
        } catch (e) {
          // 某些情况下对象可能是只读，忽略错误
        }
      }
      break
    case 'doudizhu:landlord':
      // 地主确定
      break
    case 'doudizhu:invalid':
      showError(command.data.message)
      break
    case 'achievements':
      achievements.value = command.data
      break
    case 'message_history':
      roomMessages.value = command.data || []
      break
    case 'status':
      if (command.data?.status) {
        if (command.data.status === 'ended') {
          gameStatus.value = 'ended'
        } else if (command.data.status === 'playing') {
          // 根据 gameState.phase 设置正确的状态
          if (gameState.value?.phase === 'calling') {
            gameStatus.value = 'calling'
          } else if (gameState.value?.phase === 'grabbing') {
            gameStatus.value = 'grabbing'
          } else if (gameState.value?.phase === 'counter-grabbing') {
            gameStatus.value = 'counter-grabbing'
          } else {
            gameStatus.value = 'playing'
          }
        } else if (command.data.status === 'waiting') {
          // 如果当前是 ended 状态，不要覆盖（让用户看到游戏结束界面）
          // 只有当不是 ended 时才设置为 waiting
          if (gameStatus.value !== 'ended') {
            gameStatus.value = 'waiting'
          }
        }
      }
      break
    case 'end':
      // 游戏结束命令，重置状态以便玩家可以离开或重新准备
      gameStatus.value = 'waiting'
      gameState.value = null
      currentTimer.value = null
      clearSelection()
      break
  }
}

const onPlayMessage = (message: any) => {
  if (!message || !message.content) return
  if (!roomMessages.value) roomMessages.value = []
  roomMessages.value.unshift(message)
  if (roomMessages.value.length > 100) {
    roomMessages.value = roomMessages.value.slice(0, 100)
  }
}

onMounted(() => {
  if (gameStore.game && gameStore.roomPlayer) {
    useGameEvents(gameStore.game as any, {
      'room.start': onRoomStart,
      'room.end': onRoomEnd,
      'player.message': onPlayMessage,
      'room.message': onPlayMessage,
      'player.command': onCommand,
      'room.command': onCommand,
    } as any)

    const roomId = gameStore.roomPlayer.room.id
    gameStore.game.command(roomId, { type: 'status', data: {} })
    gameStore.game.command(roomId, { type: 'game:state' })
    gameStore.game.command(roomId, { type: 'achievements' })
    gameStore.game.command(roomId, { type: 'message_history' })

    gameStatus.value = gameStore.roomPlayer.room.status === 'playing' ? 'playing' : 'waiting'
  }
})
</script>

<style scoped>
/* 自定义滚动条样式 */
.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Firefox 滚动条 */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}
</style>
