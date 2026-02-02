<template>
  <div class="flex flex-col h-screen bg-base-100 text-base-content">
    <!-- 主内容区 -->
    <main class="flex-1 bg-base-100 w-full">
      <!-- 创建房间 -->
      <CreateRoom v-if="!gameStore.roomPlayer && !roomId" />
      <main
        v-if="!gameStore.roomPlayer && roomId"
        class="flex-1 overflow-auto bg-base-100 w-full flex items-center justify-center"
      >
        <span>正在加载房间...</span>
      </main>
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
import { getComponent } from '@/components'
import { useRoom } from '@/hook/useRoom'

const { gameStore, roomId } = useRoom();

onMounted(() => {
  gameStore.initGame()
})
const ComponentLite = computed(() => getComponent(gameStore.roomPlayer?.room.attrs?.type, 'Lite'))
const ComponentLiteControls = computed(() => getComponent(gameStore.roomPlayer?.room.attrs?.type, 'RoomControlsLite'))

</script>
