<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand" lite>

    <section class="flex-1 flex flex-col items-center justify-center p-3 gap-2 relative">

      <!-- 胜负提示 -->
      <Transition name="fade">
        <div v-if="winnerName" class="text-primary font-bold text-sm">
          🎉 {{ winnerName }} 获胜！
        </div>
      </Transition>

      <!-- 己方进度 -->
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
  myInfo, winnerName, mySelected,
  isPlaying, selectTile, onCommand,
} = useLinkLink(props.game, props.roomPlayer);
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
