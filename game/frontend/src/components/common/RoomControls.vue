<template>
  <div class="flex flex-row items-center gap-2 py-2">
    <!-- Waiting: Player Actions -->
    <div v-if="!isPlaying && roomPlayer.role === PlayerRole.player" class="group flex gap-2">
      <button class="btn btn-circle btn-sm btn-soft tooltip tooltip-left" 
        @click="game?.leaveRoom(roomPlayer.room.id)"
        :disabled="roomPlayer.isReady"
        data-tip="离开房间"
      >
        <Icon icon="mdi:logout" />
      </button>
      <button class="btn btn-circle btn-sm btn-soft tooltip tooltip-left" 
        @click="game?.leaveSeat(roomPlayer.room.id)"
        :disabled="roomPlayer.isReady"
        data-tip="离开座位"
      >
        <Icon icon="mdi:account-minus" />
      </button>
      <button class="btn btn-accent btn-sm btn-circle tooltip tooltip-left" 
        @click="game?.ready(roomPlayer.room.id, !roomPlayer.isReady)"
        :data-tip="roomPlayer.isReady ? '取消' : '准备'"
      >
        <Icon :icon="roomPlayer.isReady ? 'mdi:close' : 'mdi:check'" />
      </button>
      <button class="btn btn-primary btn-sm btn-circle tooltip tooltip-left" 
        @click="game?.startGame(roomPlayer.room.id)" 
        :disabled="!isAllReady"
        data-tip="开始游戏"
      >
        <Icon icon="mdi:play" />
      </button>
    </div>

    <!-- Watcher Actions -->
    <div v-if="roomPlayer.role === PlayerRole.watcher" class="group flex gap-2">
      <button class="btn" 
        @click="game?.leaveRoom(roomPlayer.room.id)"
        :disabled="roomPlayer.isReady"
      >
        离开房间
      </button>
      <button class="btn" 
        v-if="!isRoomFull && !isPlaying" 
        @click="game?.joinRoom(roomPlayer.room.id)"
      >
        加入游戏
      </button>
    </div>
    <!-- Extra Slot -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { GameCore } from '@/core/game';
import { RoomPlayer, Player, Room, PlayerRole, RoomStatus } from 'tiaoom/client';
import { computed } from 'vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room },
  game: GameCore,  
  currentPlayer?: Player | null,
  enableDrawResign?: boolean
}>()

defineEmits(['draw', 'lose'])

const isPlaying = computed(() => props.roomPlayer.room.status === RoomStatus.playing)
const isAllReady = computed(() => {
  if (!props.roomPlayer) return false
  return props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= props.roomPlayer.room.minSize &&
    props.roomPlayer.room.players.every((p: any) => p.isReady || p.role === 'watcher')
})
const isRoomFull = computed(() => {
  if (!props.roomPlayer) return true
  return props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= props.roomPlayer.room.size
})
</script>
