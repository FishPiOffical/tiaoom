<template>
  <div class="flex flex-col h-screen bg-base-100 text-base-content">
    <!-- 主内容区 -->
    <main class="flex-1 bg-base-100 w-full">
      <!-- 创建房间 -->
      <CreateRoom v-if="!gameStore.roomPlayer" />
      <RoomControlsLite
        v-if="gameStore.game && gameStore.roomPlayer"
        :game="gameStore.game" 
        :room-player="gameStore.roomPlayer"
      >
        <component 
          v-if="gameStore.roomPlayer && ComponentLiteControls" 
          :is="ComponentLiteControls" 
          :game="gameStore.game" 
          :room-player="gameStore.roomPlayer"
        />
      </RoomControlsLite>
      <!-- 房间内容 -->
      <component 
        v-if="gameStore.roomPlayer && ComponentLite" 
        :is="ComponentLite" 
        :game="gameStore.game" 
        :room-player="gameStore.roomPlayer"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { getComponent } from '@/components'
const gameStore = useGameStore()

onMounted(() => {
  gameStore.initGame()
})
const ComponentLite = computed(() => getComponent(gameStore.roomPlayer?.room.attrs?.type, 'Lite'))
const ComponentLiteControls = computed(() => getComponent(gameStore.roomPlayer?.room.attrs?.type, 'RoomControlsLite'))

</script>
