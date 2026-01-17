<template>
  <main class="flex-1 overflow-hidden bg-base-100 w-full relative h-[calc(100vh-64px)] sm:h-auto">
    <!-- 大厅视图 (创建房间 + 聊天) -->
    <div v-if="!gameStore.roomPlayer" class="h-full w-full flex flex-col lg:flex-row overflow-hidden">
      
      <!-- 左侧：创建房间 (主要区域) -->
      <!-- 移动端保持纵向滚动，PC端作为左侧面板 -->
      <section class="flex-1 overflow-y-auto p-2 lg:p-6 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
        <div class="max-w-4xl mx-auto w-full pb-4 space-y-2">
           <div v-if="gameStore.player?.isVisitor" class="flex flex-col items-center justify-center p-12 bg-base-200 rounded-xl space-y-4 shadow-inner">
             <Icon icon="game-icons:locked-chest" class="text-6xl text-base-content/20" />
             <h3 class="text-xl font-bold">登录后开启游戏之旅</h3>
             <p class="text-base-content/60">游客身份仅限围观游戏</p>
             <button class="btn btn-primary btn-wide" @click="gameStore.showLoginModal = true">
                <Icon icon="akar-icons:game-controller" class="text-xl" />
                立即登录
             </button>
           </div>
           <CreateRoom />
        </div>
      </section>

      <!-- 使用独立的 LobbyChat 组件，移动端通过 Default 中全局弹出，桌面端直接显示 -->
      <LobbyChat class="hidden lg:flex shrink-0 h-full lg:w-[380px] xl:w-[420px] " />
    </div>
    
    <!-- 房间内容 -->
    <Room v-else class="h-full w-full" />
  </main>
</template>

<script setup lang="ts">
import LobbyChat from '@/components/common/LobbyChat.vue'
import { useGameStore } from '@/stores/game'
import Room from '@/views/Room.vue';
// 确保 CreateRoom 被正确导入
import CreateRoom from '@/components/common/CreateRoom.vue'; 

const gameStore = useGameStore()
// Lobby handled by LobbyChat component

// LobbyChat component will render global messages and handle sending
</script>


<style scoped>
/* 隐藏滚动条但保留滚动功能 (可选，看设计喜好) */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
