<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">

    <!-- 游戏区域 -->
    <section class="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative overflow-auto">

      <!-- 重排提示 -->
      <Transition name="fade">
        <div
          v-if="showShuffleNotice && shuffleNotice"
          class="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-warning text-warning-content px-4 py-2 rounded-lg shadow-lg font-bold text-sm pointer-events-none whitespace-nowrap"
        >
          {{ getPlayerInfo(shuffleNotice.playerId)?.name ?? '该玩家' }}的棋盘已无解，自动重排（第 {{ shuffleNotice.count }} 次）
        </div>
      </Transition>

      <!-- 胜负遮罩 -->
      <Transition name="zoom">
        <div
          v-if="winnerName"
          class="absolute inset-0 z-10 flex items-center justify-center bg-base-300/40 backdrop-blur-sm rounded-xl"
        >
          <div class="bg-base-100/95 text-primary shadow-2xl px-8 py-6 rounded-2xl border border-primary/30 text-2xl font-bold text-center">
            🎉 {{ winnerName }} 获胜！
            <div class="text-base font-normal text-base-content/60 mt-2">
              {{ isWatcher ? '对局已结束。' : (winnerName === roomPlayer.name ? '恭喜你，率先清空棋盘！' : '加油，下次再来！') }}
            </div>
          </div>
        </div>
      </Transition>

      <template v-if="!isWatcher">
        <!-- 己方信息 -->
        <div class="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span class="badge badge-primary">我</span>
          <span>{{ roomPlayer.name }}</span>
          <span class="text-base-content/50">剩余 {{ myInfo?.leftTiles ?? 0 }} · 消除 {{ myInfo?.pairsDone ?? 0 }} 对</span>
          <span v-if="(myInfo?.shuffleCount ?? 0) > 0" class="text-warning text-xs">↺{{ myInfo!.shuffleCount }}</span>
        </div>

        <!-- 玩家棋盘 -->
        <LinkLinkCanvas
          :board="myInfo?.board"
          :selected="mySelected"
          :anim-key="roomPlayer.id"
          :clickable="isPlaying && !winnerName"
          @select="selectTile"
        />
      </template>

      <template v-else>
        <!-- 观众视角：所有玩家棋盘 -->
        <div class="grid gap-4 items-start" :class="{
          'grid-cols-1': players.length === 1,
          'grid-cols-1 md:grid-cols-2': players.length === 2,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': players.length === 3,
          'grid-cols-2 md:grid-cols-2 lg:grid-cols-4': players.length >= 4,
        }">
          <div
            v-for="p in players"
            :key="p.id"
            class="flex flex-col items-center gap-2"
          >
            <div class="flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold">
              <span class="badge badge-info badge-sm">{{ p.name }}</span>
              <span class="text-base-content/50 text-xs">剩余 {{ p.leftTiles }} · 消 {{ p.pairsDone }}</span>
              <span v-if="p.shuffleCount > 0" class="text-warning text-xs">↺{{ p.shuffleCount }}</span>
            </div>
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

    <!-- 玩家进度 badge -->
    <template #player-badge="{ player: p }">
      <span v-if="p.role === 'player'" class="text-xs text-base-content/50 inline-flex gap-1">
        <span>剩余 {{ getPlayerInfo(p.id)?.leftTiles ?? '?' }}</span>
        <span>· 消 {{ getPlayerInfo(p.id)?.pairsDone ?? 0 }} 对</span>
      </span>
    </template>

    <!-- 游戏规则 -->
    <template #rules>
      <ul class="space-y-1 text-sm">
        <li>1. 每位玩家有独立的 6×8 棋盘，初始布局相同。</li>
        <li>2. 点击两张相同图案的牌，路径最多拐弯 2 次（含绕边界）则消除。</li>
        <li>3. 点击已选中的牌可取消；点击不同牌则替换选中。</li>
        <li>4. 棋盘无解时自动重排剩余牌面。</li>
        <li>5. 最先清空棋盘的玩家获胜！</li>
      </ul>
    </template>

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
  showShuffleNotice, shuffleNotice,
  isPlaying, isWatcher, selectTile, onCommand,
} = useLinkLink(props.game, props.roomPlayer);

function getPlayerInfo(id: string) {
  return players.value.find(p => p.id === id);
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
.zoom-enter-active, .zoom-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.zoom-enter-from,  .zoom-leave-to      { opacity: 0; transform: scale(0.9); }
</style>
