<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <section class="flex-1 flex flex-col items-center justify-center" ref="mainRef" :style="{ '--size': size + 'px' }">
      <!-- Board -->
      <section class="flex-1 w-full h-full flex flex-col md:items-center md:justify-center overflow-auto p-4 select-none">
        <div class="inline-block p-3 rounded">
          <AeroplaneChessBoard
            :state="state"
            :my-player-id="roomPlayer.id"
            :movable="movable"
            :can-move="canMove"
            :cell-px="cellPx"
            @pieceClick="move"
          />
        </div>
        <div v-if="state && currentPlayer">
          <div class="flex items-center justify-between">
            <span>当前回合：</span>
            <span class="font-bold">
              <span :class="getTextColor(currentPlayer.attributes?.aeroplaneColor, false)">✈</span>
              {{ currentPlayer.name }}
            </span>
          </div>
        </div>
      </section>
    </section>
    <template #player-badge="{ player }">
      <span :class="getTextColor(player.attributes?.aeroplaneColor, false)">✈</span>
    </template>
    <template #actions>
      <div class="flex items-center gap-2" v-if="canRoll || state?.lastRoll">
        <button class="btn btn-primary" :disabled="!canRoll" @click="roll">掷骰</button>
        <div class="text-sm" v-if="state?.lastRoll">
          <Icon :icon="getDiceIcon(state.lastRoll)" class="text-2xl" />
        </div>
      </div>
      <div v-if="canMove" class="space-y-2">
        <div class="font-bold text-sm">请选择要移动的飞机</div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="p in myPieces"
            :key="p.index"
            class="btn btn-sm"
            :class="movable.includes(p.index) ? 'btn-accent' : ''"
            :disabled="!movable.includes(p.index)"
            @click="move(p.index)"
          >
            {{ pieceText(p) }}
          </button>
        </div>
      </div>
    </template>
    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>1. 轮到你时点击“掷骰”。</li>
        <li>2. 掷到 6 可从停机坪起飞；掷到 6 移动后可再掷一次。</li>
        <li>3. 落在同色轨道格会自动前进 4 格；落在同色捷径起点会“飞行”到对侧再前进 4 格。</li>
        <li>4. 落到对手所在主环格会将其送回停机坪。</li>
        <li>5. 率先将 4 架飞机全部到达终点者获胜。</li>
      </ul>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { Room, RoomPlayer } from 'tiaoom/client';
import type { GameCore } from '@/core/game';
import { useAeroplaneChess } from './useAeroplaneChess';
import AeroplaneChessBoard from './AeroplaneChessBoard.vue';
import { getTextColor } from './board';

const props = defineProps<{ roomPlayer: RoomPlayer & { room: Room }; game: GameCore }>();

const {
  state,
  onCommand,
  movable,
  myPieces,
  canRoll,
  canMove,
  myColor,
  roll,
  move,
} = useAeroplaneChess(props.game, props.roomPlayer);

const cellPx = ref(34);

const currentPlayer = computed(() => {
  const pid = state.value?.turnPlayerId;
  const p = props.roomPlayer.room.players.find((x) => x.id === pid);
  return p;
});

function pieceText(p: any) {
  const label = `${myColor.value?.toUpperCase()}${(p.index ?? 0) + 1}`;
  if (p.area === 'hangar') return `${label}（待命）`;
  if (p.area === 'finish') return `${label}（到达）`;
  return label;
}

const size = ref(34);
const mainRef = ref<HTMLElement | null>(null);
onMounted(() => {
  if (mainRef.value) {
    const w = mainRef.value.clientWidth;
    cellPx.value = size.value = Math.max(30, Math.min(34, Math.floor((w - 32) / 17)));
  }
});

function getDiceIcon(face: number) {
  return `mdi:dice-${face}`;
}
</script>