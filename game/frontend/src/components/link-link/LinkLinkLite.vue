<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand" lite>

    <section class="flex-1 flex flex-col items-center justify-center p-3 gap-2 relative overflow-auto">

      <!-- 胜负提示 -->
      <Transition name="fade">
        <div v-if="winnerName" class="text-primary font-bold text-sm">
          🎉 {{ winnerName }} 获胜！
        </div>
      </Transition>

      <template v-if="!isWatcher">
        <!-- 玩家视角：己方进度 -->
        <div class="flex items-center gap-2 text-xs font-semibold">
          <span class="badge badge-primary badge-sm">我</span>
          <span class="text-base-content/60">剩余 {{ myInfo?.leftTiles ?? 0 }} · 消除 {{ myInfo?.pairsDone ?? 0 }} 对</span>
          <span v-if="(myInfo?.shuffleCount ?? 0) > 0" class="text-warning">↺{{ myInfo!.shuffleCount }}</span>
        </div>

        <!-- 可交互棋盘 -->
        <LinkLinkCanvas
          :board="myInfo?.board"
          :selected="mySelected"
          :anim-key="roomPlayer.id"
          :clickable="isPlaying && !winnerName"
          @select="selectTile"
        />
      </template>

      <template v-else>
        <!-- 观众视角：所有玩家进度 -->
        <div class="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
          <div v-for="p in players" :key="p.id" class="flex items-center gap-1">
            <span class="badge badge-info badge-sm">{{ p.name }}</span>
            <span class="text-base-content/60">剩 {{ p.leftTiles }}</span>
          </div>
        </div>

        <!-- 观众：所有棋盘网格 -->
        <div class="grid gap-2 items-start w-full" :class="{
          'grid-cols-1': players.length === 1,
          'grid-cols-2': players.length >= 2,
        }">
          <div v-for="p in players" :key="p.id" class="flex flex-col items-center gap-1">
            <span class="text-xs text-base-content/50">{{ p.name }}</span>
            <LinkLinkCanvas
              :board="p.board"
              :selected="null"
              :anim-key="p.id"
              :clickable="false"
            />
          </div>
        </div>
      </template>

    </section>

  </GameView>
</template>

<script setup lang="ts">
import { type RoomPlayer, type Room } from 'tiaoom/client';
import type { GameCore } from '@/core/game';
import GameView from '@/components/common/GameView.vue';
import LinkLinkCanvas from './LinkLinkCanvas.vue';
import { useLinkLink } from './useLinkLink';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const {
  myInfo, players,
  winnerName, mySelected,
  isPlaying, isWatcher, selectTile, onCommand,
} = useLinkLink(props.game, props.roomPlayer);
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
