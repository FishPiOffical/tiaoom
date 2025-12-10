<template>
  <section class="flex flex-col lg:flex-row gap-4 lg:h-full">
    <section class="flex-1 lg:h-full overflow-auto p-2">
       <!-- 你的词 -->
      <div v-if="gameStatus !== 'waiting' && roomPlayer.role === 'player'" class="mb-6 p-6 bg-base-300 rounded-lg border-2 border-primary/50 text-center shadow-lg">
        <span class="text-base-content/60 text-lg">你的词语</span>
        <div class="text-4xl font-bold text-primary mt-2 tracking-widest">{{ word }}</div>
      </div>

      <!-- 玩家列表 (作为游戏主区域) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div 
          v-for="p in roomPlayer.room.players.filter(p => p.role === 'player') as SpyRoomPlayer[]" 
          :key="p.id" 
          class="group relative bg-base-300 border border-base-content/20 p-4 rounded-lg shadow-md flex flex-col items-center gap-2 transition-all"
          :class="{ 
            'opacity-50 grayscale': p.isDead,
            'ring-2 ring-primary': currentTalkPlayer?.id === p.id,
            'hover:shadow-xl': !p.isDead
          }"
        >
          <!-- 头像/状态图标 -->
          <div class="w-12 h-12 rounded-full bg-base-200 border border-base-content/20 flex items-center justify-center text-xl font-bold relative">
            <span v-if="!p.attributes.avatar">{{ p.name.substring(0, 1).toUpperCase() }}</span>
            <img 
              v-else 
              :src="p.attributes.avatar" 
              alt="avatar" 
              class="w-full h-full object-cover rounded-full"
            />
            <!-- 房主标记 -->
            <span 
              v-if="p.isCreator" 
              class="absolute -top-2 -right-2 text-[10px] px-1 rounded-full shadow-sm"
              title="房主"
            >
              👑
            </span>
          </div>
          
          <div class="text-center w-full">
            <div class="font-bold truncate w-full" :class="{ 'line-through': p.isDead }">{{ p.name }}</div>
            <div class="text-xs text-base-content/60 mt-1">
              <span v-if="p.role === 'player'">{{ getPlayerStatus(p) }}</span>
              <span v-else>围观中</span>
            </div>
          </div>

          <!-- 投票按钮 -->
          <button
            v-if="!roomPlayer.isDead && roomPlayer.role === 'player' && p.role === 'player' && voting && !voted && canVotePlayer.includes(p.id)" 
            @click="votePlayer(p.id)"
            class="btn block btn-accent transition-colors"
          >
            投票
          </button>

          <!-- 房主操作按钮 -->
          <div 
            v-if="roomPlayer.isCreator && p.id !== roomPlayer.id && gameStatus === 'waiting'" 
            class="absolute top-3 right-3 flex gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <button
              @click="transferOwner(p.id)"
              class="icon-btn "
              title="转让房主"
            >
              <Icon icon="mdi:crown" />
            </button>
            <button
              @click="kickPlayer(p.id)"
              class="icon-btn "
              title="踢出玩家"
            >
              <Icon icon="mdi:account-remove" />
            </button>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 侧边栏 -->
    <aside class="w-full lg:w-96 flex-none border-t lg:border-t-0 lg:border-l border-base-content/20 pt-4 lg:pt-0 lg:pl-4 space-y-4 lg:h-full flex flex-col">
      <section class="inline-flex flex-col gap-2">
        <!-- 操作按钮 -->
        <RoomControls
          :game="game"
          :room-player="roomPlayer"
          :game-status="gameStatus"
          :is-all-ready="isAllReady"
          :is-room-full="isRoomFull"
          :enable-draw-resign="false"
        >
          <!-- 发言控制 -->
          <div v-if="roomPlayer.role === 'player' && canSpeak && gameStatus === 'talking'" class="group flex flex-col gap-2">
            <button @click="sendTalked" class="btn block btn-accent">
              结束发言 {{ countdown > 0 ? `(${countdown}s)` : '' }}
            </button>
            <hr class="border-base-content/20" />
          </div>
        </RoomControls>        
        
      </section>
      
      <GameChat 
        :messages="roomMessages" 
        :room-player="roomPlayer" 
        :can-send="canSpeak"
        placeholder="聊天或说明你的词语"
        @send="sendMessage"
      >
        <template #rules>
          <ul class="space-y-2 text-sm ">
            <li>1. 玩家分为平民和卧底，平民词语相同，卧底词语不同。</li>
            <li>2. 玩家轮流发言，描述自己的词语，但不能直接说出词语。</li>
            <li>3. <strong>发言计时机制：</strong>
              <ul class="pl-4 mt-1 list-disc">
                <li>轮到发言时，有 <strong>5分钟</strong> 时间准备和输入。</li>
                <li>超时未发言将被判定为死亡（出局）。</li>
                <li>一旦开始发言（发送消息），剩余时间将缩短为 <strong>30秒</strong>。</li>
                <li>30秒内未结束发言（点击结束按钮），系统将自动结束你的发言。</li>
              </ul>
            </li>
            <li>4. 所有玩家发言结束后进行投票，票数最多者出局。</li>
            <li>5. 卧底出局则平民胜利，仅剩2人且含卧底则卧底胜利。</li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import type { GameCore } from '@/core/game'
import type { RoomPlayer, Room } from 'tiaoom/client';
import GameChat from '@/components/common/GameChat.vue'
import { IMessage } from '..';
import { useGameEvents } from '@/hook/useGameEvents';

