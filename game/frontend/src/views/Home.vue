<template>
  <main class="flex-1 p-4 md:p-6 overflow-auto bg-base-100 w-full">
    <!-- 创建房间 -->
    <CreateRoom v-if="!gameStore.roomPlayer" />
    
    <!-- 全局聊天 -->
    <section v-if="!gameStore.roomPlayer" class="mt-8 space-y-4 max-w-2xl mx-auto flex flex-col">
      <div class="border-t border-base-content/20 pt-4"></div>
      <div class="join w-full">
        <input 
          v-model="msg" 
          type="text"
          @keyup.enter="sendMessage" 
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
            <time class="text-base-content/30 text-xs my-0.5">{{ new Date(m.createdAt).toLocaleString() }}</time>
          </div>
        </div>
      </section>
    </section>
    
    <!-- 房间内容 -->
    <section v-if="gameStore.roomPlayer" class="space-y-4 h-full flex flex-col">
      <header class="border-b border-base-content/20 flex justify-between">
        <h3 class="text-xl font-light text-base-content pb-2">
          我的房间: {{ gameStore.roomPlayer.room.name }} 
          <span class="text-sm text-base-content/60 ml-2">
            ({{ gameStore.roomPlayer.room.players.filter(p => p.role === 'player').length }}/{{ gameStore.roomPlayer.room.size }})
          </span>
        </h3>
        <span>
          <button v-if="hasLiteComponent" class="btn btn-text hidden md:inline tooltip tooltip-left" data-tip="弹出" @click="openSmallWindow('/#/lite')"><Icon icon="majesticons:open-line" /></button>
          {{ getComponent(gameStore.roomPlayer.room.attrs.type + '-lite') }}
        </span>
      </header>
      
      <!-- 动态游戏组件 -->
      <div class="flex-1 overflow-auto">
        <component 
          v-if="gameStore.roomPlayer.room.attrs?.type" 
          :is="gameStore.roomPlayer.room.attrs.type + '-room'" 
          :game="gameStore.game" 
          :room-player="gameStore.roomPlayer"
        />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { openSmallWindow } from '@/utils/dom'
import { getComponent } from '@/main';

const gameStore = useGameStore()

const msg = ref('')

function sendMessage() {
  if (!msg.value.trim()) return
  gameStore.game?.command({ type: 'say', data: msg.value })
  msg.value = ''
}

const hasLiteComponent = (type: string) => {
  try {
    getComponent(type.slice(0, 1).toUpperCase() + type.slice(1) + 'Lite')
    return true
  } catch {
    return false
  }
}
</script>
