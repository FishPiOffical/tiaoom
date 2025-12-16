<script lang="ts" setup>
  import msg from '@/components/msg';
  import { useGameStore } from '@/stores/game';
import { onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  const gameStore = useGameStore();
  const route = useRoute();
  const router = useRouter();

  function init() {
    if (route.params.id) {
      if (gameStore.roomPlayer && gameStore.roomPlayer.room.id !== route.params.id) {
        if (gameStore.roomPlayer.role !== 'player') {
          gameStore.game?.leaveRoom(gameStore.roomPlayer.room.id);
        } else {
          msg.warning('您正在游戏中，无法切换房间！');
          return;
        }
      }
      gameStore.game?.joinRoom(route.params.id as string);
    }
  }

  gameStore.game?.onReady(() => {
    init();
  })

  onMounted(async () => {
    init();
    router.replace('/');
  })

</script>

<template>
  <main class="flex-1 p-4 md:p-6 overflow-auto bg-base-100 w-full flex items-center justify-center">
    <span>正在加载房间...</span>
  </main>
</template>