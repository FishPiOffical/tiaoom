<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4">
      <!-- 棋盘 -->
      <div class="inline-block bg-base-300 border border-base-content/20 p-2 rounded shadow-2xl m-auto">
        <!-- 顶部横坐标 (A-H) -->
        <div class="flex">
          <div class="w-[10vw] md:w-8 h-[8] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
          <div v-for="colIndex in 8" :key="'col-top-' + colIndex" 
               class="w-[10vw] md:w-8 h-[8] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60">
            {{ String.fromCharCode(64 + colIndex) }}
          </div>
          <div class="w-[10vw] md:w-8 h-[8] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
        </div>
        
        <!-- 棋盘行 -->
        <div v-for="(row, rowIndex) in board" :key="rowIndex" class="flex">
          <!-- 左侧纵坐标 (8-1) -->
          <div class="w-[10vw] md:w-8 h-[10vw] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60">
            {{ 8 - rowIndex }}
          </div>
          <div 
            v-for="(cell, colIndex) in row" 
            :key="colIndex" 
            @click="placePiece(rowIndex, colIndex)" 
            class="relative w-[10vw] h-[10vw] md:w-8 md:h-8 flex items-center justify-center border border-base-content/10"
            :class="{ 
              'cursor-pointer group': currentPlayer?.id === roomPlayer.id && cell === 0,
              'cursor-not-allowed': currentPlayer?.id === roomPlayer.id && cell !== 0
            }"
          >
            <span 
              class="group-hover:inline hidden opacity-80 w-[9vw] h-[9vw] md:w-7 md:h-7 rounded-full transition-all duration-500 z-10" 
              :class="[currentPlayer?.attributes?.color === 1 ? 'black-piece border border-base-content/20 shadow-lg' : 'white-piece shadow-lg']">
            </span>
            <span 
              v-if="cell > 0"
              class="w-[9vw] h-[9vw] md:w-7 md:h-7 rounded-full transition-all duration-500 z-10"
              :class="[
                cell === 1 ? 'black-piece border border-base-content/20 shadow-lg' : 'white-piece shadow-lg',
                currentPlace?.x === rowIndex && currentPlace?.y === colIndex ? 'ring-2 ring-error scale-105' : ''
              ]"
            />
            <div 
              v-if="cell === 0 && (currentPlayer?.id === roomPlayer.id || roomPlayer.role !== 'player')" 
              class="absolute w-2 h-2 rounded-full bg-base-content/30"
            ></div>
          </div>
          <!-- 右侧纵坐标 (8-1) -->
          <div class="w-[10vw] md:w-8 h-[10vw] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60">
            {{ 8 - rowIndex }}
          </div>
        </div>
        
        <!-- 底部横坐标 (A-H) -->
        <div class="flex">
          <div class="w-[10vw] md:w-8 h-[8] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
          <div v-for="colIndex in 8" :key="'col-bottom-' + colIndex" 
               class="w-[10vw] md:w-8 h-[8] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60">
            {{ String.fromCharCode(64 + colIndex) }}
          </div>
          <div class="w-[10vw] md:w-8 h-[8] md:h-8 flex items-center justify-center text-xs font-bold text-base-content/60"></div>
        </div>
      </div>
      
      <!-- 当前回合 -->
      <div v-if="gameStatus === 'playing'" class="flex items-center justify-center gap-3 mt-4 text-lg p-1">
        <div class="w-6 h-6 flex items-center justify-center bg-base-300 rounded-full border border-base-content/20">
          <span 
            class="w-full h-full rounded-full"
            :class="currentPlayer?.attributes.color === 1 ? 'bg-black border border-white/20 shadow-md' : 'bg-white border border-black/20 shadow-md'"
          />
        </div>
        <b class="text-base-content">{{ currentPlayer?.name }}</b>
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
          <a v-if="Object.keys(achivents).length > 0" role="tab" class="tab tooltip tooltip-bottom" :class="{ 'tab-active': activeTab === 'achievements' }" @click="activeTab = 'achievements'">
            <Icon icon="ri:sword-fill" />
            <span class="ml-2">战绩</span>
          </a>
        </div>

        <!-- 成就表 -->
        <div v-show="activeTab === 'achievements'">
          <AchievementTable :achievements="achivents" show-draw />
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
                  <span>{{ board.flat().filter(b => b == p.attributes.color).length }}</span>
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
            <li>1. 双方轮流落子，落子时必须夹住对方棋子。</li>
            <li>2. 被夹住的对方棋子会翻转为己方颜色。</li>
            <li>3. 若无处可落子，则跳过回合。</li>
            <li>4. 棋盘填满或双方均无处落子时游戏结束，棋子多者获胜。</li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { PlayerRole, Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useOthello } from './useOthello';
import AchievementTable from '@/components/common/AchievementTable.vue';
import Icon from '@/components/common/Icon.vue';
import { ref } from 'vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const activeTab = ref<'players' | 'achievements'>('players')

const {
  gameStatus,
  currentPlayer,
  board,
  currentPlace,
  achivents,
  placePiece,
  requestDraw,
  requestLose,
  isPlaying,
} = useOthello(props.game, props.roomPlayer)

function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (props.roomPlayer.room.status === 'waiting') return '准备好了'
  if (p.id === currentPlayer.value?.id) return '思考中'
  if (props.roomPlayer.room.status === 'playing') return '等待中'
  return '准备好了'
}

</script>
<style scoped>
  .piece {
    transition: background 0.5s, transform 0.5s;
  }
  .white-piece {
    background: white;
    color: black;
    transform: rotateY(0deg);
    border: 1px solid rgba(0,0,0,0.2);
  }
  .black-piece {
    background: black;
    color: white;
    transform: rotateY(180deg);
    border: 1px solid rgba(255,255,255,0.2);
  }
  .row .cell::after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    border: 1px solid oklch(var(--bc) / 0.2);
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
    border-color: oklch(var(--su));
  }
</style>