type SpyRoomPlayer = RoomPlayer & { isDead?: boolean }

const props = defineProps<{
  roomPlayer: SpyRoomPlayer & { room: Room & { players: SpyRoomPlayer[] } }
  game: GameCore
}>()

const canVotePlayer = ref<string[]>([])
const currentTalkPlayer = ref<any>(null)
const voted = ref(false)
const gameStatus = ref<'waiting' | 'talking' | 'voting'>('waiting')
const word = ref('')
const roomMessages = ref<IMessage[]>([])
const currentPlayer = computed(() => props.roomPlayer.id)
const countdown = ref(0)
let countdownTimer: any = null

const voting = computed(() => gameStatus.value === 'voting')

const canSpeak = computed(() => {
  return (gameStatus.value === 'talking' && currentTalkPlayer.value?.id === currentPlayer.value) || 
         gameStatus.value === 'waiting'
})

function onRoomStart() {
  roomMessages.value = []
  gameStatus.value = 'talking'
  currentTalkPlayer.value = null
}
function onRoomEnd() {
  gameStatus.value = 'waiting'
  currentTalkPlayer.value = null
}
function onPlayMessage(msg: IMessage) {
  roomMessages.value.unshift(msg)
}

function onCommand(cmd: any) {
  if (props.roomPlayer.room.attrs?.type !== 'spy') return
  
  switch (cmd.type) {
    case 'talk':
      currentTalkPlayer.value = cmd.data.player
      gameStatus.value = 'talking'
      if (countdownTimer) clearInterval(countdownTimer)
      countdown.value = 0
      if (currentTalkPlayer.value?.id === currentPlayer.value) {
        // 如果是自己发言，开始倒计时
        countdown.value = 300
        countdownTimer = setInterval(() => {
          countdown.value--
          if (countdown.value <= 0) {
            clearInterval(countdownTimer)
          }
        }, 1000)
      }
      break;
    case 'talk-countdown':
      countdown.value = cmd.data.seconds
      if (countdownTimer) clearInterval(countdownTimer)
      countdownTimer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(countdownTimer)
        }
      }, 1000)
      break
    case 'vote':
      gameStatus.value = 'voting'
      voted.value = false
      if (countdownTimer) clearInterval(countdownTimer)
      countdown.value = 0
      if (cmd.data) {
        canVotePlayer.value = cmd.data.map((p: any) => p.id)
      } else {
        canVotePlayer.value = props.roomPlayer.room.players
          .filter((p: any) => !p.isDead)
          .map((p: any) => p.id)
      }
      break
    case 'word':
      word.value = cmd.data.word
      break
    case 'status':
      gameStatus.value = cmd.data.status
      word.value = cmd.data.word
      currentTalkPlayer.value = cmd.data.talk
      voted.value = cmd.data.voted
      canVotePlayer.value = cmd.data.canVotePlayers.map((p: any) => p.id)
      if (cmd.data.deadPlayers) {
        for (const dp of cmd.data.deadPlayers) {
          const p: SpyRoomPlayer | undefined = props.roomPlayer.room.players.find((p: any) => p.id === dp.id)
          if (p) p.isDead = true
        }
      }
      roomMessages.value = cmd.data.messageHistory || [];
      break
    case 'voted':
      voted.value = true
      break
    case 'dead':
      if (cmd.data.player.id === currentPlayer.value && !props.roomPlayer.isDead ) {
        alert('你已出局')
        props.roomPlayer.isDead = true
      }
      const deadPlayer: SpyRoomPlayer | undefined = props.roomPlayer.room.players.find((p: any) => p.id === cmd.data.player.id)
      if (deadPlayer) deadPlayer.isDead = true
      break
  }
}

useGameEvents(props.game, {
  'room.start': onRoomStart,
  'room.end': onRoomEnd,
  'player.message': onPlayMessage,
  'room.message': onPlayMessage,
  'room.command': onCommand
})

function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting') return '准备好了'
  if (p.isDead) return '已出局'
  if (gameStatus.value === 'voting') return '投票中'
  if (p.id === currentTalkPlayer.value?.id) return '发言中'
  if (gameStatus.value === 'talking') return '等待发言'
  return '准备好了'
}

function sendMessage(text: string) {
  props.game?.command(props.roomPlayer.room.id, { type: 'say', data: text })
}

function sendTalked() {
  props.game?.command(props.roomPlayer.room.id, { type: 'talked' })
  if (countdownTimer) clearInterval(countdownTimer)
  countdown.value = 0
}

function votePlayer(playerId: string) {
  if (voted.value) return
  props.game?.command(props.roomPlayer.room.id, { type: 'voted', data: { id: playerId } })
}

function kickPlayer(playerId: string) {
  if (!confirm('确定要踢出该玩家吗？')) return
  props.game?.kickPlayer(props.roomPlayer.room.id, playerId)
}

function transferOwner(playerId: string) {
  if (!confirm('确定要转让房主给该玩家吗？')) return
  props.game?.transferRoom(props.roomPlayer.room.id, playerId)
}

const isRoomFull = computed(() => {
  if (!props.roomPlayer) return true
  return props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= props.roomPlayer.room.size
})

const isAllReady = computed(() => {
  if (!props.roomPlayer) return false
  return props.roomPlayer.room.players.filter((p: any) => p.role === 'player').length >= props.roomPlayer.room.minSize &&
    props.roomPlayer.room.players.every((p: any) => p.isReady || p.role === 'watcher')
})

</script>
