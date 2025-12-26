<template>
  <main class="flex-1 overflow-auto bg-base-100 w-full">
    <!-- 创建房间 -->
    <CreateRoom v-if="!gameStore.roomPlayer" class="p-4" />
    
    <!-- 全局聊天 -->
    <section v-if="!gameStore.roomPlayer" class="mt-8 px-4 space-y-4 max-w-2xl mx-auto flex flex-col">
      <div class="border-t border-base-content/20 pt-4"></div>
      <div class="join w-full">
        <input 
          v-model="msg" 
          type="text"
          @keydown.enter="sendMessage" 
          placeholder="随便聊聊" 
          class="flex-1 input join-item"
        />
        <button class="btn btn-secondary join-item" @click="sendMessage">发送</button>
      </div>
      <section class="bg-base-300/30 p-3 rounded min-h-64 overflow-auto border border-base-content/10 relative group">
        <button class="btn btn-text tooltip tooltip-left absolute top-0 right-2 group-hover:inline hidden" data-tip="弹出" @click="openSmallWindow('/#/lite/chat')">
          <Icon icon="mdi:open-in-new" />
        </button>
        <div ref="messageListRef" class="flex-1 overflow-y-auto p-3 space-y-1 scroll-smooth">
          <div v-if="gameStore.globalMessages.length === 0" class="text-center text-base-content/30 text-sm py-4">
            暂无消息
          </div>
          <div 
            v-for="(m, i) in gameStore.globalMessages" 
            :key="i" 
            class="text-sm wrap-break-word flex flex-col" 
            :class="{ 
              'items-end': m.sender?.id === gameStore.player?.id,
              'items-start': m.sender?.id !== gameStore.player?.id
            }"
          >
            <div v-if="m.sender" class="text-[10px] opacity-50 mb-0.5 px-1 flex gap-1">
                <span>{{ m.sender.name }}</span>
            </div>
            <div 
                class="px-3 py-1.5 rounded-2xl max-w-[85%]"
                :class="{
                    'bg-primary text-primary-content rounded-tr-none': m.sender?.id === gameStore.player?.id,
                    'bg-base-300 text-base-content rounded-tl-none': m.sender?.id !== gameStore.player?.id && m.sender,
                    'bg-base-300/50 text-base-content/70 w-full text-center max-w-full! rounded text-xs py-1': !m.sender
                }"
            >
                {{ m.data }}
            </div>
            <time class="text-base-content/30 text-[10px] my-0.5 px-0.5">{{ new Date(m.createdAt).toLocaleString() }}</time>
          </div>
        </div>
      </section>
    </section>
    
    <!-- 房间内容 -->
    <Room v-else />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { openSmallWindow } from '@/utils/dom'
import Room from '@/views/Room.vue';

const gameStore = useGameStore()

const msg = ref('')

function sendMessage(e:any) {
  if (e.isComposing) return
  if (!msg.value.trim()) return
  gameStore.game?.command({ type: 'say', data: msg.value })
  msg.value = ''
}
</script>
