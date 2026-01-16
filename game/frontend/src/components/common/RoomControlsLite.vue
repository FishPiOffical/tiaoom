<template>
  <div 
    v-if="roomPlayer.room.status !== 'playing' || showControl" class="fixed z-100 bg-base-300/60 top-0 left-0 w-full h-full flex flex-col items-center justify-center">

    <div class="flex flex-col gap-2">
      <!-- Waiting: Player Actions -->
      <div v-if="!isPlaying && roomPlayer.role === PlayerRole.player" class="group flex gap-2">
        <button class="btn btn-circle tooltip" 
          @click="game?.leaveRoom(roomPlayer.room.id)"
          :disabled="roomPlayer.isReady"
          data-tip="离开房间"
        >
          <Icon icon="mdi:logout" />
        </button>
        <button class="btn btn-circle tooltip" 
          @click="game?.leaveSeat(roomPlayer.room.id)"
          :disabled="roomPlayer.isReady"
          data-tip="离开座位"
        >
          <Icon icon="mdi:gamepad-off" />
        </button>
        <button class="btn btn-circle btn-accent btn-soft tooltip" 
          @click="game?.ready(roomPlayer.room.id, !roomPlayer.isReady)"
          :data-tip="roomPlayer.isReady ? '取消' : '准备'"
        >
          <Icon :icon="roomPlayer.isReady ? 'mdi:close' : 'mdi:check'" />
        </button>
        <button class="btn btn-circle btn-primary tooltip" 
          @click="game?.startGame(roomPlayer.room.id), showControl = false" 
          :disabled="!isAllReady"
          data-tip="开始游戏"
        >
          <Icon icon="mdi:play" />
        </button>
      </div>

      <!-- Watcher Actions -->
      <div v-if="roomPlayer.role === PlayerRole.watcher" class="group flex gap-2">
        <button class="btn btn-circle tooltip" 
          @click="game?.leaveRoom(roomPlayer.room.id)"
          :disabled="roomPlayer.isReady"
          data-tip="离开房间"
        >
          <Icon icon="mdi:logout" />
        </button>
        <button class="btn btn-circle tooltip" 
          v-if="!isRoomFull && !isPlaying && !(roomPlayer.room.attrs.point > 0 && gameStore.player?.from !== 'fishpi')" 
          @click="game?.joinRoom(roomPlayer.room.id)"
          data-tip="加入游戏"
        >
          <Icon icon="mdi:google-gamepad" />
        </button>
      </div>      
      <!-- Extra Slot -->
      <slot></slot>
    </div>
    <p class="opacity-30 text-xs m-3 content-end" v-if="roomPlayer.role === PlayerRole.watcher">
      游戏中可按下 <kbd class="kbd kbd-xs">Esc</kbd> 键显示/隐藏控制面板
    </p>
  </div>
</template>

<script setup lang="ts">
import { GameCore } from '@/core/game';
import { RoomPlayer, Room, PlayerRole, RoomStatus } from 'tiaoom/client';
import { useGameStore } from '@/stores/game';
import { computed, ref } from 'vue';
import hotkeys from 'hotkeys-js';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room },
  game: GameCore,  
}>()

const gameStore = useGameStore();

const isPlaying = computed(() => props.roomPlayer.room.status === RoomStatus.playing)
const isAllReady = computed(() => {
  const minPlayers = props.roomPlayer.room.minSize === 0 ? 1 : props.roomPlayer.room.minSize
  const hasEnoughPlayers = props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= minPlayers

  if (!props.roomPlayer.room.requireAllReadyToStart) return hasEnoughPlayers

  return hasEnoughPlayers && props.roomPlayer.room.players.every((p: any) => p.isReady || p.role === 'watcher')
})
const isRoomFull = computed(() => {
  if (props.roomPlayer.room.size === 0) return false // size为0表示不限制人数
  return props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= props.roomPlayer.room.size
})

const showControl = ref(false);
hotkeys('esc', () => {
  if (props.roomPlayer?.role !== PlayerRole.watcher) return;
  showControl.value = !showControl.value;
});

</script>
