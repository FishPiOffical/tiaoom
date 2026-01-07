<template>
  <main class="flex-1 overflow-hidden bg-base-100 w-full relative h-[calc(100vh-64px)] sm:h-auto">
    <!-- 大厅视图 (创建房间 + 聊天) -->
    <div v-if="!gameStore.roomPlayer" class="h-full w-full flex flex-col lg:flex-row overflow-hidden">
      
      <!-- 左侧：创建房间 (主要区域) -->
      <!-- 移动端保持纵向滚动，PC端作为左侧面板 -->
      <section class="flex-1 overflow-y-auto p-2 lg:p-6 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
        <div class="max-w-4xl mx-auto w-full pb-4">
           <CreateRoom />
        </div>
      </section>

      <!-- 聊天区域 (侧边栏) -->
      <!-- 移动端高度固定或伸缩，PC端固定宽度 -->
      <aside class="shrink-0 w-full lg:w-[380px] xl:w-[420px] h-[40vh] lg:h-full flex flex-col border-t lg:border-t-0 lg:border-l border-base-200 bg-base-100/50 backdrop-blur-sm shadow-inner lg:shadow-none z-10 transition-all duration-300">
        <!-- 聊天头部 -->
        <div class="h-12 min-h-12 px-4 border-b border-base-200 flex justify-between items-center bg-base-100/80 sticky top-0 z-10">
          <h3 class="font-bold text-base-content flex items-center gap-2 text-sm lg:text-base">
            <Icon icon="carbon:chat" class="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
            <span>公共频道</span>
            <span class="badge badge-sm badge-soft font-normal" v-if="gameStore.globalMessages.length > 0">{{ gameStore.globalMessages.length }}</span>
          </h3>
          <button class="btn btn-ghost btn-xs btn-square opacity-70 hover:opacity-100 transition-opacity" title="独立窗口" @click="openSmallWindow('/#/lite/chat')">
            <Icon icon="mdi:open-in-new" class="w-4 h-4" />
          </button>
        </div>

        <!-- 聊天列表 -->
        <div class="flex-1 overflow-y-auto p-3 space-y-3 bg-base-200/30 scroll-smooth" ref="messageListRef">
          <div v-if="gameStore.globalMessages.length === 0" class="flex flex-col items-center justify-center h-full text-base-content/30 space-y-2 select-none">
            <Icon icon="carbon:chat-bot" class="w-10 h-10 opacity-40" />
            <span class="text-xs">暂无消息，打破沉默吧~</span>
          </div>
          
          <div 
            v-for="(m, i) in gameStore.globalMessages" 
            :key="i" 
            class="flex flex-col group" 
            :class="{ 
              'items-end': m.sender?.id === gameStore.player?.id,
              'items-start': m.sender?.id !== gameStore.player?.id
            }"
          >
             <!-- 发送者名字 -->
            <div v-if="m.sender" class="text-[10px] text-base-content/50 mb-0.5 px-2 flex items-center gap-1">
                <span class="font-medium hover:underline cursor-pointer">{{ m.sender.name }}</span>
            </div>

            <!-- 消息气泡 -->
            <div 
                class="px-3 py-1.5 text-sm shadow-sm max-w-[95%] break-all relative transition-transform hover:scale-[1.01]"
                :class="{
                    'bg-primary text-primary-content rounded-2xl rounded-tr-sm': m.sender?.id === gameStore.player?.id,
                    'bg-base-100 text-base-content rounded-2xl rounded-tl-sm border border-base-200/60': m.sender?.id !== gameStore.player?.id && m.sender,
                    'bg-base-200/50 text-base-content/60 w-full text-center max-w-full! rounded-lg text-xs py-1 shadow-none': !m.sender
                }"
            >
                {{ m.data }}
            </div>
            <!-- 时间戳 (Hover显示) -->
            <div class="text-[9px] text-base-content/20 px-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {{ new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="p-2 lg:p-3 bg-base-100 border-t border-base-200">
          <div class="relative flex items-end gap-2">
             <input 
              v-model="msg" 
              type="text"
              @keydown.enter="sendMessage" 
              placeholder="发送消息..." 
              class="input input-sm lg:input-md input-bordered w-full pr-10 focus:ring-2 focus:ring-primary/20 transition-all bg-base-200/30 focus:bg-base-100 rounded-full pl-4"
            />
            <button 
              class="absolute right-1 top-1 bottom-1 btn btn-sm btn-circle btn-ghost text-primary hover:bg-primary/10 transition-colors"
              :class="{ 'opacity-50': !msg.trim(), 'opacity-100': msg.trim() }"
              :disabled="!msg.trim()" 
              @click="sendMessage"
            >
              <Icon icon="carbon:send-alt-filled" class="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </div>
    
    <!-- 房间内容 -->
    <Room v-else class="h-full w-full" />
  </main>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useGameStore } from '@/stores/game'
import { openSmallWindow } from '@/utils/dom'
import Room from '@/views/Room.vue';
// 确保 CreateRoom 被正确导入
import CreateRoom from '@/components/common/CreateRoom.vue'; 

const gameStore = useGameStore()
const messageListRef = ref<HTMLElement | null>(null)
const msg = ref('')

function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight + 100 // +100 to ensure bottom
  }
}

// 监听消息列表长度变化，自动滚动
watch(() => gameStore.globalMessages.length, async () => {
    await nextTick()
    scrollToBottom()
}, { flush: 'post' })

function sendMessage(e: any) {
  if (e?.isComposing) return
  if (!msg.value.trim()) return
  gameStore.game?.command({ type: 'say', data: msg.value })
  msg.value = ''
}
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
