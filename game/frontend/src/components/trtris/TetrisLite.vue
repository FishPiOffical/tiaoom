<template>
  <section class="flex flex-col items-center justify-center p-2 py-4" ref="containerRef">
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
            class="board-cell w-[6vw] h-[6vw] md:w-6 md:h-6 border border-base-content/10 relative"
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
    
        <!-- 下一个方块预览 -->
        <div class="absolute top-4 right-4 bg-base-200 p-2 rounded-box" v-if="renderedNextPiece">
          <h4 class="text-xs mb-1 text-center">下一个</h4>
          <div class="preview-container flex items-center justify-center" style="width: 80px; height: 80px;">
            <div class="preview-grid inline-block">
              <div
                v-for="(row, y) in renderedNextPiece.shape"
                :key="y"
                class="preview-row flex"
              >
                <div
                  v-for="(cell, x) in row"
                  :key="x"
                  class="preview-cell w-3 h-3 border border-base-content/10 relative"
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
          </div>
        </div>

      <!-- 游戏结束提示 -->
      <div v-if="gameState?.gameOver" class="absolute inset-0 bg-black/80 flex items-center justify-center rounded">
        <div class="text-center p-4">
          <h2 class="text-lg font-bold text-error mb-2">游戏结束</h2>
          <p class="text-base-content mb-4 text-sm">最终分数: {{ gameState.score }}</p>
          <button @click="restartGame" class="btn btn-primary btn-sm">重新开始</button>
        </div>
      </div>

      <!-- 暂停提示 -->
      <div v-else-if="gameState?.isPaused" class="absolute inset-0 bg-black/80 flex items-center justify-center rounded">
        <div class="text-center p-4">
          <h2 class="text-lg font-bold text-warning mb-4">游戏暂停</h2>
          <button @click="pause" class="btn btn-primary btn-sm">继续游戏</button>
        </div>
      </div>
    </div>

    <RoomControlsLite
      :game="game"
      :room-player="roomPlayer"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTetris } from './useTetris'
import type { RoomPlayer, Room } from 'tiaoom/client'
import type { GameCore } from '@/core/game'
import RoomControlsLite from '@/components/common/RoomControlsLite.vue'

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()

const {
  gameState,
  renderedBoardWithGhost,
  moveLeft,
  moveRight,
  moveDown,
  rotate,
  drop,
  pause,
  restartGame,
  clearedLines
} = useTetris(props.game, props.roomPlayer)

const containerRef = ref<HTMLElement>();
onMounted(() => {
  const rect = containerRef.value?.parentElement?.getBoundingClientRect();
  if (!rect) return;
  if (rect.height < window.innerHeight) {
    window.resizeTo(window.innerWidth, rect.height);
  }
})

// 获取颜色值的辅助函数
function getColorValue(colorClass: string) {
  // 如果已经是十六进制颜色值，直接返回
  if (colorClass.startsWith('#') || colorClass.startsWith('rgb')) {
    return colorClass
  }
  
  // 如果是CSS类名，映射为实际颜色值
  const colorMap: Record<string, string> = {
    'bg-cyan-500': 'oklch(var(--p))',      // 使用 DaisyUI 主题变量
    'bg-blue-500': 'oklch(var(--s))',      // 使用 DaisyUI 主题变量
    'bg-orange-500': 'oklch(var(--a))',    // 使用 DaisyUI 主题变量
    'bg-yellow-500': 'oklch(var(--wa))',   // 使用 DaisyUI 主题变量
    'bg-green-500': 'oklch(var(--su))',    // 使用 DaisyUI 主题变量
    'bg-purple-500': 'oklch(var(--er))',   // 使用 DaisyUI 主题变量
    'bg-red-500': 'oklch(var(--pc))',      // 使用 DaisyUI 主题变量
    'bg-gray-500': 'oklch(var(--b3))'      // 使用 DaisyUI 主题变量
  }
  
  return colorMap[colorClass] || 'oklch(var(--b3))'
}
</script>

<style scoped>
.board-cell.filled {
  border-color: oklch(var(--bc) / 0.3);
  box-shadow: inset 2px 2px 4px oklch(var(--w) / 0.2),
    inset -2px -2px 4px oklch(var(--b) / 0.2);
}

.board-cell.current {
  filter: brightness(1.2);
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