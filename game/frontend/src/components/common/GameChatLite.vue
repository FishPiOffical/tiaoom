<template>
  <div class="flex flex-col h-full w-full bg-base-100/50 backdrop-blur rounded-lg shadow-xl overflow-hidden border border-base-content/10">
    <!-- Message List -->
    <div ref="messageListRef" class="flex-1 overflow-y-auto p-3 space-y-1 scroll-smooth flex flex-col-reverse">
      <div v-if="messages.length === 0" class="text-center text-base-content/30 text-sm py-4">
        暂无消息
      </div>
      <div 
        v-for="(m, i) in messages" 
        :key="i" 
        class="text-sm wrap-break-word flex flex-col group" 
        :class="{ 
          'items-end': m.sender?.id === player?.id,
          'items-start': m.sender?.id !== player?.id
        }"
      >
        <div v-if="m.sender" class="opacity-50 mb-0.5 px-1 flex gap-1">
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
            {{ m.content || m.data }}
        </div>
        <time v-if="m.createdAt" class="invisible group-hover:visible text-base-content/30 text-[8px] mt-0.5 mx-2">{{ new Date(m.createdAt).toLocaleString() }}</time>
      </div>
    </div>

    <!-- Input Area -->
    <div class="flex-none p-2 bg-base-200/50 border-t border-base-content/5">
        <p v-if="roomPlayer && roomPlayer.role !== PlayerRole.player && roomPlayer.room.status === RoomStatus.playing" class="text-[10px] text-base-content/50 italic mb-1 text-center">
            * 观众消息仅其他观众可见
        </p>
        <div class="flex items-center gap-2">
          <div class="join w-full shadow-sm">
            <input 
              v-model="msg" 
              type="text"
              @keydown.enter="send" 
              placeholder="随便聊聊" 
              class="flex-1 input input-sm join-item input-bordered focus:outline-none"
            />
            <button class="btn join-item" @click="broadcast" v-if="roomPlayer?.isAdmin">
              <Icon icon="bi:broadcast" />
            </button>
            <button class="btn btn-sm btn-primary join-item" @click="send">
              <Icon icon="mdi:send" />
            </button>
          </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { PlayerRole, RoomPlayer, RoomStatus } from 'tiaoom/client'
import { IMessage } from '..'
import { useGameEvents } from '@/hook/useGameEvents';
import { useGameStore } from '@/stores/game';
import { GameCore } from '@/core/game';

const emit = defineEmits<{
  (e: 'send', text: string): void
}>()


const gameStore = useGameStore();
const roomPlayer = computed(() => gameStore.roomPlayer);
const player = computed(() => gameStore.player);
const roomMessages = ref<IMessage[]>([])
const msg = ref('')
const messageListRef = ref<HTMLElement | null>(null)

function sendToRoom() {
  if (!msg.value.trim() || !roomPlayer.value) return
  // if (!props.canSend) return
  game.value?.command(roomPlayer.value.room.id, { type: 'say', data: msg.value })
  msg.value = ''
}

function sendToGlobal() {
  if (!msg.value.trim()) return
  gameStore.game?.command({ type: 'say', data: msg.value })
  msg.value = ''
}

function send(e:any) {
  if (e.isComposing) return
  if (roomPlayer.value) {
    sendToRoom()
  } else {
    sendToGlobal()
  }
}

function broadcast() {
  if (!msg.value.trim() || !roomPlayer.value) return
  if (!roomPlayer.value.isAdmin) return
  
  game.value?.command(roomPlayer.value.room.id, { type: 'broadcast', data: msg.value })
  msg.value = ''
}

const messages = computed<any[]>(() => {
  return roomPlayer.value ? roomMessages.value : gameStore.globalMessages;
})
function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

const game = ref<GameCore>();
onMounted(() => {
  scrollToBottom()
  game.value = gameStore.initGame();
  useGameEvents(game.value, {
    'player.message': onPlayMessage,
    'room.message': onPlayMessage,
    'player.command': onCommand,
  })
})

function onPlayMessage(msg: IMessage) {
  roomMessages.value.unshift(msg)
}
function onCommand(cmd: any) {
  switch (cmd.type) {
    case 'status':
      roomMessages.value = cmd.data.messageHistory;
      break
  }
}
</script>
