<template>
    <section class="flex flex-col md:flex-row gap-4 md:h-full">
        <!-- 左侧主视图 -->
        <section class="flex-1 md:h-full flex flex-col overflow-auto select-none">
            <!-- 等待状态 -->
            <div v-if="gameStatus === 'waiting'" class="flex items-center justify-center flex-1 p-4">
                <div class="text-center">
                    <h3 class="mb-4 text-2xl font-bold">等待玩家准备</h3>
                    <div class="mb-6 text-lg">
                        {{ roomPlayer.room.players.length || 0 }} / 4 玩家
                    </div>
                    <p class="text-gray-500">需要4名玩家才能开始游戏</p>
                </div>
            </div>

            <!-- 游戏结束状态 -->
            <div v-else-if="gameStatus === 'ended' && gameState"
                class="flex flex-col items-center justify-center flex-1 p-4 overflow-auto">
                <div class="text-center w-full max-w-4xl">
                    <h2 class="mb-4 text-3xl font-bold">
                        {{ isWinner ? '🎉 恭喜你赢了！' : '游戏结束' }}
                    </h2>
                    <p class="mb-4 text-lg">
                        <template v-if="gameState.winner">
                            {{ getPlayerName(gameState.winner) }}
                            {{ gameState.winType === 'zimo' ? '自摸' : '点炮' }} {{ winningTile }} 胡牌
                            <span v-if="dianpaoPlayer" class="text-red-500">
                                （{{ getPlayerName(dianpaoPlayer) }} 放炮）
                            </span>
                        </template>
                        <template v-else>
                            流局
                        </template>
                    </p>

                    <!-- 所有玩家手牌展示 -->
                    <div class="mt-6 space-y-4">
                        <h3 class="text-xl font-semibold mb-4">玩家手牌</h3>
                        <div v-for="playerId in gameState.playerOrder" :key="playerId"
                            class="bg-base-200 rounded-lg p-3 text-left" :class="{
                                'ring-2 ring-yellow-400': gameState.winner === playerId,
                                'ring-2 ring-red-400': dianpaoPlayer === playerId
                            }">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="font-medium">{{ getPlayerName(playerId) }}</span>
                                <span v-if="gameState.winner === playerId"
                                    class="badge badge-success badge-sm">胡牌</span>
                                <span v-if="dianpaoPlayer === playerId" class="badge badge-error badge-sm">放炮</span>
                                <span v-if="isDealer(playerId)" class="badge badge-warning badge-xs">庄</span>
                            </div>
                            <!-- 手牌 -->
                            <div class="flex gap-1 flex-wrap">
                                <MahjongTile v-for="tile in getPlayerData(playerId)?.tiles || []" :key="tile.id"
                                    :tile="tile" size="sm" 
                                    :highlight="winningTile" />
                            </div>
                            <!-- 副露 -->
                            <div v-if="getPlayerData(playerId)?.melds?.length" class="flex gap-2 mt-2 flex-wrap">
                                <div v-for="(meld, idx) in getPlayerData(playerId)?.melds" :key="idx"
                                    class="flex gap-0.5 bg-base-300 rounded p-1">
                                    <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" size="xs"
                                        :hidden="meld.type === 'gang_an'" />
                                    <span class="text-xs text-gray-500 ml-1 self-end">{{ getMeldTypeName(meld.type)
                                        }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p class="mt-6 text-gray-600">等待玩家准备开始新游戏</p>
                </div>
            </div>

            <!-- 游戏进行中 -->
            <div v-else-if="isPlaying && gameState" class="flex flex-col flex-1 min-h-0 p-2 md:p-4">
                <!-- 游戏信息栏 -->
                <div class="flex justify-between items-center mb-2 px-2">
                    <div class="text-sm text-gray-500">
                        剩余: {{ wallRemaining }} 张
                    </div>
                    <div v-if="currentTimer !== null" class="text-sm font-bold"
                        :class="currentTimer <= 5 ? 'text-red-500' : 'text-blue-500'">
                        ⏱ {{ currentTimer }}s
                    </div>
                </div>

                <!-- 游戏桌面 -->
                <div class="relative rounded-lg  flex-1 min-h-[400px] p-4 overflow-hidden">
                    <!-- 对家（上方） -->
                    <div class="absolute top-2 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                        <div v-if="otherPlayers[1]" class="text-center">
                            <div class="flex items-center gap-1 mb-1">
                                <span class=" text-sm font-medium">{{ getPlayerName(otherPlayers[1]) }}</span>
                                <span v-if="isDealer(otherPlayers[1])" class="badge badge-warning badge-xs">庄</span>
                                <span v-if="isPlayerCurrentTurn(otherPlayers[1])"
                                    class="badge badge-primary badge-xs animate-pulse">出牌</span>
                            </div>
                            <!-- 对家手牌（隐藏） -->
                            <div class="flex gap-0.5 justify-center">
                                <template v-if="getPlayerData(otherPlayers[1])">
                                    <div v-for="n in getPlayerData(otherPlayers[1])?.tileCount || 0" :key="n"
                                        class="w-5 h-7 bg-pk-700 border border-pk-600 rounded-sm"></div>
                                </template>
                            </div>
                            <!-- 对家副露 -->
                            <div v-if="getPlayerData(otherPlayers[1])?.melds?.length"
                                class="flex gap-1 justify-center mt-1">
                                <div v-for="(meld, idx) in getPlayerData(otherPlayers[1])?.melds" :key="idx"
                                    class="flex gap-0.5">
                                    <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" size="xs" />
                                </div>
                            </div>
                            <!-- 对家打出的牌 -->
                            <div class="flex flex-wrap gap-0.5 justify-center mt-1 max-w-48">
                                <MahjongTile v-for="tile in (getPlayerData(otherPlayers[1])?.discards || []).slice(-12)"
                                    :key="tile.id" :tile="tile" size="xs" />
                            </div>
                        </div>
                    </div>

                    <!-- 左家（左侧） -->
                    <div class="absolute left-2 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
                        <div v-if="otherPlayers[2]" class="text-center">
                            <div class="flex items-center gap-1 mb-1">
                                <span class="  text-sm font-medium">{{ getPlayerName(otherPlayers[2])
                                    }}</span>
                                <span v-if="isDealer(otherPlayers[2])" class="badge badge-warning badge-xs">庄</span>
                                <span v-if="isPlayerCurrentTurn(otherPlayers[2])"
                                    class="badge badge-primary badge-xs animate-pulse">出牌</span>
                            </div>
                            <!-- 左家手牌 -->
                            <div class="flex flex-col gap-0.5 items-center">
                                <template v-if="getPlayerData(otherPlayers[2])">
                                    <div v-for="n in Math.min(getPlayerData(otherPlayers[2])?.tileCount || 0, 7)"
                                        :key="n" class="w-5 h-7 bg-pk-700 border border-pk-600 rounded-sm"></div>
                                </template>
                            </div>
                            <!-- 左家副露 -->
                            <div v-if="getPlayerData(otherPlayers[2])?.melds?.length" class="flex flex-col gap-1 mt-1">
                                <div v-for="(meld, idx) in getPlayerData(otherPlayers[2])?.melds" :key="idx"
                                    class="flex gap-0.5">
                                    <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" size="xs" />
                                </div>
                            </div>
                            <!-- 左家打出的牌 -->
                            <div class="flex flex-wrap gap-0.5 justify-center mt-1 max-w-24">
                                <MahjongTile v-for="tile in (getPlayerData(otherPlayers[2])?.discards || []).slice(-8)"
                                    :key="tile.id" :tile="tile" size="xs" />
                            </div>
                        </div>
                    </div>

                    <!-- 右家（右侧） -->
                    <div class="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
                        <div v-if="otherPlayers[0]" class="text-center">
                            <div class="flex items-center gap-1 mb-1">
                                <span class=" text-sm font-medium">{{ getPlayerName(otherPlayers[0]) }}</span>
                                <span v-if="isDealer(otherPlayers[0])" class="badge badge-warning badge-xs">庄</span>
                                <span v-if="isPlayerCurrentTurn(otherPlayers[0])"
                                    class="badge badge-primary badge-xs animate-pulse">出牌</span>
                            </div>
                            <!-- 右家手牌 -->
                            <div class="flex flex-col gap-0.5 items-center">
                                <template v-if="getPlayerData(otherPlayers[0])">
                                    <div v-for="n in Math.min(getPlayerData(otherPlayers[0])?.tileCount || 0, 7)"
                                        :key="n" class="w-5 h-7 bg-pk-700 border border-pk-600 rounded-sm"></div>
                                </template>
                            </div>
                            <!-- 右家副露 -->
                            <div v-if="getPlayerData(otherPlayers[0])?.melds?.length" class="flex flex-col gap-1 mt-1">
                                <div v-for="(meld, idx) in getPlayerData(otherPlayers[0])?.melds" :key="idx"
                                    class="flex gap-0.5">
                                    <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" size="xs" />
                                </div>
                            </div>
                            <!-- 右家打出的牌 -->
                            <div class="flex flex-wrap gap-0.5 justify-center mt-1 max-w-24">
                                <MahjongTile v-for="tile in (getPlayerData(otherPlayers[0])?.discards || []).slice(-8)"
                                    :key="tile.id" :tile="tile" size="xs" />
                            </div>
                        </div>
                    </div>

                    <!-- 中央区域：最后打出的牌 -->
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div v-if="lastDiscard" class="flex flex-col items-center">
                            <MahjongTile :tile="lastDiscard" size="lg" />
                            <span class="text-white text-xs mt-1">{{ getPlayerName(lastDiscardPlayer || '') }}</span>
                        </div>
                    </div>
                </div>

                <!-- 自己的信息和手牌区域 -->
                <div v-if="isPlayer" class="mt-4 p-4 rounded-lg bg-base-200">
                    <!-- 玩家信息 -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="font-medium">我</span>
                            <span v-if="isDealer(roomPlayer.id)" class="badge badge-warning badge-sm">庄</span>
                            <span v-if="isCurrentPlayer" class="badge badge-primary badge-sm animate-pulse">轮到你</span>
                        </div>
                        <div class="flex items-center gap-2 text-sm text-gray-500">
                            <span>手牌: {{ myHand.length + (drawTile ? 1 : 0) }} 张</span>
                        </div>
                    </div>

                    <!-- 我的副露 -->
                    <div v-if="myMelds.length" class="flex gap-2 mb-2 flex-wrap">
                        <div v-for="(meld, idx) in myMelds" :key="idx" class="flex gap-0.5 bg-base-300 rounded p-1">
                            <MahjongTile v-for="tile in meld.tiles" :key="tile.id" :tile="tile" size="sm"
                                :hidden="meld.type === 'gang_an'" />
                            <span class="text-xs text-gray-500 ml-1 self-end">{{ getMeldTypeName(meld.type) }}</span>
                        </div>
                    </div>

                    <!-- 可用操作按钮 -->
                    <div v-if="availableActions.length > 0" class="mb-3 flex gap-2 flex-wrap">
                        <template v-for="(action, idx) in availableActions" :key="idx">
                            <button v-if="action.type === 'hu'" @click="doAction('hu')" class="btn btn-error btn-sm">
                                胡牌
                            </button>
                            <button v-else-if="action.type === 'gang'" @click="doAction('gang', action.tiles)"
                                class="btn btn-warning btn-sm">
                                杠 {{ action.tiles?.[0]?.display || action.targetTile?.display }}
                            </button>
                            <button v-else-if="action.type === 'peng'" @click="doAction('peng')"
                                class="btn btn-info btn-sm">
                                碰 {{ action.targetTile?.display }}
                            </button>
                            <button v-else-if="action.type === 'chi'" @click="doAction('chi', action.tiles)"
                                class="btn btn-success btn-sm">
                                吃 {{action.tiles?.map(t => t.display).join('')}}{{ action.targetTile?.display }}
                            </button>
                        </template>
                        <button @click="passAction" class="btn btn-ghost btn-sm">
                            过
                        </button>
                    </div>

                    <!-- 手牌显示 -->
                    <div class="flex gap-1 flex-wrap justify-center">
                        <!-- 主手牌 -->
                        <MahjongTile v-for="tile in myHand" :key="tile.id" :tile="tile"
                            :selected="selectedTileId === tile.id" :selectable="canDiscard" size="md"
                            @click="selectTile(tile)" />
                        <!-- 分隔 -->
                        <div v-if="drawTile" class="w-2"></div>
                        <!-- 摸到的牌 -->
                        <MahjongTile v-if="drawTile" :tile="drawTile" :selected="selectedTileId === drawTile.id"
                            :selectable="canDiscard" size="md" class="ring-2 ring-yellow-400"
                            @click="selectTile(drawTile)" />
                    </div>

                    <!-- 出牌按钮 -->
                    <div v-if="canDiscard && selectedTileId" class="mt-3 flex justify-center">
                        <button @click="discardSelectedTile" class="btn btn-primary">
                            打出选中的牌
                        </button>
                    </div>

                    <!-- 我打出的牌 -->
                    <div v-if="myDiscards.length" class="mt-3 pt-3 border-t border-base-300">
                        <div class="text-xs text-gray-500 mb-1">已打出的牌:</div>
                        <div class="flex gap-0.5 flex-wrap">
                            <MahjongTile v-for="tile in myDiscards" :key="tile.id" :tile="tile" size="xs" />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 侧边栏 -->
        <aside
            class="w-full md:w-80 flex-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
            <section class="inline-flex flex-col gap-2 max-h-1/2 overflow-auto">
                <div role="tablist" class="tabs tabs-lift">
                    <a role="tab" class="tab tooltip tooltip-bottom" :class="{ 'tab-active': activeTab === 'players' }"
                        @click="activeTab = 'players'">
                        <Icon icon="fluent:people-16-filled" />
                        <span class="ml-2">玩家</span>
                    </a>
                    <a v-if="Object.keys(achievements).length > 0" role="tab" class="tab tooltip tooltip-bottom"
                        :class="{ 'tab-active': activeTab === 'achievements' }" @click="activeTab = 'achievements'">
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
                                <span v-if="gameState && isDealer(p.id)" class="badge badge-warning badge-xs">庄</span>
                            </span>
                            <span v-else>[围观中]</span>
                            <span>{{ p.name }}</span>
                        </template>
                    </PlayerList>
                </div>

                <hr class="border-base-content/20" />
            </section>

            <GameChat>
                <template #rules>
                    <ul class="space-y-2 text-sm">
                        <li>1. 四人游戏，每人起手13张牌</li>
                        <li>2. 可吃可碰可杠（明杠、暗杠、补杠）</li>
                        <li>3. 推倒即胡（无需特定番种）</li>
                        <li>4. 自摸：其他三家各付分</li>
                        <li>5. 点炮：放炮者付全部分</li>
                    </ul>

                    <div class="divider my-2">操作说明</div>
                    <ul class="space-y-1 text-sm text-gray-600">
                        <li>• 单击选中手牌，再次单击确认出牌</li>
                        <li>• 或选中后点击"打出"按钮</li>
                        <li>• 吃碰杠胡时点击对应按钮</li>
                        <li>• 30秒超时自动出牌</li>
                    </ul>
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
import MahjongTile from './MahjongTile.vue'
import { useMahjong } from './useMahjong'
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
    selectedTileId,
    showNotification,
    notificationMessage,
    myHand,
    myMelds,
    myDiscards,
    drawTile,
    otherPlayers,
    isCurrentPlayer,
    isPlayer,
    isPlaying,
    canDiscard,
    availableActions,
    isWinner,
    wallRemaining,
    lastDiscard,
    lastDiscardPlayer,
    isCreator,
    dianpaoPlayer,
    winningTile,
    getPlayerName,
    getPlayerStatus,
    isPlayerCurrentTurn,
    isDealer,
    getPlayerData,
    selectTile,
    discardSelectedTile,
    doAction,
    passAction,
    getMeldTypeName,
    init,
} = useMahjong(props.game, props.roomPlayer)

onMounted(() => {
    init()
})
</script>

<style scoped>
/* 麻将背景 */
.bg-pk-700 {
    background: linear-gradient(135deg, #f0d0e1 0%, #f7e8f0 50%, #f8d8ea 100%);
}

.border-pk-600 {
    background-color: #f8eaf2;
}
</style>
