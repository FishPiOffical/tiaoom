<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4 pb-40 md:pb-4">
      <!-- 游戏主区域 -->
      <div class="relative inline-block bg-base-300 p-3 rounded-lg shadow-2xl m-auto select-none" @click="handleBoardClick">
        <!-- 游戏板 -->
        <div class="game-board bg-neutral rounded border-4 border-base-content/20 overflow-hidden">
          <div
            v-for="(row, y) in renderedBoardWithGhost"
            :key="y"
            class="board-row flex"
          >
            <div
              v-for="(cell, x) in row"
              :key="x"
              class="board-cell w-6 h-6 md:w-7 md:h-7 border border-base-content/10 relative"
              :class="{
                'filled': cell?.filled,
                'current': cell?.filled && gameState?.currentPiece &&
                  !(gameState.board[y] && gameState.board[y][x]?.filled) &&
                  !cell?.color?.startsWith('outline-'),
                'ghost': cell?.filled && cell?.color?.startsWith('outline-'),
                'clear-line': clearedLines.includes(y)
              }"
              :style="{ backgroundColor: cell?.filled && !cell?.color?.startsWith('outline-') ? getColorValue(cell.color) : 'transparent' }"
            >
              <!-- Ghost piece outline -->
              <div
                v-if="cell?.filled && cell?.color?.startsWith('outline-')"
                class="absolute inset-0 border-2 rounded-sm ghost-outline"
                :style="{ borderColor: getColorValue(cell.color.replace('outline-', '')) }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 游戏结束提示 -->
        <div v-if="gameState?.gameOver" class="absolute inset-0 bg-black/80 flex items-center justify-center rounded" @click.stop>
          <div class="text-center p-4">
            <h2 class="text-xl md:text-2xl font-bold text-error mb-2">游戏结束</h2>
            <p class="text-base-content mb-4">最终分数: {{ gameState.score }}</p>
            <button v-if="roomPlayer.role === 'player'" @click="restartGame" class="btn btn-primary">重新开始</button>
            <p v-else class="text-sm text-base-content/60 mt-2">观战模式</p>
          </div>
        </div>

        <!-- 暂停提示 -->
        <div v-else-if="gameState?.isPaused" class="absolute inset-0 bg-black/80 flex items-center justify-center rounded" @click.stop>
          <div class="text-center p-4">
            <h2 class="text-xl md:text-2xl font-bold text-warning mb-4">游戏暂停</h2>
            <button v-if="roomPlayer.role === 'player'" @click="pause" class="btn btn-primary">继续游戏</button>
            <p v-else class="text-sm text-base-content/60">观战模式</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 侧边栏 -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <div class="flex flex-col">
        <div role="tablist" class="tabs tabs-lift w-full">
          <a 
            role="tab" 
            class="tab flex-1" 
            :class="{ 'tab-active': activeTab === 'info' }"
            @click="activeTab = 'info'"
          >
            <Icon icon="bxs:game" />
            游戏信息
          </a>
          <a 
            role="tab" 
            class="tab flex-1" 
            :class="{ 'tab-active': activeTab === 'players' }"
            @click="activeTab = 'players'"
          >
            <Icon icon="fluent:people-16-filled" />
            玩家列表
          </a>
        </div>

        <div class="bg-base-100 border-base-300 rounded-b-box border-x border-b p-4 rounded-tr-box">
          <div v-show="activeTab === 'info'" class="flex flex-col gap-4">
            <h3 class="font-bold text-lg text-center">俄罗斯方块</h3>

            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-base-content/70">分数:</span>
                <span class="font-mono font-bold">{{ gameState?.score || 0 }}</span>
              </div>

              <div class="flex justify-between">
                <span class="text-base-content/70">等级:</span>
                <span class="font-mono font-bold">{{ gameState?.level || 1 }}</span>
              </div>

              <div class="flex justify-between">
                <span class="text-base-content/70">消行:</span>
                <span class="font-mono font-bold">{{ gameState?.lines || 0 }}</span>
              </div>
            </div>

            <!-- 下一个方块预览 -->
            <div class="mt-2">
              <h4 class="text-base-content/70 text-sm mb-2">下一个:</h4>
              <div class="preview-container bg-base-200 p-2 rounded flex items-center justify-center mx-auto" style="width: 120px; height: 120px;">
                <div class="preview-grid inline-block" v-if="renderedNextPiece">
                  <div
                    v-for="(row, y) in renderedNextPiece.shape"
                    :key="y"
                    class="preview-row flex"
                  >
                    <div
                      v-for="(cell, x) in row"
                      :key="x"
                      class="preview-cell w-5 h-5 border border-base-content/10 relative"
                      :class="{ filled: cell !== 0 }"
                    >
                      <div
                        v-if="cell !== 0"
                        class="absolute inset-0 rounded-sm"
                        :style="{ backgroundColor: getColorValue(renderedNextPiece.color), boxShadow: 'inset 2px 2px 4px oklch(var(--w) / 0.2), inset -2px -2px 4px oklch(var(--b) / 0.2)' }"
                      ></div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-sm text-base-content/50">加载中...</div>
              </div>
            </div>

            <!-- 控制按钮（只对玩家显示） -->
            <div class="flex flex-col gap-2" v-if="roomPlayer.role === 'player'">
              <div class="flex gap-2">
                <button
                  v-if="!gameState?.gameOver && gameStatus === 'playing'"
                  @click="pause"
                  class="btn btn-secondary flex-1"
                >
                  {{ gameState?.isPaused ? '继续' : '暂停' }}
                </button>
                <button
                  v-if="gameStatus === 'playing' && !gameState?.gameOver"
                  @click="endGame"
                  class="btn btn-error flex-1"
                >
                  结束游戏
                </button>
              </div>
            </div>
            
            <!-- 观众提示 -->
            <div v-else class="alert alert-info">
              <Icon icon="mdi:eye" />
              <span>你正在观战中</span>
            </div>
          </div>

          <div v-show="activeTab === 'players'">
             <PlayerList :players="roomPlayer.room.players" />
          </div>
        </div>
      </div>

      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li v-if="roomPlayer.role === 'player'">1. ← → : 左右移动方块</li>
            <li v-if="roomPlayer.role === 'player'">2. ↑ : 旋转方块</li>
            <li v-if="roomPlayer.role === 'player'">3. ↓ : 加速下降</li>
            <li v-if="roomPlayer.role === 'player'">4. 空格 : 瞬间下落</li>
            <li v-if="roomPlayer.role === 'player'">5. P : 暂停/继续</li>
            <li v-if="roomPlayer.role === 'player'">6. WASD : 方向控制（不区分大小写）</li>
            <li>{{ roomPlayer.role === 'player' ? '7' : '1' }}. 消除多行可获得更高分数</li>
            <li class="text-error font-bold" v-if="roomPlayer.role === 'player'">8. 翻倍奖励：获得高于历史分数时，奖励入场积分，若未超过则将再次扣除入场积分。</li>
            <li v-if="roomPlayer.role === 'watcher'" class="text-warning">2. 作为观众，你无法控制游戏</li>
          </ul>
        </template>
      </GameChat>
    </aside>

    <!-- 移动端控制按钮 -->
    <div v-if="roomPlayer.role === 'player'" class="sticky bottom-0 left-0 right-0 p-4 pb-4 bg-base-200/90 backdrop-blur md:hidden z-50 flex flex-col gap-4 select-none touch-manipulation border-t border-base-content/10">
      <div class="flex justify-between items-end px-2 max-w-md mx-auto w-full">
        <!-- 方向控制 -->
        <div class="grid grid-cols-3 gap-2">
          <button class="btn btn-circle btn-lg btn-neutral shadow-lg active:scale-90 transition-transform" @click="moveLeft">
            <Icon icon="mdi:arrow-left-bold" class="text-3xl" />
          </button>
          <button class="btn btn-circle btn-lg btn-neutral shadow-lg active:scale-90 transition-transform" @click="moveDown">
            <Icon icon="mdi:arrow-down-bold" class="text-3xl" />
          </button>
          <button class="btn btn-circle btn-lg btn-neutral shadow-lg active:scale-90 transition-transform" @click="moveRight">
            <Icon icon="mdi:arrow-right-bold" class="text-3xl" />
          </button>
        </div>

        <!-- 动作控制 -->
        <div class="flex gap-3">
          <button class="btn btn-circle btn-lg btn-secondary shadow-lg active:scale-90 transition-transform" @click="drop">
            <Icon icon="mdi:elevator-down" class="text-3xl" />
          </button>
          <button class="btn btn-circle btn-lg btn-primary shadow-lg active:scale-90 transition-transform" @click="rotate">
            <Icon icon="mdi:rotate-right-variant" class="text-3xl" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTetris } from './useTetris'
