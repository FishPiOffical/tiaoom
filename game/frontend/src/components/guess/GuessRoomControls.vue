<script setup lang="ts">
  import { RoomPlayer } from 'tiaoom/client';
  import { Room, PlayerRole, RoomStatus } from 'tiaoom/client';
  import { GameCore } from '@/core/game';
  import { computed } from 'vue';

  const isPlaying = computed(() => props.roomPlayer.room.status === RoomStatus.playing)
  const props = defineProps<{
    roomPlayer: RoomPlayer & { room: Room },
    game: GameCore,  
  }>()
</script>
<template>
  <!-- Playing: Player Actions -->
  <template v-if="isPlaying && roomPlayer.role === PlayerRole.player">
    <button class="btn btn-circle md:btn-lg btn-soft tooltip tooltip-left" 
      @click="game?.leaveRoom(roomPlayer.room.id), $router.push('/')"
      data-tip="离开房间"
    >
      <Icon icon="mdi:logout" />
    </button>
  </template>
</template>