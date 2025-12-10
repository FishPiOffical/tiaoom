<template>
  <div class="flex flex-col flex-1 min-h-0 gap-2">
    <!-- Input Area -->
    <div class="flex-none flex items-center gap-2">
      <button 
        @click="rulesModal?.open()" 
        class="btn-ghost cursor-pointer bg-transparent border-none px-2!"
        title="游戏规则"
      >
        <Icon icon="mdi:information-outline" />
      </button>
      
      <div v-if="roomPlayer.role === 'player'" class="join w-full">
        <input 
          v-model="inputText" 
          type="text"
          @keyup.enter="handleSend" 
          :placeholder="placeholder" 
          class="flex-1 input join-item"
        />
        <button class="btn join-item" @click="handleSend" :disabled="!canSend">发送</button>
      </div>
    </div>

    <RulesModal ref="rulesModal">
      <slot name="rules"></slot>
    </RulesModal>

    <!-- Message List -->
    <div class="bg-base-300/30 p-3 rounded overflow-auto border border-base-content/20 flex-1">
      <p 
        v-for="(m, i) in messages" 
        :key="i" 
        class="text-sm mb-1" 
        :class="{ 
          'text-accent': !m.sender, 
          'text-base-content/80': m.sender,
          'font-bold': m.sender?.id === roomPlayer.id
        }"
      >
        <span>[{{ m.sender?.name || '系统' }}]:</span>
        {{ m.content }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { RoomPlayer } from 'tiaoom/client'
import { IMessage } from '..'
import RulesModal from '../rule/RulesModal.vue'

const props = withDefaults(defineProps<{
  messages: IMessage[]
  roomPlayer: RoomPlayer
  canSend?: boolean
  placeholder?: string
}>(), {
  canSend: true,
  placeholder: '随便聊聊'
})

const emit = defineEmits<{
  (e: 'send', text: string): void
}>()

const inputText = ref('')
const rulesModal = ref<InstanceType<typeof RulesModal> | null>(null)

function handleSend() {
  if (!inputText.value.trim()) return
  if (!props.canSend) return
  
  emit('send', inputText.value)
  inputText.value = ''
}
</script>
