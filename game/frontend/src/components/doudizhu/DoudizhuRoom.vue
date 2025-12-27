<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <!-- 左侧主视图 -->
    <section class="flex-1 md:h-full flex flex-col overflow-auto p-4 select-none">
      <!-- 等待状态 -->
      <div v-if="gameStatus === 'waiting'" class="flex items-center justify-center flex-1">
        <div class="text-center">
          <h3 class="mb-4 text-2xl font-bold">等待玩家准备</h3>
          <div class="mb-6 text-lg">
            {{ roomPlayer.room.players.length || 0 }} / 3 玩家
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
      <div v-else-if="isPlaying && gameState" class="flex flex-col flex-1 min-h-0">
        <!-- 游戏桌面 -->
        <div class="relative p-2 md:p-4 rounded-lg bg-base-100 flex-1 overflow-y-auto">
          <!-- 其他玩家区域 -->
          <div class="flex justify-between mb-2 md:mb-4 gap-2">
            <div v-for="playerId in otherPlayers" :key="playerId"
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
            <!-- 叫地主阶段 -->
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

          <!-- 当前玩家信息（底部） -->
          <div v-if="isPlayer"
               class="mt-4 mx-auto p-2 md:p-4 rounded-lg bg-base-200 shadow-lg max-w-md"
               :class="{ 'ring-2 ring-primary': isCurrentPlayer }">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 flex items-center justify-center rounded-full bg-base-300 font-bold">
                {{ roomPlayer.name?.substring(0, 1).toUpperCase() }}
              </div>
              <div>
                <div class="font-medium">你</div>
                <div class="flex items-center gap-1">
                  <span v-if="gameState.landlord === roomPlayer.id" class="badge badge-warning badge-xs">地主</span>
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
        <div v-if="isPlayer" class="p-2 md:p-4 rounded-lg bg-base-100 mt-2 shrink-0">
          <!-- 叫地主阶段 -->
          <div v-if="gameState.phase === 'calling' && gameState.currentBidder === roomPlayer.id" class="mb-4">
            <div class="flex gap-2 justify-center">
              <button @click="callLandlord(true)" class="btn btn-warning">叫地主</button>
              <button @click="callLandlord(false)" class="btn btn-secondary">不叫</button>
            </div>
          </div>

          <!-- 抢地主阶段 -->
          <div v-if="gameState.phase === 'grabbing' && gameState.currentBidder === roomPlayer.id && gameState.caller !== roomPlayer.id" class="mb-4">
            <div class="flex gap-2 justify-center">
              <button @click="callLandlord(true)" class="btn btn-warning">抢地主</button>
              <button @click="callLandlord(false)" class="btn btn-secondary">不抢</button>
            </div>
          </div>

          <!-- 反抢地主阶段 -->
          <div v-if="gameState.phase === 'counter-grabbing' && gameState.currentBidder === roomPlayer.id && gameState.caller === roomPlayer.id" class="mb-4">
            <div class="flex gap-2 justify-center">
              <button @click="callLandlord(true)" class="btn btn-error">反抢</button>
              <button @click="callLandlord(false)" class="btn btn-secondary">不反抢</button>
            </div>
          </div>

          <!-- 出牌阶段 -->
          <div v-if="gameState.phase === 'playing'" class="mb-4">
            <div class="flex gap-2 justify-center">
              <button @click="playSelectedCards" :disabled="!canPlay" class="btn btn-primary">
                出牌 ({{ selectedCards.length }})
              </button>
              <button @click="passPlay" :disabled="!canPass" class="btn btn-secondary">不出</button>
              <button @click="clearSelection" class="btn btn-ghost">清空选择</button>
            </div>
          </div>

          <!-- 手牌显示 -->
          <div class="flex gap-1 pb-2 overflow-x-auto md:flex-wrap md:justify-center md:overflow-x-visible md:overflow-y-auto min-h-24 md:max-h-48 scrollbar-thin">
            <DoudizhuCard
              v-for="card in myHand"
              :key="card.id"
              :card="card"
              :selected="selectedCards.includes(card.id)"
              :selectable="gameState.phase === 'playing' && isCurrentPlayer"
              class="shrink-0"
              @click="toggleCardSelection(card.id)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- 侧边栏 -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <section class="inline-flex flex-col gap-2 max-h-1/2">
        <div role="tablist" class="tabs tabs-lift">
          <a role="tab" class="tab tooltip tooltip-bottom" :class="{ 'tab-active': activeTab === 'players' }" @click="activeTab = 'players'">
            <Icon icon="fluent:people-16-filled" />
            <span class="ml-2">玩家列表</span>
          </a>
          <a v-if="Object.keys(achievements).length > 0" role="tab" class="tab tooltip tooltip-bottom" :class="{ 'tab-active': activeTab === 'achievements' }" @click="activeTab = 'achievements'">
            <Icon icon="ri:sword-fill" />
            <span class="ml-2">战绩</span>
          </a>
        </div>

        <!-- 战绩表 -->
        <div v-show="activeTab === 'achievements'">
          <AchievementTable :achievements="achievements" />
        </div>

        <!-- 玩家列表 -->
        <div v-show="activeTab === 'players'">
          <PlayerList :players="roomPlayer.room.players">
            <template #default="{ player: p }">
              <span v-if="p.role === 'player'" class="inline-flex gap-2 items-center">
                <span>[{{ getPlayerStatus(p) }}]</span>
                <template v-if="gameState?.landlord">
                  <span v-if="gameState.landlord === p.id" class="badge badge-warning badge-xs">地主</span>
                  <span v-else-if="gameState.players?.[p.id]" class="badge badge-info badge-xs">农民</span>
                </template>
              </span>
              <span v-else>[围观中]</span>
              <span>{{ p.name }}</span>
              <span v-if="isPlaying && gameState?.players?.[p.id]" class="badge badge-sm ml-1">
                {{ gameState.players[p.id].length }} 张
              </span>
            </template>
          </PlayerList>
        </div>

        <!-- 操作按钮 -->
        <div v-if="isPlaying && isPlayer" class="flex gap-2">
          <button class="btn" @click="requestLose">认输</button>
        </div>

        <hr class="border-base-content/20" />
      </section>

      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. 三人游戏，一人为地主，两人为农民</li>
            <li>2. 地主先出牌，按逆时针顺序出牌</li>
            <li>3. 必须出比上家大的牌，或选择不出</li>
            <li>4. 两人连续不出，则最后出牌者重新出牌</li>
            <li>5. 先出完牌的一方获胜</li>
            <li>6. 炸弹和王炸可以压任何牌</li>
          </ul>

          <div class="divider my-2">积分规则</div>
          <div class="text-sm space-y-2">
            <div>
              <p class="font-semibold">倍率计算：</p>
              <ul class="list-disc list-inside ml-2 space-y-1">
                <li>叫地主：基础倍率 1 倍</li>
                <li>抢地主：基础倍率 2 倍</li>
                <li>反抢地主：基础倍率 4 倍</li>
                <li>每出一个炸弹/王炸，倍率翻倍</li>
              </ul>
            </div>
            <div>
              <p class="font-semibold">结算方式：</p>
              <ul class="list-disc list-inside ml-2 space-y-1">
                <li>地主获胜：地主 +2×底分×倍率，农民各 -底分×倍率</li>
                <li>农民获胜：地主 -2×底分×倍率，农民各 +底分×倍率</li>
              </ul>
            </div>
          </div>
        </template>
      </GameChat>
    </aside>

    <!-- 提示通知 -->
    <div v-if="showNotification" class="fixed z-50 transform -translate-x-1/2 top-4 left-1/2 animate-pulse">
      <div class="px-6 py-3 rounded-lg shadow-lg bg-red-500">
        <p class="font-bold text-center text-white">{{ notificationMessage }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { RoomPlayer, Room } from 'tiaoom/client'
import type { GameCore } from '@/core/game'
import DoudizhuCard from './DoudizhuCard.vue'
import { useDoudizhu } from './useDoudizhu'
import AchievementTable from '@/components/common/AchievementTable.vue'
import PlayerList from '@/components/common/PlayerList.vue'
import GameChat from '@/components/common/GameChat.vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const activeTab = ref<'players' | 'achievements'>('players')

const {
  gameState,
  currentTimer,
  gameStatus,
  achievements,
  selectedCards,
  showNotification,
  notificationMessage,
  myHand,
  otherPlayers,
  isCurrentPlayer,
  canPass,
  canPlay,
  isWinner,
  isPlaying,
  isPlayer,
  getPlayerName,
  getPlayerStatus,
  isPlayerCurrentTurn,
  toggleCardSelection,
  clearSelection,
  callLandlord,
  playSelectedCards,
  passPlay,
  requestLose,
  init,
} = useDoudizhu(props.game, props.roomPlayer)

onMounted(() => {
  init()
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
