<template>
  <aside class="shrink-0 w-full h-full flex flex-col border-t lg:border-t-0 lg:border-l border-base-200 bg-base-100/50 backdrop-blur-sm shadow-inner lg:shadow-none z-10 transition-all duration-300">
    <div class="flex items-center justify-between p-3 border-b border-base-content/20">
      <div class="flex items-center gap-2">
        <Icon icon="carbon:chat" class="w-5 h-5 text-primary" />
        <h4 class="font-medium">公共频道</h4>
        <span v-if="globalMessages.length" class="badge badge-sm badge-soft">{{ globalMessages.length }}</span>
      </div>
      <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-xs hidden md:inline-flex" title="独立窗口" @click="openSmallWindow('/#/lite/chat')">
            <Icon icon="mdi:open-in-new" />
          </button>
          <button class="btn btn-ghost btn-xs md:hidden" @click="close">
            <Icon icon="mingcute:close-line" />
          </button>
        </div>
    </div>

    <div ref="listRef" class="flex-1 overflow-y-auto p-3 space-y-3 bg-base-200/30">
      <div v-if="globalMessages.length === 0" class="flex flex-col items-center justify-center h-full text-base-content/30 space-y-2 select-none">
        <Icon icon="carbon:chat-bot" class="w-10 h-10 opacity-40" />
        <span class="text-xs">暂无消息，打破沉默吧~</span>
      </div>
      <div v-for="(m, i) in globalMessages" :key="i" class="flex flex-col" :class="{ 'items-end': m.sender?.id === player?.id, 'items-start': m.sender?.id !== player?.id }">
        <div v-if="m.sender" class="text-[10px] text-base-content/50 mb-0.5 px-2 flex items-center gap-1">
          <span class="font-medium hover:underline cursor-pointer">{{ m.sender.name }}</span>
        </div>
        <div class="px-3 py-1.5 text-sm shadow-sm max-w-[95%] break-all relative transition-transform hover:scale-[1.01]"
              :class="{
                'bg-primary text-primary-content rounded-2xl rounded-tr-sm': m.sender?.id === player?.id,
                'bg-base-100 text-base-content rounded-2xl rounded-tl-sm border border-base-200/60': m.sender?.id !== player?.id && m.sender,
                'bg-base-200/50 text-base-content/60 w-full text-center max-w-full! rounded-lg text-xs py-1 shadow-none': !m.sender
              }">
          {{ m.data }}
        </div>
        <div class="text-[9px] text-base-content/20 px-1 mt-0.5">
          {{ new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
        </div>
      </div>
    </div>

    <div class="p-2 bg-base-100 border-t border-base-content/20">
      <div class="relative flex items-end gap-2">
        <input v-model="msg" type="text" @keydown.enter="send" :readonly="player?.isVisitor" :placeholder="player?.isVisitor ? '登录后发送消息' : '发送消息...'"
                class="input input-sm input-bordered w-full pr-10 rounded-full pl-4" />
        <button class="absolute right-1 top-1 bottom-1 btn btn-sm btn-circle btn-ghost text-primary" :disabled="!msg.trim()" @click="send">
          <Icon icon="carbon:send-alt-filled" class="w-5 h-5" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { openSmallWindow } from '@/utils/dom'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const msg = ref('')
const listRef = ref<HTMLElement | null>(null)

const globalMessages = computed(() => gameStore.globalMessages)
const player = computed(() => gameStore.player)

function send() {
  if (!msg.value.trim()) return
  gameStore.game?.command({ type: 'say', data: msg.value })
  msg.value = ''
}

function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight + 100
  })
}

function close() {
  emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  })
})

watch(globalMessages, () => scrollToBottom())
</script>

