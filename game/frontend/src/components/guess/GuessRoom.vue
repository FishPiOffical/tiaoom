<template>
  <section class="flex flex-col lg:flex-row gap-4 lg:h-full">
    <!-- 主游戏区域 -->
    <section class="flex-1 lg:h-full overflow-auto p-4">
      <!-- 准备阶段：显示游戏说明 -->
      <div v-if="!isPlaying" class="space-y-4">
        <div class="card bg-base-200">
          <div class="card-body">
            <h2 class="card-title">猜盐游戏</h2>
            <p class="text-base-content/80">
              系统将随机选取一篇文章，玩家通过猜测字符来还原文章内容。
            </p>
            <p class="text-base-content/80">
              猜出完整标题即视为完成！
            </p>
          </div>
        </div>
        
        <div class="card bg-base-200">
          <div class="card-body">
            <h3 class="font-bold">游戏规则</h3>
            <ul class="list-disc list-inside space-y-2 text-base-content/80">
              <li>每次猜测一个汉字字符</li>
              <li>猜对的字符会在文章中显示出来</li>
              <li>标题和正文中的汉字都可以被猜测</li>
              <li>完全还原标题即可通关</li>
              <li>已完成的玩家可以在通关频道聊天</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- 游戏进行中：显示文章和输入 -->
      <div v-else>
        <!-- 文章显示区域 -->
        <div v-if="article" class="mb-6">
          <!-- 标题 -->
          <div class="mb-4 p-4 bg-linear-to-r from-primary/20 to-secondary/20 rounded-lg">
            <div class="text-xs text-base-content/60 mb-2">标题 ({{ titleProgress.toFixed(1) }}%)</div>
            <div class="text-2xl font-bold tracking-wider break-all leading-relaxed">
              <span 
                v-for="(char, idx) in article.title" 
                :key="`title-${idx}`"
                class="inline-block min-w-6 text-center transition-all"
                :class="{
                  'text-base-content/30': char === '□',
                  'text-success font-bold': char !== '□' && /[\u4e00-\u9fa5]/.test(char) && correctChars.includes(char),
                  'text-base-content': char !== '□' && (!(/[\u4e00-\u9fa5]/.test(char)) || !correctChars.includes(char))
                }"
              >
                {{ char }}
              </span>
            </div>
          </div>

          <!-- 正文 -->
          <div class="p-4 bg-base-200 rounded-lg">
            <div class="flex justify-between items-center mb-2">
              <div class="text-xs text-base-content/60">正文 ({{ contentProgress.toFixed(1) }}%)</div>
              <div class="text-xs text-base-content/60">{{ article.category }} · {{ article.difficulty }}</div>
            </div>
            <div class="text-base leading-loose break-all">
              <span 
                v-for="(char, idx) in article.content" 
                :key="`content-${idx}`"
                class="inline-block min-w-4 text-center transition-all"
                :class="{
                  'text-base-content/30': char === '□',
                  'text-success': char !== '□' && /[\u4e00-\u9fa5]/.test(char) && correctChars.includes(char),
                  'text-base-content': char !== '□' && (!(/[\u4e00-\u9fa5]/.test(char)) || !correctChars.includes(char))
                }"
              >
                {{ char }}
              </span>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div v-if="canGuess" class="mb-4 p-4 bg-base-200 rounded-lg">
          <div class="flex gap-2">
            <input 
              v-model="guessInput"
              @keyup.enter="handleGuessSubmit"
              type="text" 
              maxlength="1"
              placeholder="输入一个字符后回车提交"
              class="input input-bordered flex-1 text-center text-2xl font-bold"
              :disabled="!canGuess"
            />
            <button 
              @click="handleGuessSubmit" 
              class="btn btn-primary"
              :disabled="!guessInput.trim()"
            >
              提交
            </button>
            <button 
              v-if="playerStatus === 'guessing'"
              @click="giveup" 
              class="btn btn-error"
            >
              放弃
            </button>
          </div>
        </div>

        <!-- 输入历史 -->
        <div class="mb-4 p-4 bg-base-200 rounded-lg">
          <h3 class="font-bold mb-2">输入历史</h3>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="char in correctChars" 
              :key="`correct-${char}`"
              class="badge badge-success badge-lg"
            >
              {{ char }}
            </span>
            <span 
              v-for="char in wrongChars" 
              :key="`wrong-${char}`"
              class="badge badge-error badge-lg"
            >
              {{ char }}
            </span>
            <span v-if="correctChars.length === 0 && wrongChars.length === 0" class="text-base-content/60 text-sm">
              还没有猜测记录
            </span>
          </div>
        </div>

        <!-- 玩家状态 -->
        <div v-if="playerStatus" class="mb-4 p-3 rounded-lg text-center font-bold" :class="{
          'bg-info/20 text-info': playerStatus === 'waiting',
          'bg-warning/20 text-warning': playerStatus === 'guessing',
          'bg-success/20 text-success': playerStatus === 'completed',
          'bg-error/20 text-error': playerStatus === 'giveup'
        }">
          {{ getStatusText(playerStatus) }}
        </div>
      </div>
    </section>
    
    <!-- 侧边栏：玩家列表 -->
    <aside class="w-full lg:w-96 flex-none border-t lg:border-t-0 lg:border-l border-base-content/20 pt-4 lg:pt-0 lg:pl-4 space-y-4">
      <h3 class="font-bold text-lg">玩家列表 ({{ allPlayers.length }})</h3>
      
      <div class="space-y-2 overflow-auto max-h-[500px]">
        <div 
          v-for="player in allPlayers" 
          :key="player.name"
          class="p-3 bg-base-200 rounded-lg transition-all"
          :class="{
            'ring-2 ring-primary': player.name === roomPlayer.name
          }"
        >
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center font-bold text-sm">
              <span v-if="!player.avatar">{{ player.name.substring(0, 1).toUpperCase() }}</span>
              <img v-else :src="player.avatar" alt="avatar" class="w-full h-full object-cover rounded-full" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold truncate">{{ player.name }}</div>
              <div class="text-xs" :class="{
                'text-base-content/60': player.status === 'unready',
                'text-success': player.status === 'ready' || player.status === 'completed',
                'text-info': player.status === 'waiting',
                'text-warning': player.status === 'guessing',
                'text-error': player.status === 'giveup'
              }">
                {{ getStatusText(player.status) }}
              </div>
            </div>
          </div>
          
          <!-- 进度条（仅在游戏中显示） -->
          <div v-if="player.isPlaying !== false" class="space-y-1">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span>标题</span>
                <span>{{ (player.titleProgress || 0).toFixed(1) }}%</span>
              </div>
              <progress 
                class="progress progress-primary w-full" 
                :value="player.titleProgress || 0" 
                max="100"
              ></progress>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span>正文</span>
                <span>{{ (player.contentProgress || 0).toFixed(1) }}%</span>
              </div>
              <progress 
                class="progress progress-secondary w-full" 
                :value="player.contentProgress || 0" 
                max="100"
              ></progress>
            </div>
          </div>
        </div>
      </div>

      <!-- 房间管理按钮 -->
      <PlayerList :players="(roomPlayer.room.players as any).filter((p: any) => p.role === 'watcher')" />
      
      <!-- 聊天区域 -->
      <div class="mt-4 border-t border-base-content/20 pt-4">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-lg">聊天</h3>
          <!-- 频道切换（仅已完成玩家可见） -->
          <div v-if="playerStatus === 'completed'" class="tabs tabs-boxed tabs-xs">
            <button 
              class="tab" 
              :class="{ 'tab-active': chatChannel === 'public' }"
              @click="chatChannel = 'public'"
            >
              公开
            </button>
            <button 
              class="tab" 
              :class="{ 'tab-active': chatChannel === 'completed' }"
              @click="chatChannel = 'completed'"
            >
              通关
            </button>
          </div>
        </div>
        
        <!-- 消息列表 -->
        <div class="bg-base-200 rounded-lg p-3 h-48 overflow-y-auto mb-2 space-y-2">
          <div 
            v-for="(msg, idx) in filteredMessages" 
            :key="idx"
            class="text-sm"
          >
            <span v-if="msg.sender" class="font-bold">{{ msg.sender.name }}:</span>
            <span v-else class="font-bold text-info">系统：</span>
            <span class="ml-1">{{ String(msg.content) }}</span>
          </div>
          <div v-if="filteredMessages.length === 0" class="text-base-content/60 text-center py-8">
            暂无消息
          </div>
        </div>
        
        <!-- 输入框 -->
        <div class="flex gap-2">
          <input 
            v-model="chatInput"
            @keyup.enter="sendMessage"
            type="text" 
            placeholder="输入消息..."
            class="input input-bordered input-sm flex-1"
          />
          <button 
            @click="sendMessage" 
            class="btn btn-primary btn-sm"
            :disabled="!chatInput.trim()"
          >
            发送
          </button>
        </div>
        
        <div v-if="chatChannel === 'completed'" class="text-xs text-warning mt-1">
          当前在通关频道，只有已完成的玩家能看到
        </div>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { useGuess, type GuessRoomPlayer } from './useGuess'
