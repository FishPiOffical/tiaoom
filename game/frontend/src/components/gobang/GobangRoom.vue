<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4 select-none">
      <!-- 棋盘 -->
      <div class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto relative">
        <div v-if="isSealed" class="absolute inset-0 z-50 bg-base-100/50 backdrop-blur-sm flex items-center justify-center rounded">
          <div class="text-center">
            <div class="text-2xl font-bold mb-2">已封盘</div>
            <div class="text-sm opacity-60">请等待请求者解除封盘</div>
            <button 
              v-if="sealRequesterId === roomPlayer.id"
              class="btn btn-primary mt-4" 
              @click="unseal"
            >
              解除封盘
            </button>
          </div>
        </div>
        <!-- 顶部留白 -->
        <div class="flex">
          <div class="w-[6vw] md:w-7 h-[6vw] md:h-7"></div>
          <div v-for="col in 19" :key="col" class="w-[6vw] md:w-7 h-[6vw] md:h-7"></div>
          <div class="w-[6vw] md:w-7 h-[6vw] md:h-7"></div>
        </div>
        
        <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
          <!-- 左侧数字坐标 -->
          <div class="w-[6vw] md:w-7 h-[6vw] md:h-7 flex items-center justify-center text-base-content/30 text-xs md:text-xs">
            {{ 19 - rowIndex }}
          </div>
          
          <!-- 棋盘格子 -->
          <div 
            v-for="(cell, colIndex) in row" 
            :key="colIndex"
            :data-pos="`${rowIndex}-${colIndex}`"
            @click="placePiece(rowIndex, colIndex)" 
            class="relative w-[6vw] h-[6vw] md:w-7 md:h-7 flex items-center justify-center"
            :class="{ 'cursor-pointer': currentPlayer?.id === roomPlayer.id && cell === 0 }"
          >
            <!-- 棋盘网格线 -->
            <div class="absolute bg-base-content/30 h-px top-1/2 -translate-y-1/2 z-0"
              :class="[
                colIndex === 0 ? 'left-1/2 w-1/2' : (colIndex === row.length - 1 ? 'left-0 w-1/2' : 'left-0 w-full')
              ]"
            ></div>
            <div class="absolute bg-base-content/30 w-px left-1/2 -translate-x-1/2 z-0"
              :class="[
                rowIndex === 0 ? 'top-1/2 h-1/2' : (rowIndex === board.length - 1 ? 'top-0 h-1/2' : 'top-0 h-full')
              ]"
            ></div>
            <div v-if="[3, 9, 15].includes(rowIndex) && [3, 9, 15].includes(colIndex)" class="absolute w-1.5 h-1.5 bg-base-content/80 rounded-full z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            
            <!-- 棋子 -->
            <span 
              v-if="cell > 0 && !isSealed"
              class="w-[4.5vw] h-[4.5vw] md:w-6 md:h-6 rounded-full z-10 relative transition-all duration-200"
              :class="[
                cell === 1 ? 'bg-black border border-white/20 shadow-lg' : 'bg-white border border-black/20 shadow-lg',
                currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error scale-90' : ''
              ]"
            />
          </div>
          
          <!-- 右侧留白 -->
          <div class="w-[6vw] md:w-7 h-[6vw] md:h-7"></div>
        </div>
        
        <!-- 底部字母坐标 -->
        <div class="flex">
          <div class="w-[6vw] md:w-7"></div>
          <div v-for="col in 19" :key="col" class="w-[6vw] md:w-7 h-[6vw] md:h-7 flex items-center justify-center text-base-content/30 text-xs md:text-xs">
            {{ String.fromCharCode(64 + col) }}
          </div>
          <div class="w-[6vw] md:w-7"></div>
        </div>
      </div>
      
      <!-- 当前回合 -->
      <div v-if="isPlaying" class="flex items-center justify-center gap-3 mt-4 text-lg">
        <div class="w-5 h-5 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
          <span 
            class="w-4 h-4 rounded-full"
            :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
          />
        </div>
        <b class="text-base-content">{{ currentPlayer?.name }}</b>
        <span class="text-xs bg-base-content/10 px-2 py-1 rounded" :class="{ 'text-error': timer < 10 }">
          {{ timerStr }}
        </span>
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
          <button class="btn" 
            @click="requestSeal"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            请求封盘
          </button>
        </div>
        
        <hr class="border-base-content/20" />

        <div class="px-2 text-xs text-base-content/60 flex items-center gap-2">
          <Icon icon="mdi:clock-outline" />
          <span>计时规则：{{ countDownText }}</span>
        </div>
        
      </section>
      
      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. 双方轮流在棋盘交叉点落子。</li>
            <li>2. 先在横、竖、斜方向连成5子者获胜。</li>
            <li>3. 若棋盘填满仍未分胜负，则为平局。</li>
            <li>4. 黑方（先手）实行禁手规则：
              <ul class="pl-4 mt-1 list-disc">
                <li>三三禁手：两个或两个以上的活三。</li>
                <li>四四禁手：两个或两个以上的冲四或活四。</li>
                <li>长连禁手：连成六个或六个以上。</li>
              </ul>
            </li>
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
import { useGobang } from './useGobang';
import AchievementTable from '@/components/common/AchievementTable.vue';
import Icon from '@/components/common/Icon.vue';
import { ref, computed } from 'vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const activeTab = ref<'players' | 'achievements'>('players')

const countDownText = computed(() => {
  const way = props.roomPlayer.room.attrs?.countDownWay ?? 1
  switch (way) {
    case 0: return '不计时'
    case 1: return '每步限时 60s'
    case 2: return '每人总限时 15m'
    default: return '每步限时 60s'
  }
})

const {
  isPlaying,
  achievements,
  requestSeal,
  unseal,
  timer,
  timerStr,
  isSealed,
  sealRequesterId,
  currentPlace,
  currentPlayer,
  board,
  placePiece,
  requestDraw,
  requestLose,
} = useGobang(props.game, props.roomPlayer)


function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (!isPlaying.value) return '准备好了'
  if (p.id === currentPlayer.value?.id) return '思考中'
  if (isPlaying.value) return '等待中'
  return '准备好了'
}

</script>
