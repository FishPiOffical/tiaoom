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
          <!-- 游戏恢复通知 -->
          <!-- 恢复通知已改为中央浮动通知（showTransient） -->
        </div>
      </div>
    </header>

    <!-- 游戏主区域 -->
    <main class="flex flex-col flex-1 gap-2 p-2 overflow-hidden md:flex-row md:p-4 md:gap-4">
      <!-- 游戏内容区域 -->
      <div class="flex flex-col flex-1 md:h-full">
        <!-- 准备阶段 -->
        <div v-if="gameStatus === 'waiting'" class="flex items-center justify-center flex-1">
          <div class="text-center">
            <h3 class="mb-4 text-2xl font-bold">等待玩家准备</h3>
            <div class="mb-6 text-lg">
              {{ Object.keys(gameStore.roomPlayer?.room?.players || {}).length }} / {{ gameStore.roomPlayer?.room?.size }} 玩家
            </div>
            <div v-if="gameStore.roomPlayer?.role === 'watcher'" class="mt-4 text-sm text-gray-600">
              你正在围观这场游戏，等待游戏开始
            </div>
          </div>
        </div>

        <div v-else-if="gameStatus === 'ended' && gameState" class="flex flex-col items-center justify-center flex-1">
          <div class="text-center">
            <h2 class="mb-4 text-3xl font-bold">
              {{ gameState.winner === gameStore.player?.id ? '你赢了！' : '游戏结束' }}
            </h2>
            <p v-if="gameState.winner && gameState.winner !== gameStore.player?.id" class="mb-6 text-lg">
              {{ getPlayerName(gameState.winner) }} 获胜
            </p>
            <p class="mb-4 text-gray-600">等待玩家准备开始新游戏</p>
          </div>
        </div>

        <!-- 加载中或状态不匹配时的显示 -->
        <div v-else-if="gameStatus === 'playing' && !gameState" class="flex items-center justify-center flex-1">
          <div class="text-center">
            <h3 class="mb-4 text-2xl font-bold">游戏加载中...</h3>
            <p class="mb-2 text-gray-600" v-if="gameStore.roomPlayer?.role === 'watcher'">
              正在获取游戏状态，请稍候...
            </p>
            <p class="mb-2 text-gray-600" v-else>
              正在从服务器恢复游戏数据
            </p>
            <div class="loading loading-spinner loading-lg"></div>
          </div>
        </div>

        <div v-else-if="gameStatus === 'playing' && gameState" class="flex flex-col flex-1">
          <!-- 游戏桌面 - 包含其他玩家位置 -->
          <div class="relative flex-1 p-2 rounded-lg md:p-6 bg-base-100">
            <!-- 按位置排列所有玩家（包括自己） -->
            <div class="absolute inset-0">
              <!-- 其他玩家 -->
              <div 
                v-for="(playerInfo, index) in getPlayersByPosition" 
                :key="playerInfo.id"
                class="absolute p-2 md:p-3 rounded-lg bg-base-100 shadow-lg min-w-[70px] md:min-w-[100px] z-30"
                :class="{ 
                  'ring-2 ring-primary ring-offset-2 z-40': gameState.currentPlayer === playerInfo.id,
                  'border-2 border-primary/50': gameStore.roomPlayer?.role === 'watcher' && playerInfo.id === gameStore.player?.id
                }"
                :style="getPlayerPositionStyle(index, getPlayersByPosition.length)"
              >
                <div class="flex flex-col items-center gap-1 md:gap-2">
                  <div :class="['flex items-center gap-2 md:gap-3', playerAnim[playerInfo.id]?.type === 'play' ? 'animate-play' : '', playerAnim[playerInfo.id]?.type === 'draw' ? 'animate-draw' : '', playerAnim[playerInfo.id]?.type === 'skip' ? 'player-skipped' : '']">
                    <!-- avatar -->
                    <div class="flex items-center justify-center w-8 h-8 overflow-hidden text-sm font-bold border rounded-full md:w-10 md:h-10 bg-base-200 border-base-content/20">
                      <template v-if="getRoomPlayer(playerInfo.id)?.attributes?.avatar">
                        <img :src="getRoomPlayer(playerInfo.id)?.attributes?.avatar" alt="avatar" class="object-cover w-full h-full rounded-full" />
                      </template>
                      <template v-else>
                        <span>{{ getRoomPlayer(playerInfo.id)?.name?.substring(0,1).toUpperCase() }}</span>
                      </template>
                    </div>
                    <!-- 被跳过/禁止出牌覆盖图标 -->
                    <div v-if="playerAnim[playerInfo.id]?.type === 'skip'" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span class="text-2xl text-red-600 md:text-3xl animate-pulse">⛔</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-xs md:text-sm font-medium truncate max-w-[60px] md:max-w-20">
                        {{ getPlayerDisplayName(playerInfo.id) }}
                      </span>
                      <div v-if="gameState.currentPlayer === playerInfo.id" class="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
              <!-- 当前玩家倒计时（移到手牌数量前面） -->
              <div class="flex items-center gap-2 mb-1">
                <div v-if="gameState.currentPlayer === playerInfo.id && currentTimer !== null" class="text-xs font-bold animate-pulse"
                     :class="currentTimer <= 5 ? 'text-red-500' : 'text-blue-500'">
                  ⏱ {{ currentTimer }}s
                </div>
                <span class="badge badge-xs md:badge-sm">{{ playerInfo.hand?.length ?? 0 }} 张</span>
              </div>
              <div v-if="playerInfo.hand.length === 1" class="text-xs font-bold text-red-500">
                UNO!
              </div>
              
              <!-- 位置提示已移除 -->
                </div>
              </div>
              
              <!-- 当前玩家（自己）- 始终在底部中央 - 仅对普通玩家显示 -->
              <div 
                v-if="gameStore.roomPlayer?.role === 'player'"
                class="absolute p-2 md:p-4 rounded-lg bg-base-100 border border-primary md:border-2 shadow-lg min-w-20 md:min-w-[120px] z-30"
                :class="{ 
                  'ring-2 ring-primary ring-offset-2 z-50': gameState.currentPlayer === gameStore.player?.id
                }"
                style="bottom: 5%; left: 50%; transform: translate(-50%, 50%)"
              >
                <div class="flex flex-col items-center gap-1 md:gap-2">
                  <div :class="['flex items-center gap-2 md:gap-3', playerAnim[gameStore.player?.id || '']?.type === 'play' ? 'animate-play' : '', playerAnim[gameStore.player?.id || '']?.type === 'draw' ? 'animate-draw' : '', playerAnim[gameStore.player?.id || '']?.type === 'skip' ? 'player-skipped' : '']">
                    <!-- 自己头像 -->
                    <div class="flex items-center justify-center w-10 h-10 overflow-hidden text-sm font-bold border rounded-full bg-base-200 border-base-content/20">
                      <template v-if="getRoomPlayer(gameStore.player?.id || '')?.attributes?.avatar">
                        <img :src="getRoomPlayer(gameStore.player?.id || '')?.attributes?.avatar" alt="avatar" class="object-cover w-full h-full rounded-full" />
                      </template>
                      <template v-else>
                        <span>{{ getRoomPlayer(gameStore.player?.id || '')?.name?.substring(0,1).toUpperCase() }}</span>
                      </template>
                    </div>
                    <div v-if="playerAnim[gameStore.player?.id || '']?.type === 'skip'" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span class="text-2xl text-red-600 md:text-3xl animate-pulse">⛔</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-xs font-medium md:text-sm">你</span>
                      <div v-if="gameState.currentPlayer === gameStore.player?.id" class="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <!-- 自己的倒计时（放在手牌数前） -->
                  <div class="flex items-center gap-2 mb-1">
                    <div v-if="gameState.currentPlayer === gameStore.player?.id && currentTimer !== null"
                         class="text-sm font-bold animate-pulse"
                         :class="currentTimer <= 5 ? 'text-red-500' : 'text-blue-500'">
                      ⏱ {{ currentTimer }}s
                    </div>
                    <span class="badge badge-xs badge-primary md:badge-sm">{{ (gameState.players?.[gameStore.player?.id || '']?.length) || 0 }} 张</span>
                  </div>
                  <div v-if="gameState.players?.[gameStore.player?.id || '']?.length === 1" class="text-xs font-bold text-red-500">
                    UNO!
                  </div>
                  <!-- <div class="hidden text-xs font-medium text-primary md:block">
                    当前玩家
                  </div> -->
                </div>
              </div>
            </div>
            <!-- 左上角状态信息 -->
            <div v-if="gameState" class="absolute z-40 flex flex-wrap items-center gap-2 top-2 left-2 md:top-4 md:left-4 md:gap-3 max-w-60 md:max-w-80">
              <!-- 方向指示 -->
              <div class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg shadow-md md:gap-2 md:text-sm bg-white/90 md:px-3 md:py-2 backdrop-blur-sm">
                <div class="text-base md:text-lg">
                  {{ gameState.direction === 1 ? '↻' : '↺' }}
                </div>
                <span class="hidden font-medium md:inline">
                  {{ gameState.direction === 1 ? '顺时针' : '逆时针' }}
                </span>
              </div>
              
              <!-- 当前颜色 -->
              <div class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg shadow-md md:gap-2 md:text-sm bg-white/90 md:px-3 md:py-2 backdrop-blur-sm">
                <span class="hidden font-medium md:inline">当前颜色:</span>
                <div 
                  class="w-4 h-4 border-2 border-gray-800 rounded md:w-5 md:h-5"
                  :class="{
                    'bg-red-500': gameState.color === 'red',
                    'bg-blue-500': gameState.color === 'blue',
                    'bg-green-500': gameState.color === 'green',
                    'bg-yellow-400': gameState.color === 'yellow'
                  }"
                ></div>
              </div>
              
              <!-- 抽牌计数 -->
              <div v-if="gameState.drawCount > 0" class="flex items-center gap-1 px-2 py-1 text-xs border border-orange-300 rounded-lg shadow-md md:gap-2 md:text-sm bg-orange-100/90 md:px-3 md:py-2 backdrop-blur-sm">
                <div class="text-xs font-bold text-orange-600 md:text-sm">
                  +{{ gameState.drawCount }}
                </div>
                <span class="hidden font-medium text-orange-700 md:inline">
                  累积抽牌
                </span>
              </div>
            </div>

            <div class="relative flex items-center justify-center" style="margin-top: 40px;">
              <!-- 中央方向指示器 - 缩小作为背景装饰，降低层级 -->
              <div v-if="gameState" class="absolute z-0 flex items-center justify-center w-48 h-48 pointer-events-none md:w-80 md:h-80">
                <div class="relative w-full h-full">
                  <!-- 方向箭头 -->
                  <div class="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out">
                    <div class="relative">
                      <!-- 主箭头 - 根据方向使用不同图标 -->
                      <div class="text-3xl text-blue-500 md:text-6xl opacity-30 animate-pulse">
                        {{ gameState.direction === 1 ? '↻' : '↺' }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- 圆形轨道 - 装饰性边框，降低透明度 -->
                  <div class="absolute inset-0 border border-blue-300 rounded-full opacity-10 md:border-2"></div>
                  <div class="absolute border border-blue-200 rounded-full inset-2 md:inset-3 opacity-5"></div>
                </div>
              </div>
              
              <!-- 游戏内容 - 确保在指示器之上 -->
              <div class="relative z-10 flex flex-col items-center gap-4 md:gap-8">
                <!-- 弃牌堆 -->
                <div class="text-center">
                  <p class="mb-2 text-sm text-gray-600">弃牌堆</p>
                  <div v-if="gameState.discardPile.length > 0" class="relative">
                    <UnoCard :card="gameState.discardPile[gameState.discardPile.length - 1]" />
                  </div>
                </div>

                <!-- 牌堆 -->
                <div class="text-center">
                  <p class="mb-2 text-sm text-gray-600">抽牌堆</p>
                  <div class="relative flex items-center justify-center w-20 font-bold text-white bg-gray-800 rounded-lg h-28">
                    <span>{{ gameState.deck.length }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 普通玩家手牌区域 -->
          <div v-if="gameStore.roomPlayer?.role === 'player'" class="p-2 rounded-lg md:p-4 bg-base-100">
            <div class="flex items-center justify-between mb-2 md:mb-4">
              <span class="text-sm md:font-medium">我的手牌</span>
              <div class="flex items-center gap-2">
                <button 
                  v-if="gameState.players?.[gameStore.player?.id || '']?.length === 2"
                  @click="callUno"
                  class="btn btn-xs md:btn-sm btn-warning"
                >
                  UNO!
                </button>
              </div>
            </div>

            <!-- 手牌显示 -->
            <div class="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4 min-h-20 md:min-h-[100px] max-h-44 md:max-h-40 overflow-y-auto">
              <UnoCard
                v-for="card in (gameState.players[gameStore.player?.id || ''] || [])"
                :key="card.id"
                :card="card"
                :playable="isCurrentPlayer && canPlayCard(card)"
                @play="playCard"
                @cant-play="showCantPlayNotification"
              />
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-col gap-2 sm:flex-row">
              <button 
                @click="drawCard"
                :disabled="!isCurrentPlayer"
                class="btn btn-sm md:btn-base"
                :class="gameState.drawCount > 0 ? 'btn-warning animate-pulse' : 'btn-secondary'"
              >
                抽牌
                <span v-if="gameState.drawCount > 0" class="ml-2 text-xs badge badge-error">+{{ gameState.drawCount }}</span>
              </button>
            </div>
          </div>
          
          <!-- 围观玩家提示区域 -->
          <div v-else-if="gameStore.roomPlayer?.role === 'watcher'" class="p-4 rounded-lg bg-base-200">
            <div class="text-center">
              <div class="mb-2 text-sm text-gray-600">
                你正在围观这场游戏
              </div>
              <div class="text-xs text-gray-500">
                围观玩家无法查看手牌或参与游戏
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧栏 -->
      <aside class="flex flex-col flex-none w-full overflow-y-auto border-t md:pl-4 md:border-t-0 md:border-l border-base-content/20 md:w-80">
        <!-- 成就表 -->
        <section class="mb-2 md:mb-4">
          <h3 class="mb-2 text-base font-bold md:text-lg">📊 计分板</h3>
          <div v-if="Object.keys(achievements).length" class="overflow-x-auto overflow-y-auto border rounded-box border-base-content/5 bg-base-100 max-h-48">
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
                  <td class="hidden md:table-cell">
                    {{ ((achievement.win / (achievement.win + achievement.lost)) * 100 || 0).toFixed(1) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-4 text-center text-gray-500">
            暂无战绩
          </div>
        </section>

        <!-- 玩家列表 -->
        <section class="mb-4">
          <h3 class="mb-2 text-lg font-bold">玩家列表</h3>
          <ul class="mb-4 space-y-1 overflow-y-auto max-h-44">
            <li 
              v-for="p in gameStore.roomPlayer?.room?.players || []" 
              :key="p.id" 
              class="flex items-center gap-2 p-1 text-sm rounded hover:bg-surface/50"
              :class="{ 'text-gray-500': p.role === 'watcher' }"
            >
              <span v-if="p.role === 'player'">[{{ getPlayerStatus(p) }}]</span>
              <span v-else>[围观中]</span>
              <span>{{ p.name }}</span>
            </li>
          </ul>
          
          <!-- 操作按钮 -->
          <div v-if="gameStore.roomPlayer && gameStore.game" class="space-y-2">
            <!-- 使用单一 RoomControls 组件处理不同状态与角色，RoomControls 内部会根据 role/status 渲染不同按钮 -->
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
          <GameChat 
            :messages="roomMessages" 
            :room-player="gameStore.roomPlayer" 
            @send="sendMessage"
          />
        </section>
      </aside>
    </main>
  </div>

  <!-- 游戏通知 -->
  <div v-if="showNotification" class="fixed z-50 transform -translate-x-1/2 top-4 left-1/2 animate-pulse">
    <div class="px-6 py-3 rounded-lg shadow-lg" 
         :class="{
           'bg-orange-500': forceDrawMessage,
           'bg-red-500': cantPlayMessage,
           'bg-blue-500': directionChangeMessage
         }">
      <p class="font-bold text-center text-white">
        {{ forceDrawMessage || cantPlayMessage || directionChangeMessage }}
      </p>
    </div>
  </div>

  <!-- 颜色选择模态框 -->
  <div v-if="showColorPicker" class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="w-full max-w-sm p-4 rounded-lg shadow-xl md:p-6 bg-base-100">
      <h3 class="mb-4 text-base font-bold text-center md:text-lg">选择颜色</h3>
      <div class="grid grid-cols-2 gap-2 md:gap-4">
        <button
          @click="selectColor('red')"
          class="p-3 text-sm font-bold text-white bg-red-500 rounded-lg md:p-4 hover:bg-red-600 md:text-base"
        >
          红色
        </button>
        <button
          @click="selectColor('blue')"
          class="p-3 text-sm font-bold text-white bg-blue-500 rounded-lg md:p-4 hover:bg-blue-600 md:text-base"
        >
          蓝色
        </button>
        <button
          @click="selectColor('green')"
          class="p-3 text-sm font-bold text-white bg-green-500 rounded-lg md:p-4 hover:bg-green-600 md:text-base"
        >
          绿色
        </button>
        <button
          @click="selectColor('yellow')"
          class="p-3 text-sm font-bold text-white bg-yellow-400 rounded-lg md:p-4 hover:bg-yellow-500 md:text-base"
        >
          黄色
        </button>
      </div>
      <button
        @click="cancelColorSelection"
        class="w-full mt-2 md:mt-4 btn btn-secondary btn-sm md:btn-base"
      >
        取消
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
// 接收父组件可能传入的属性以避免 Vue 的非 props 属性警告
const props = defineProps<{ game?: any; roomPlayer?: any }>();
import { useGameStore } from '@/stores/game'
import UnoCard from './UnoCard.vue'
import RoomControls from '@/components/common/RoomControls.vue'
import GameChat from '@/components/common/GameChat.vue'
import { useGameEvents } from '@/hook/useGameEvents'
import type { UnoCard as UnoCardType, UnoGameState } from '../../../../backend/src/games/uno'

const gameStore = useGameStore()

const gameState = ref<UnoGameState | null>(null)
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

// 游戏恢复通知
const showRestoreNotification = ref(false)
const restoreMessage = ref('')

// 动画/视觉提示状态
const playerAnim = ref<Record<string, { type: 'play' | 'draw' | 'skip' | null, until: number }>>({})

// 用于检测方向变化
const previousDirection = ref<number | null>(null)
const previousCurrentPlayer = ref<string | null>(null)
const lastSwitchAt = ref<number>(0)
const suppressTimerUntil = ref<number>(0)
const pendingSmallTimer = ref<number | null>(null)
const pendingSmallTimerTimeout = ref<number | null>(null)

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

// 计算其他玩家按照游戏顺序的排列
const getPlayersByPosition = computed(() => {
  if (!gameState.value) return []
  
  const allPlayerIds = Object.keys(gameState.value.players)
  
  // 如果是围观玩家，显示所有玩家（包括自己在其他玩家位置）
  if (gameStore.roomPlayer?.role === 'watcher') {
    const allPlayers: Array<{ id: string, hand: any[], position: string }> = []
    const totalPlayers = allPlayerIds.length
    
    // 按照游戏顺序排列所有玩家，从第一个玩家开始
      for (let i = 0; i < totalPlayers; i++) {
      const playerId = allPlayerIds[i]
      let position = ''
      
      if (totalPlayers === 2) {
        position = i === 0 ? 'across' : 'across'
      } else if (totalPlayers === 3) {
        if (i === 0) position = 'next'
        else if (i === 1) position = 'across'
        else position = 'prev'
      } else if (totalPlayers === 4) {
        if (i === 0) position = 'next'
        else if (i === 1) position = 'across'
        else position = 'prev'
      }
      
      allPlayers.push({
        id: playerId,
        hand: gameState.value.players[playerId] || [],
        position
      })
    }
    
    return allPlayers
  }
  
  // 普通玩家只看其他玩家
  if (!gameStore.player?.id) return []
  
  const currentPlayerId = gameStore.player.id
  const currentPlayerIndex = allPlayerIds.indexOf(currentPlayerId)
  
  // 将其他玩家按照游戏顺序排列（从当前玩家的下家开始）
  const otherPlayers: Array<{ id: string, hand: any[], position: 'next' | 'across' | 'prev' | string }> = []
  const totalPlayers = allPlayerIds.length
  
  for (let i = 1; i < totalPlayers; i++) {
    const playerIndex = gameState.value.direction === 1 
      ? (currentPlayerIndex + i) % totalPlayers
      : (currentPlayerIndex - i + totalPlayers) % totalPlayers
    
    const playerId = allPlayerIds[playerIndex]
    let position = ''
    
    if (totalPlayers === 2) {
      position = 'across'
    } else if (totalPlayers === 3) {
      if (i === 1) position = 'next'      // 正上
      else if (i === 2) position = 'across' // 右上  
      else position = 'prev'                 // 左上
    } else if (totalPlayers === 4) {
      if (i === 1) position = 'next'      // 正上（下家）
      else if (i === 2) position = 'across' // 右上（对家）
      else position = 'prev'                 // 左上（上家）
    }
    
    otherPlayers.push({
      id: playerId,
      hand: gameState.value.players[playerId] || [],
      position
    })
  }
  
  return otherPlayers
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
  if (gameState.value && gameState.value.drawCount > 0) {
    forceDrawMessage.value = `必须抽 ${gameState.value.drawCount} 张牌！`
    showNotification.value = true
    setTimeout(() => {
      showNotification.value = false
    }, 2000)
  } else {
    cantPlayMessage.value = '这张牌不能出！'
    showNotification.value = true
    setTimeout(() => {
      showNotification.value = false
    }, 1500)
  }
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



const isAllReady = computed(() => {
  if (!gameStore.roomPlayer?.room) return false
  const players = gameStore.roomPlayer.room.players.filter(p => p.role === 'player')
  return players.length >= gameStore.roomPlayer.room.minSize && players.every(p => p.isReady)
})

const isRoomFull = computed(() => {
  if (!gameStore.roomPlayer?.room) return false
  const playerCount = gameStore.roomPlayer.room.players.filter(p => p.role === 'player').length
  return playerCount >= gameStore.roomPlayer.room.size
})

// 根据玩家位置计算样式
const getPlayerPositionStyle = (index: number, totalPlayers: number) => {
  const positions: { [key: number]: { top?: string, bottom?: string, left?: string, right?: string, transform?: string } } = {}
  
  const isWatcher = gameStore.roomPlayer?.role === 'watcher'
  
  if (isMobile.value) {
    // 移动端布局 - 更紧凑
    if (isWatcher) {
      // 围观玩家布局 - 显示所有玩家
      if (totalPlayers === 2) {
        positions[0] = { top: '10%', left: '25%', transform: 'translate(-50%, -50%)' }
        positions[1] = { top: '10%', right: '25%', transform: 'translate(50%, -50%)' }
      } else if (totalPlayers === 3) {
        positions[0] = { top: '8%', left: '50%', transform: 'translate(-50%, -50%)' }
        positions[1] = { top: '15%', right: '10%', transform: 'translate(50%, -50%)' }
        positions[2] = { top: '15%', left: '10%', transform: 'translate(-50%, -50%)' }
      } else if (totalPlayers === 4) {
        positions[0] = { top: '5%', left: '50%', transform: 'translate(-50%, -50%)' }
        positions[1] = { top: '12%', right: '8%', transform: 'translate(50%, -50%)' }
        positions[2] = { top: '18%', left: '8%', transform: 'translate(-50%, -50%)' }
        positions[3] = { top: '25%', right: '25%', transform: 'translate(50%, -50%)' }
      }
    } else {
      // 普通玩家布局 - 只显示其他玩家
      if (totalPlayers === 1) {
        // 只有一个其他玩家 - 放在顶部
        positions[0] = { top: '10%', left: '50%', transform: 'translate(-50%, -50%)' }
      } else if (totalPlayers === 2) {
        // 两个其他玩家 - 分别放在左上、右上
        positions[0] = { top: '10%', left: '25%', transform: 'translate(-50%, -50%)' }
        positions[1] = { top: '10%', right: '25%', transform: 'translate(50%, -50%)' }
      } else if (totalPlayers === 3) {
        // 三个其他玩家（总共4人）- 分别放在左上、正上、右上，更紧凑
        positions[0] = { top: '8%', left: '50%', transform: 'translate(-50%, -50%)' }   // 正上（下家）
        positions[1] = { top: '15%', right: '10%', transform: 'translate(50%, -50%)' }    // 右上（对家）
        positions[2] = { top: '15%', left: '10%', transform: 'translate(-50%, -50%)' }     // 左上（上家）
      }
    }
  } else {
    // 桌面端布局 - 保持原有间距
    if (isWatcher) {
      // 围观玩家布局 - 显示所有玩家，环形分布
      if (totalPlayers === 2) {
        positions[0] = { top: '15%', left: '35%', transform: 'translate(-50%, -50%)' }
        positions[1] = { top: '15%', right: '35%', transform: 'translate(50%, -50%)' }
      } else if (totalPlayers === 3) {
        positions[0] = { top: '15%', left: '50%', transform: 'translate(-50%, -50%)' }
        positions[1] = { top: '25%', right: '15%', transform: 'translate(50%, -50%)' }
        positions[2] = { top: '25%', left: '15%', transform: 'translate(-50%, -50%)' }
      } else if (totalPlayers === 4) {
        positions[0] = { top: '10%', left: '50%', transform: 'translate(-50%, -50%)' }
        positions[1] = { top: '20%', right: '12%', transform: 'translate(50%, -50%)' }
        positions[2] = { top: '30%', left: '12%', transform: 'translate(-50%, -50%)' }
        positions[3] = { top: '40%', right: '35%', transform: 'translate(50%, -50%)' }
      }
    } else {
      // 普通玩家布局 - 只显示其他玩家
      if (totalPlayers === 1) {
        // 只有一个其他玩家 - 放在顶部
        positions[0] = { top: '15%', left: '50%', transform: 'translate(-50%, -50%)' }
      } else if (totalPlayers === 2) {
        // 两个其他玩家 - 分别放在左上、右上
        positions[0] = { top: '15%', left: '35%', transform: 'translate(-50%, -50%)' }
        positions[1] = { top: '15%', right: '35%', transform: 'translate(50%, -50%)' }
      } else if (totalPlayers === 3) {
        // 三个其他玩家（总共4人）- 分别放在左上、正上、右上，形成包围感
        positions[0] = { top: '15%', left: '50%', transform: 'translate(-50%, -50%)' } // 正上（下家）
        positions[1] = { top: '25%', right: '15%', transform: 'translate(50%, -50%)' }  // 右上（对家）
        positions[2] = { top: '25%', left: '15%', transform: 'translate(-50%, -50%)' }   // 左上（上家）
      }
    }
  }
  
  return positions[index] || { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
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

const sendMessage = (message: string) => {
  gameStore.game?.say(message, gameStore.roomPlayer?.room?.id || '')
}

// (已内联请求逻辑，避免未使用函数导致的编译警告)





// 位置提示已移除（换向后描述不准确）

const onRoomStart = () => {
  // 房间开始事件，清除之前的状态
  gameState.value = null
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

      // 检测当前玩家变化（回合切换），并在切换时立即重置前端计时器
      const newCurrent = command.data.currentPlayer
      if (previousCurrentPlayer.value === null || previousCurrentPlayer.value !== newCurrent) {
        // 新一轮开始：直接显示整轮时长（避免 1s 闪烁），并记录切换时间以防止短时间内被后续的 timer_update 覆盖
        const timeoutMs = typeof command.data.turnTimeout === 'number' ? command.data.turnTimeout : 15000
        const fullSecs = Math.max(1, Math.round(timeoutMs / 1000))
        currentTimer.value = fullSecs
        if (gameState.value) gameState.value.turnTimeLeft = fullSecs
        lastSwitchAt.value = Date.now()
        // 在切换时抑制随后短时间内的 timer_update（防止 1s 闪烁）
        suppressTimerUntil.value = Date.now() + 1200
        // 切换玩家时如果存在未决的小值延迟，清除它（避免后续延迟覆盖已设置的 fullSecs）
        if (pendingSmallTimerTimeout.value) {
          clearTimeout(pendingSmallTimerTimeout.value as any)
          pendingSmallTimerTimeout.value = null
          pendingSmallTimer.value = null
        }
      }
      previousCurrentPlayer.value = newCurrent

      gameState.value = command.data
      // 处理 game:state 中的倒计时：如果服务端提供的 turnTimeLeft 很小（<=1），
      // 则优先尝试用 turnStartTime+turnTimeout 计算或回退到整轮时长，避免被 1s 覆盖。
      if (typeof command.data.turnTimeLeft !== 'undefined') {
        const serverVal = Number(command.data.turnTimeLeft) || 0
        if (serverVal > 1) {
          currentTimer.value = serverVal
        } else {
          // 服务端提供的小值（<=1）可能来自旧的 timer_update；保持此前设置的 fullSecs，
          // 并依赖 suppressTimerUntil 来忽略短时间内的后续小更新。
          // 如需更精确的计算可以在后续的 timer_update 或新的 game:state 中更新。
        }
      }
      // 切换时再设置抑制窗口，防止后续短时间的 timer_update 覆盖
      suppressTimerUntil.value = Date.now() + 1200
      // 根据游戏状态设置正确的状态
      if (command.data.winner) {
        gameStatus.value = 'ended'
      } else {
        gameStatus.value = 'playing'
      }
      break
    case 'game:over':
      if (gameState.value) {
        gameState.value.winner = command.data.winner
      }
      gameStatus.value = 'ended'
      break
    case 'game:timer_update':
      // 后端每秒发送剩余时间（秒）。当计时器从隐藏变为可见（currentTimer 为 null）时，
      // 直接显示完整回合时长（默认为 15s 或使用服务端 turnTimeout），避免短暂显示 1s 的闪烁。
      console.log('收到game:timer_update命令:', Date.now(), command.data)
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