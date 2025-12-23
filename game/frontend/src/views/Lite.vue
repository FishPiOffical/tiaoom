<template>
  <div class="flex flex-col h-screen bg-base-100 text-base-content">
    <!-- 主内容区 -->
    <main class="flex-1 bg-base-100 w-full">
      <!-- 创建房间 -->
      <CreateRoom v-if="!gameStore.roomPlayer" />
      <RoomControlsLite
        v-if="gameStore.game"
        :game="gameStore.game" 
        :room-player="gameStore.roomPlayer"
      />
      <!-- 房间内容 -->
      <component 
        v-if="gameStore.roomPlayer?.room.attrs?.type" 
        :is="gameStore.roomPlayer.room.attrs.type + '-lite'" 
        :game="gameStore.game" 
        :room-player="gameStore.roomPlayer"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
const gameStore = useGameStore()

onMounted(() => {
  gameStore.initGame()
})
</script>