import { getColorValue } from './utils'
import type { RoomPlayer, Room } from 'tiaoom/client'
import type { GameCore } from '@/core/game'

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const activeTab = ref<'info' | 'players'>('info')

const {
  gameStatus,
  gameState,
  renderedBoardWithGhost,
  renderedNextPiece,
  pause,
  restartGame,
  endGame,
  clearedLines,
  moveLeft,
  moveRight,
  moveDown,
  rotate,
  drop
} = useTetris(props.game, props.roomPlayer)

// 点击游戏板暂停/继续（只对玩家生效）
function handleBoardClick() {
  // 只有玩家且在游戏中且未结束时才能暂停
  if (props.roomPlayer.role === 'player' && gameStatus.value === 'playing' && !gameState.value?.gameOver) {
    pause()
  }
}
</script>

<style scoped>
.board-cell.filled {
  border-color: oklch(var(--bc) / 0.3);
  box-shadow: inset 2px 2px 4px oklch(var(--w) / 0.2),
    inset -2px -2px 4px oklch(var(--b) / 0.2);
}

.board-cell.current {
  filter: brightness(1.1);
  position: relative;
  animation: fall 0.1s linear;
}

.ghost-outline {
  animation: ghost-pulse 2s infinite;
  border-style: dashed !important;
}

@keyframes ghost-pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

@keyframes lock {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* 消行动画 */
.clear-line {
  animation: clear 0.3s ease-out;
}

@keyframes clear {
  0% { background-color: oklch(var(--w)); opacity: 0.8; }
  100% { background-color: transparent; opacity: 1; }
}

/* 下落动画 */
@keyframes fall {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(0); }
}
</style>