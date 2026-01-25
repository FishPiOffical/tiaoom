<template>
  <div class="md:flex flex-row items-center gap-2 pl-2 md:text-[20px] text-[10px] grid grid-cols-3 md:w-auto w-[7em]">
    <!-- Waiting: Player Actions -->
    <template v-if="!isPlaying && roomPlayer.role === PlayerRole.player">
      <button class="btn btn-circle md:btn-lg btn-soft tooltip tooltip-left" 
        @click="$router.push('/').then(() => game?.leaveRoom(roomPlayer.room.id))"
        :disabled="roomPlayer.isReady"
        data-tip="离开房间"
      >
        <Icon icon="mdi:logout" />
      </button>
      <button class="btn btn-circle md:btn-lg btn-soft tooltip tooltip-left" 
         v-if="roomPlayer.isCreator"
         @click="manageVisible = true"
         data-tip="管理房间"
      >
        <Icon icon="mingcute:settings-3-line" />
      </button>
      <button class="btn btn-circle md:btn-lg btn-soft tooltip tooltip-left" 
        @click="game?.leaveSeat(roomPlayer.room.id)"
        :disabled="roomPlayer.isReady"
        data-tip="离开座位"
      >
        <Icon icon="mdi:gamepad-off" />
      </button>
      <button class="btn btn-accent md:btn-lg btn-circle tooltip tooltip-left" 
        @click="game?.ready(roomPlayer.room.id, !roomPlayer.isReady)"
        :data-tip="roomPlayer.isReady ? '取消' : '准备'"
      >
        <Icon :icon="roomPlayer.isReady ? 'mdi:close' : 'mdi:check'" />
      </button>
      <button class="btn btn-primary md:btn-lg btn-circle tooltip tooltip-left" 
        @click="game?.startGame(roomPlayer.room.id)" 
        :disabled="!isAllReady"
        data-tip="开始游戏"
      >
        <Icon icon="mdi:play" />
      </button>
    </template>

    <!-- Watcher Actions -->
    <template v-if="roomPlayer.role === PlayerRole.watcher">
      <button class="btn btn-circle md:btn-lg btn-soft tooltip tooltip-left" 
        @click="$router.push('/').then(() => game?.leaveRoom(roomPlayer.room.id))"
        :disabled="roomPlayer.isReady"
        data-tip="离开房间"
      >
        <Icon icon="mdi:logout" />
      </button>
      <button class="btn btn-circle md:btn-lg btn-soft tooltip tooltip-left" 
        v-if="!isRoomFull && !isPlaying && !gameStore.player?.isVisitor" 
        @click="game?.joinRoom(roomPlayer.room.id)"
        :disabled="roomPlayer.room.attrs.point > 0 && gameStore.player?.from !== 'fishpi'"
        data-tip="加入游戏"
      >
        <Icon icon="mdi:google-gamepad" />
      </button>
    </template>
    <!-- Extra Slot -->
    <slot />
  </div>
  <RoomManagementDrawer v-model:visible="manageVisible" :room="roomPlayer.room" />
</template>

<script setup lang="ts">
import { GameCore } from '@/core/game';
import { RoomPlayer, Room, PlayerRole, RoomStatus } from 'tiaoom/client';
import { useGameStore } from '@/stores/game';
import { computed, ref } from 'vue';
import RoomManagementDrawer from './RoomManagementDrawer.vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room },
  game: GameCore,  
}>()

const gameStore = useGameStore();
const manageVisible = ref(false)
const isPlaying = computed(() => props.roomPlayer.room.status === RoomStatus.playing)
const isAllReady = computed(() => {
  if (!props.roomPlayer) return false
  const minPlayers = props.roomPlayer.room.minSize === 0 ? 1 : props.roomPlayer.room.minSize
  const hasEnoughPlayers = props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= minPlayers

  console.log('[RoomControls] requireAllReadyToStart:', props.roomPlayer.room.requireAllReadyToStart, 'hasEnoughPlayers:', hasEnoughPlayers)

  if (!props.roomPlayer.room.requireAllReadyToStart) return hasEnoughPlayers

  return hasEnoughPlayers && props.roomPlayer.room.players.every((p: any) => p.isReady || p.role === 'watcher')
})
const isRoomFull = computed(() => {
  if (!props.roomPlayer) return true
  if (props.roomPlayer.room.size === 0) return false // size为0表示不限制人数
  return props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= props.roomPlayer.room.size
})
</script>
<style lang="less" scoped>
  .btn {
    --size: 2em;
  }
  :deep(.btn) {
    --size: 2em;
  }
</style>