import PlayerList from '@/components/common/PlayerList.vue'
import type { Room } from 'tiaoom/client'
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'

const props = defineProps<{
  game: any
  roomPlayer: GuessRoomPlayer & { room: Room }
}>()

console.log('[猜盐组件] GuessRoom setup 执行, roomId:', props.roomPlayer.room.id, 'playerName:', props.roomPlayer.name);

onMounted(() => {
  console.log('[猜盐组件] GuessRoom onMounted');
});

onBeforeUnmount(() => {
  console.log('[猜盐组件] GuessRoom onBeforeUnmount');
});

const {
  article,
  correctChars,
  wrongChars,
  playerStatus,
  titleProgress,
  contentProgress,
  allPlayers,
  category,
  difficulty,
  guessInput,
  isPlaying,
  isOwner,
  canGuess,
  giveup,
  setCategory,
  setDifficulty,
  handleGuessSubmit,
  messages,
} = useGuess(props.game, props.roomPlayer)

// 聊天相关状态
const chatInput = ref('')
const chatChannel = ref<'public' | 'completed'>('public')

// 根据频道过滤消息
const filteredMessages = computed(() => {
  return messages.value.filter(msg => {
    // 系统消息总是显示
    if (!msg.sender) return true
    
    // 确保内容是字符串
    const content = String(msg.content || '')
    
    // 通关频道消息（以[通关]开头）
    if (content.startsWith('[通关]')) {
      // 只有在通关频道才显示
      return chatChannel.value === 'completed'
    }
    
    // 公开频道消息
    return chatChannel.value === 'public'
  })
})

// 发送消息
function sendMessage() {
  if (!chatInput.value.trim()) return
  
  if (chatChannel.value === 'completed') {
    // 发送到通关频道
    props.game.command(props.roomPlayer.room.id, { 
      type: 'say', 
      data: { 
        message: chatInput.value,
        channel: 'completed'
      } 
    })
  } else {
    // 发送到公开频道
    props.game.say(chatInput.value, props.roomPlayer.room.id)
  }
  
  chatInput.value = ''
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    unready: '未准备',
    ready: '已准备',
    waiting: '等待中',
    guessing: '猜题中',
    completed: '已完成',
    giveup: '已放弃'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
@keyframes pulse-once {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-once {
  animation: pulse-once 0.5s ease-in-out;
}
</style>
