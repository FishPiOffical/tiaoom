<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4">
      <!-- 游戏主区域 -->
      <div class="relative inline-block bg-base-300 p-3 rounded-lg shadow-2xl m-auto select-none">
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
        <div v-if="gameState?.gameOver" class="absolute inset-0 bg-black/80 flex items-center justify-center rounded">
          <div class="text-center p-4">
            <h2 class="text-xl md:text-2xl font-bold text-error mb-2">游戏结束</h2>
            <p class="text-base-content mb-4">最终分数: {{ gameState.score }}</p>
            <button @click="restartGame" class="btn btn-primary">重新开始</button>
          </div>
        </div>

        <!-- 暂停提示 -->
        <div v-else-if="gameState?.isPaused" class="absolute inset-0 bg-black/80 flex items-center justify-center rounded">
          <div class="text-center p-4">
            <h2 class="text-xl md:text-2xl font-bold text-warning mb-4">游戏暂停</h2>
            <button @click="pause" class="btn btn-primary">继续游戏</button>
          </div>
        </div>
      </div>

      <!-- 移动端控制 -->
      <div class="md:hidden w-full max-w-md mt-4">
        <div class="grid grid-cols-3 gap-2">
          <div></div>
          <button @click="rotate" class="btn btn-secondary btn-lg">↻</button>
          <div></div>
          
          <button @click="moveLeft" class="btn btn-secondary btn-lg">←</button>
          <button @click="moveDown" class="btn btn-secondary btn-lg">↓</button>
          <button @click="moveRight" class="btn btn-secondary btn-lg">→</button>
          
          <div></div>
          <button @click="drop" class="btn btn-accent btn-lg">.DropDown</button>
          <div></div>
        </div>
      </div>
    </section>
    
    <!-- 侧边栏 -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <section class="inline-flex flex-col gap-2 max-h-1/2">
        <!-- 游戏信息面板 -->
        <div class="bg-base-100 rounded-box p-4 border border-base-content/10">
          <h3 class="font-bold text-lg mb-3 text-center">俄罗斯方块</h3>
          
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
          <div class="mt-4">
            <h4 class="text-base-content/70 text-sm mb-2">下一个:</h4>
            <div class="preview-grid inline-block bg-base-200 p-2 rounded" v-if="renderedNextPiece">
              <div
                v-for="(row, y) in renderedNextPiece.shape"
                :key="y"
                class="preview-row flex"
              >
                <div
                  v-for="(cell, x) in row"
                  :key="x"
                  class="preview-cell w-5 h-5 border border-base-content/10"
                  :class="{ filled: cell !== 0 }"
                  :style="{ backgroundColor: cell !== 0 ? getColorValue(renderedNextPiece.color) : 'transparent' }"
                />
              </div>
            </div>
          </div>
          
          <!-- 控制按钮 -->
          <div class="mt-4 flex flex-col gap-2">
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
        </div>

        <!-- 成就表 -->
        <section v-if="Object.keys(achievements).length" class="overflow-auto rounded-box border border-base-content/5 bg-base-100 max-h-50 min-h-30">
          <table class="table table-pin-rows table-pin-cols text-center">
            <thead>
              <tr>
                <th class="bg-base-300">玩家</th>
                <th class="bg-base-300">胜</th>
                <th class="bg-base-300">负</th>
                <th class="bg-base-300">和</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(achievement, playerName) in achievements" :key="playerName">
                <td class="">{{ playerName }}</td>
                <td class="">{{ achievement.win }}</td>
                <td class="">{{ achievement.lost }}</td>
                <td class="">{{ achievement.draw }}</td>
              </tr>
            </tbody>
          </table>
        </section>
        
        <hr v-if="Object.keys(achievements).length" class="border-border" />
        
        <!-- 玩家列表 -->
        <PlayerList :players="roomPlayer.room.players" />
        
        <!-- 操作按钮 -->
        <RoomControls
          :game="game"
          :room-player="roomPlayer"
          :game-status="gameStatus"
        />
        
        <hr class="border-base-content/20" />
      </section>
      
      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. ← → : 左右移动方块</li>
            <li>2. ↑ : 旋转方块</li>
            <li>3. ↓ : 加速下降</li>
            <li>4. 空格 : 瞬间下落</li>
            <li>5. P : 暂停/继续</li>
            <li>6. 消除多行可获得更高分数</li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { useTetris } from './useTetris'
import type { RoomPlayer, Room } from 'tiaoom/client'
import type { GameCore } from '@/core/game'

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  gameStatus,
  gameState,
  achievements,
  renderedBoardWithGhost,
  renderedNextPiece,
  moveLeft,
  moveRight,
  moveDown,
  rotate,
  drop,
  pause,
  restartGame,
  endGame,
  clearedLines
} = useTetris(props.game, props.roomPlayer)

// 获取颜色值的辅助函数
function getColorValue(colorClass: string) {
  // 如果已经是十六进制颜色值，直接返回
  if (colorClass.startsWith('#') || colorClass.startsWith('rgb')) {
    return colorClass
  }
  
  // 如果是CSS类名，映射为实际颜色值
  const colorMap: Record<string, string> = {
    'bg-cyan-500': '#00bcd4',
    'bg-blue-500': '#2196f3',
    'bg-orange-500': '#ff9800',
    'bg-yellow-500': '#ffeb3b',
    'bg-green-500': '#4caf50',
    'bg-purple-500': '#9c27b0',
    'bg-red-500': '#f44336',
    'bg-gray-500': '#9e9e9e'
  }
  
  return colorMap[colorClass] || '#9e9e9e'
}
</script>

<style scoped>
.board-cell.filled {
  border-color: rgba(0, 0, 0, 0.3);
  box-shadow: inset 2px 2px 4px rgba(255, 255, 255, 0.2),
    inset -2px -2px 4px rgba(0, 0, 0, 0.2);
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
  0% { background-color: white; opacity: 0.8; }
  100% { background-color: transparent; opacity: 1; }
}

/* 下落动画 */
@keyframes fall {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(0); }
}
</style>