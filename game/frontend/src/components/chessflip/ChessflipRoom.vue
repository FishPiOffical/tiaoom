<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4 select-none">
      <!-- 阵营信息 -->
      <div v-if="myCamp" class="mb-4 flex items-center gap-2 text-lg">
        <span>我的阵营：</span>
        <span
          class="font-bold px-2 py-1 rounded"
          :class="myCamp === 'red' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'"
        >
          {{ myCamp === 'red' ? '红方' : '黑方' }}
        </span>
      </div>

      <!-- 棋盘 -->
      <div class="inline-block bg-amber-100 border-4 border-amber-800 p-2 rounded shadow-2xl">
        <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
          <div
            v-for="(cell, colIndex) in row"
            :key="colIndex"
            @click="handleCellClick(rowIndex, colIndex)"
            class="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center border border-amber-700 bg-amber-50 cursor-pointer hover:bg-amber-200 transition-colors"
            :class="{
              'ring-2 ring-blue-500 ring-offset-2': selectedCell?.x === rowIndex && selectedCell?.y === colIndex,
              'bg-yellow-200': (lastMoveFrom?.x === rowIndex && lastMoveFrom?.y === colIndex) || (lastMoveTo?.x === rowIndex && lastMoveTo?.y === colIndex),
            }"
          >
            <!-- 吃子爆炸效果 -->
            <div
              v-if="capturedCell?.x === rowIndex && capturedCell?.y === colIndex"
              class="absolute inset-0 animate-ping bg-red-400/50 rounded-full"
            ></div>

            <!-- 棋子 -->
            <div
              v-if="cell"
              class="w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold shadow-lg border-2 transition-all duration-300"
              :class="[
                cell.isOpen
                  ? (cell.side === 'red'
                      ? 'bg-red-100 border-red-600 text-red-600'
                      : 'bg-gray-100 border-gray-800 text-gray-800')
                  : 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-900 text-amber-200',
                cell.side === myCamp && cell.isOpen ? 'ring-2 ring-offset-1 ring-green-400' : '',
                flippingCell?.x === rowIndex && flippingCell?.y === colIndex ? 'animate-flip' : ''
              ]"
            >
              <span v-if="cell.isOpen">{{ cell.name }}</span>
              <span v-else class="text-2xl">?</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 当前回合信息 -->
      <div v-if="isPlaying" class="mt-4 flex items-center gap-3 text-lg">
        <template v-if="isFirstFlip">
          <span class="text-warning">等待翻棋确定阵营...</span>
        </template>
        <template v-else>
          <span
            class="w-4 h-4 rounded-full"
            :class="currentPlayer?.attributes?.camp === 'red' ? 'bg-red-500' : 'bg-gray-800'"
          ></span>
          <span class="font-bold">{{ currentPlayer?.name }}</span>
          <span :class="isMyTurn ? 'text-success' : 'text-base-content/60'">
            {{ isMyTurn ? '你的回合' : '对方回合' }}
          </span>
        </template>
      </div>

      <!-- 操作提示 -->
      <div v-if="isPlaying && isMyTurn" class="mt-2 text-sm text-base-content/60">
        <template v-if="isFirstFlip || !myCamp">
          点击任意棋子翻开，确定你的阵营
        </template>
        <template v-else-if="selectedCell">
          已选中棋子，点击目标位置移动或吃子
        </template>
        <template v-else>
          点击己方棋子选中，或点击暗棋翻开
        </template>
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

        <!-- 成就表 -->
        <div v-show="activeTab === 'achievements'">
          <AchievementTable :achievements="achievements" show-draw />
        </div>

        <!-- 玩家列表 -->
        <div v-show="activeTab === 'players'">
          <PlayerList :players="roomPlayer.room.players">
            <template #default="{ player: p }">
              <span v-if="p.role === 'player'" class="inline-flex gap-2 items-center">
                <span>[{{ getPlayerStatus(p) }}]</span>
                <template v-if="p.attributes?.camp">
                  <span
                    class="w-4 h-4 rounded-full"
                    :class="p.attributes.camp === 'red' ? 'bg-red-500' : 'bg-gray-800'"
                  ></span>
                </template>
              </span>
              <span v-else>[围观中]</span>
              <span>{{ p.name }}</span>
            </template>
          </PlayerList>
        </div>

        <!-- 操作按钮 -->
        <div v-if="isPlaying && roomPlayer.role === PlayerRole.player" class="group flex gap-2">
          <button
            class="btn"
            @click="requestDraw"
            :disabled="!isMyTurn"
          >
            请求和棋
          </button>
          <button
            class="btn"
            @click="requestLose"
            :disabled="!isMyTurn"
          >
            认输
          </button>
        </div>

        <hr class="border-base-content/20" />

      </section>

      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. 32枚棋子随机暗置于4×8棋盘。</li>
            <li>2. 首次翻棋确定阵营（红/黑）。</li>
            <li>3. 每回合可翻一枚暗棋或移动一枚己方明棋。</li>
            <li>4. 棋子只能横/竖走1格（炮吃子除外）。</li>
            <li>5. 吃子规则（按等级）：
              <ul class="pl-4 mt-1 list-disc">
                <li>士 &gt; 相 &gt; 车 &gt; 马 &gt; 炮 &gt; 帅/将 &gt; 兵</li>
                <li>兵/卒只能吃帅/将</li>
                <li>帅/将不能吃兵/卒</li>
                <li>炮需隔1子才能吃（可隔暗棋）</li>
              </ul>
            </li>
            <li>6. 吃光对方所有棋子获胜。</li>
            <li>7. 连续50步无翻棋/吃子判和。</li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { PlayerRole, type RoomPlayer, type Room } from 'tiaoom/client';
import type { GameCore } from '@/core/game'
import GameChat from '@/components/common/GameChat.vue'
import { useChessflip } from './useChessflip';
import AchievementTable from '@/components/common/AchievementTable.vue';
import PlayerList from '@/components/common/PlayerList.vue';
import Icon from '@/components/common/Icon.vue';
import { ref } from 'vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const activeTab = ref<'players' | 'achievements'>('players')

const {
  isPlaying,
  isMyTurn,
  currentPlayer,
  board,
  achievements,
  myCamp,
  isFirstFlip,
  selectedCell,
  flippingCell,
  capturedCell,
  lastMoveFrom,
  lastMoveTo,
  handleCellClick,
  requestDraw,
  requestLose,
} = useChessflip(props.game, props.roomPlayer)

function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (!isPlaying.value) return '准备好了'
  if (p.id === currentPlayer.value?.id) return '思考中'
  if (isPlaying.value) return '等待中'
  return '准备好了'
}
</script>

<style scoped>
/* 翻棋动画 */
@keyframes flip {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(90deg);
  }
  100% {
    transform: rotateY(0deg);
  }
}

.animate-flip {
  animation: flip 0.3s ease-in-out;
}
</style>
