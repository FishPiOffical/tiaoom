<template>
  <div class="flex flex-col flex-1 min-h-[calc(50%-30px)] gap-2">
    <!-- Input Area -->
    <div class="flex-none flex items-center gap-2">
      <button 
        @click="rulesModal?.open()" 
        class="btn-ghost cursor-pointer bg-transparent border-none px-2!"
        title="游戏规则"
      >
        <Icon icon="mdi:information-outline" />
      </button>
      
      <div class="join w-full">
        <input 
          v-model="inputText" 
          type="text"
          @keydown.enter="handleSend" 
          :placeholder="placeholder" 
          class="flex-1 input join-item"
        />
        <button 
          class="btn btn-accent join-item tooltip tooltip-left" 
          @click="handleBroadcast" 
          v-if="roomPlayer?.role !== PlayerRole.player && 
          roomPlayer?.room.status === RoomStatus.playing &&
          isAdmin"
          data-tip="(管理员)广播消息给所有玩家和观众"
        >
          广播
        </button>
        <button class="btn btn-primary join-item" @click="handleSend" :disabled="!canSend">发送</button>
      </div>
    </div>
    <p v-if="roomPlayer && roomPlayer.role !== PlayerRole.player && roomPlayer.room.status === RoomStatus.playing" class="text-xs text-base-content/50 italic">
      * 游戏进行中，您为观众，发送消息仅能给其他观众查看
    </p>

    <RulesModal ref="rulesModal">
      <slot name="rules"></slot>
    </RulesModal>

    <!-- Message List -->
    <div class="bg-base-300/30 p-3 rounded overflow-auto space-y-2 border border-base-content/20 flex-1 relative group">
      <button class="btn btn-text tooltip tooltip-left absolute top-2 right-5 group-hover:inline hidden" data-tip="弹出" @click="openSmallWindow('/#/lite/chat')">
        <Icon icon="mdi:open-in-new" />
      </button>
      <div 
        v-for="(m, i) in messages" 
        :key="i" 
        class="text-sm wrap-break-word flex flex-col" 
        :class="{ 
          'items-end': m.sender?.id === roomPlayer?.id,
          'items-start': m.sender?.id !== roomPlayer?.id
        }"
      >
        <div v-if="m.sender" class="text-[10px] opacity-50 mb-0.5 px-1 flex gap-1">
            <span>{{ m.sender.name }}</span>
            <span v-if="(m.sender as RoomPlayer)?.role == PlayerRole.watcher" class="italic">(观众)</span>
            <span v-if="(m.sender as RoomPlayer)?.role == PlayerRole.admin" class="italic">(管理员)</span>
        </div>
        <div 
            class="px-3 py-1.5 rounded-2xl max-w-[85%]"
            :class="{
                'bg-accent text-accent-content': (m.sender as RoomPlayer)?.role == PlayerRole.admin,
                'rounded-tr-none': m.sender?.id === roomPlayer?.id,
                'rounded-tl-none': m.sender?.id !== roomPlayer?.id && m.sender,
                'bg-base-300/50 text-base-content/70 w-full text-center max-w-full! rounded text-xs py-1': !m.sender,
                'bg-base-200 text-base-content': (m.sender as RoomPlayer)?.role !== PlayerRole.admin,
                'bg-primary text-primary-content': (m.sender as RoomPlayer)?.role !== PlayerRole.admin && m.sender?.id === roomPlayer?.id,
            }"
        >
            {{ m.content }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { PlayerRole, RoomPlayer, RoomStatus } from 'tiaoom/client'
import { IMessage } from '..'
import RulesModal from '../rule/RulesModal.vue'
import Icon from '../icon/Icon.vue';
import { openSmallWindow } from '@/utils/dom';
import { useGameStore } from '@/stores/game';
import { useGameEvents } from '@/hook/useGameEvents';
import { GameCore } from '@/core/game';

const props = withDefaults(defineProps<{
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

function handleSend(e:any) {
  if (e.isComposing) return
  if (!inputText.value.trim() || !roomPlayer.value) return
  if (!props.canSend) return
  
  game.value?.command(roomPlayer.value.room.id, { type: 'say', data: inputText.value })
  inputText.value = ''
}

function handleBroadcast() {
  if (!inputText.value.trim() || !roomPlayer.value) return
  if (!isAdmin.value) return
  
  game.value?.command(roomPlayer.value.room.id, { type: 'broadcast', data: inputText.value })
  inputText.value = ''
}

const game = computed(() => useGameStore().game as GameCore);
const roomPlayer = computed(() => useGameStore().roomPlayer);
const isAdmin = computed(() => useGameStore().player?.isAdmin);

useGameEvents(useGameStore().game as GameCore, {
  'player.message': onPlayMessage,
  'room.message': onPlayMessage,
  'player.command': onCommand,
});

const messages = ref<IMessage[]>([])
function onPlayMessage(msg: IMessage) {
  messages.value.unshift(msg)
}
function onCommand(cmd: any) {
  switch (cmd.type) {
    case 'status':
      messages.value = cmd.data.messageHistory;
      break
  }
}
</script>
