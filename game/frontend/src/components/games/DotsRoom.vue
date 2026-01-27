<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center p-4">
      <!-- 游戏状态显示 -->
      <div class="mb-4 text-center" v-if="isPlaying">
        <div class="text-lg font-bold mb-2">
          {{ currentPlayer?.name }} 的回合
        </div>
        <div class="text-sm">
          {{ player1?.name }}: {{ scores[0] }} 分 |
          {{ player2?.name }}: {{ scores[1] }} 分
        </div>
      </div>

      <!-- 棋盘 -->
      <div class="relative p-4 rounded-lg">
        <svg
          :width="BOARD_SIZE * CELL_SIZE + 20"
          :height="BOARD_SIZE * CELL_SIZE + 20"
          :viewBox="`0 0 ${BOARD_SIZE * CELL_SIZE + 20} ${BOARD_SIZE * CELL_SIZE + 20}`"
          class="block"
        >
          <!-- 绘制点 -->
          <g v-for="(_row, rowIndex) in (BOARD_SIZE + 1)" :key="'dots-' + rowIndex">
            <g v-for="(_col, colIndex) in (BOARD_SIZE + 1)" :key="'dot-' + rowIndex + '-' + colIndex">
              <circle
                :cx="colIndex * CELL_SIZE + 10"
                :cy="rowIndex * CELL_SIZE + 10"
                r="3"
                class="fill-neutral"
              />
            </g>
          </g>

          <!-- 绘制水平线 -->
          <g v-for="(_row, rowIndex) in (BOARD_SIZE + 1)" :key="'hlines-' + rowIndex">
            <g v-for="(_col, colIndex) in BOARD_SIZE" :key="'hline-' + rowIndex + '-' + colIndex">
              <line
                :x1="colIndex * CELL_SIZE + 10"
                :y1="rowIndex * CELL_SIZE + 10"
                :x2="(colIndex + 1) * CELL_SIZE + 10"
                :y2="rowIndex * CELL_SIZE + 10"
                :class="hLines[rowIndex]?.[colIndex] ? 'stroke-error' : 'stroke-base-300'"
                stroke-width="3"
                class="cursor-pointer hover:stroke-primary"
                @click="drawLine('horizontal', rowIndex, colIndex)"
              />
            </g>
          </g>

          <!-- 绘制垂直线 -->
          <g v-for="(_row, rowIndex) in BOARD_SIZE" :key="'vlines-' + rowIndex">
            <g v-for="(_col, colIndex) in (BOARD_SIZE + 1)" :key="'vline-' + rowIndex + '-' + colIndex">
              <line
                :x1="colIndex * CELL_SIZE + 10"
                :y1="rowIndex * CELL_SIZE + 10"
                :x2="colIndex * CELL_SIZE + 10"
                :y2="(rowIndex + 1) * CELL_SIZE + 10"
                :class="vLines[rowIndex]?.[colIndex] ? 'stroke-error' : 'stroke-base-300'"
                stroke-width="3"
                class="cursor-pointer hover:stroke-primary"
                @click="drawLine('vertical', rowIndex, colIndex)"
              />
            </g>
          </g>

          <!-- 绘制方块 -->
          <g v-for="(_row, rowIndex) in BOARD_SIZE" :key="'boxes-' + rowIndex">
            <g v-for="(_col, colIndex) in BOARD_SIZE" :key="'box-' + rowIndex + '-' + colIndex">
              <rect
                v-if="boxes[rowIndex]?.[colIndex]"
                :x="colIndex * CELL_SIZE + 15"
                :y="rowIndex * CELL_SIZE + 15"
                :width="CELL_SIZE - 10"
                :height="CELL_SIZE - 10"
                :class="boxes[rowIndex][colIndex] === 1 ? 'fill-primary' : 'fill-accent'"
                fill-opacity="0.7"
                rx="5"
              />
            </g>
          </g>
        </svg>
      </div>
    </div>

    <template #actions>
      <div class="space-y-2">
        <button
          class="btn btn-primary w-full"
          @click="resetGame"
          v-if="roomPlayer.role === 'admin'"
        >
          重新开始
        </button>
      </div>
    </template>

    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>1. 玩家轮流在点阵上画线（点击灰色线段）。</li>
        <li>2. 当四条线围成一个方块时，该玩家获得该方块并继续画线。</li>
        <li>3. 所有方块都被占领时，拥有方块多的玩家获胜。</li>
        <li>4. 每回合有 60 秒时间限制，超时自动切换玩家。</li>
      </ul>
    </template>
    <template #player-badge="{ player }">
      <div class="w-[1em] h-[1em] rounded" :class="{
        'bg-primary': player.attributes?.symbol === 1,
        'bg-accent': player.attributes?.symbol === 2
      }"></div>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import { useDots, BOARD_SIZE } from './useDots';
import { computed } from 'vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const CELL_SIZE = 60;

const {
  hLines,
  vLines,
  boxes,
  currentPlayer,
  scores,
  players,
  drawLine,
  onCommand,
} = useDots(props.game, props.roomPlayer);

const player1 = computed(() => {
  const id = players.value[0];
  return id ? props.roomPlayer.room.players.find(p => p.id === id) : null;
});

const player2 = computed(() => {
  const id = players.value[1];
  return id ? props.roomPlayer.room.players.find(p => p.id === id) : null;
});

function resetGame() {
  if (props.roomPlayer.role === 'admin') {
    props.game.command(props.roomPlayer.room.id, {
      type: 'reset'
    });
  }
}

const isPlaying = computed(() => props.roomPlayer.room.status === 'playing');
</script>
