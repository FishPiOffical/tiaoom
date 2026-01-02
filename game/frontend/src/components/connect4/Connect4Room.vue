<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center  overflow-auto p-4">
      <!-- 棋盘 -->
      <div class="relative inline-block bg-base-300 p-3 rounded-lg shadow-2xl m-auto select-none">
        <div class="grid grid-cols-[auto_max-content_auto]">
          <!-- 上方坐标 -->
          <div></div>
          <div class="flex pl-[4px] mb-1">
            <div v-for="i in 8" :key="i" class="flex items-center justify-center w-12 md:w-16 text-base-content/50 font-mono font-bold text-lg">
              {{ String.fromCharCode(64 + i) }}
            </div>
          </div>
          <div></div>

          <!-- 左侧坐标 -->
          <div class="flex flex-col pt-[4px] mr-1">
            <div v-for="i in 8" :key="i" class="flex items-center justify-center w-8 h-12 md:h-16 text-base-content/50 font-mono font-bold text-lg">
              {{ 9 - i }}
            </div>
          </div>

          <!-- 棋盘 -->
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
                      cell === 1 ? 'bg-black border border-white/20' : 'bg-white border border-black/20',
                      currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error' : ''
                    ]"
                  />
                </transition>

                <!-- 预览棋子 -->
                <span 
                  v-if="cell === 0 && hoverCol === colIndex && isMyTurn"
                  class="absolute w-10 h-10 md:w-14 md:h-14 rounded-full opacity-40"
                  :class="currentPlayer?.attributes.color === 1 ? 'bg-black' : 'bg-white'"
                />
              </div>
            </div>
          </div>

          <!-- 右侧坐标 -->
          <div class="flex flex-col pt-[4px] ml-1">
            <div v-for="i in 8" :key="i" class="flex items-center justify-center w-8 h-12 md:h-16 text-base-content/50 font-mono font-bold text-lg">
              {{ 9 - i }}
            </div>
          </div>

          <!-- 下方坐标 -->
          <div></div>
          <div class="flex pl-[4px] mt-1">
            <div v-for="i in 8" :key="i" class="flex items-center justify-center w-12 md:w-16 text-base-content/50 font-mono font-bold text-lg">
              {{ String.fromCharCode(64 + i) }}
            </div>
          </div>
          <div></div>
        </div>
      </div>
      
      <!-- 当前回合 -->
      <div v-if="gameStatus === 'playing'" class="flex items-center justify-center gap-3 mt-4 text-lg">
        <div class="w-6 h-6 flex items-center justify-center bg-surface-light rounded-full border border-base-content/20">
          <span 
            class="w-5 h-5 rounded-full"
            :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-white/20' : 'bg-white border border-black/20'"
          />
        </div>
        <b class="text-base-content">{{ currentPlayer?.name }}</b>
      </div>
    </section>
    
    <!-- 侧边栏 -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
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
                <template v-if="p.attributes.color ?? false">
                  <div class="w-4 h-4 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
                    <span 
                      class="w-full h-full rounded-full"
                      :class="p.attributes.color === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
                    />
                  </div>
                </template>
              </span>
              <span v-else>[围观中]</span>
              <span>{{ p.name }}</span>
            </template>
          </PlayerList>
        </div>
        
        <!-- 操作按钮 -->
        <div v-if="isPlaying && roomPlayer.role === PlayerRole.player" class="group flex gap-2">
          <button class="btn" 
            @click="requestDraw"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            请求和棋
          </button>
          <button class="btn" 
            @click="requestLose"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            认输
          </button>
        </div>
        
        <hr class="border-base-content/20" />
        
      </section>
      
      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. 双方轮流在任意一列落子，棋子会落到该列最下方。</li>
            <li>2. 先在横、竖、斜方向连成4子者获胜。</li>
            <li>3. 若棋盘填满仍未分胜负，则为平局。</li>
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
import { useConnect4 } from './useConnect4';
import AchievementTable from '@/components/common/AchievementTable.vue';
import Icon from '@/components/common/Icon.vue';
import { ref } from 'vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const activeTab = ref<'players' | 'achievements'>('players')

const {
  isPlaying,
  achievements,
  gameStatus,
  currentPlayer,
  board,
  currentPlace,
  hoverCol,
  isMyTurn,
  handleColumnClick,
  requestDraw,
  requestLose,
} = useConnect4(props.game, props.roomPlayer)


function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting') return '准备好了'
  if (p.id === currentPlayer.value?.id) return '思考中'
  if (gameStatus.value === 'playing') return '等待中'
  return '准备好了'
}

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
