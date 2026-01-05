<template>
  <section class="flex flex-col lg:flex-row gap-4 lg:h-full">
    <!-- Toast 提示 -->
    <div v-if="showToast" class="toast toast-top toast-center z-50">
      <div class="alert alert-warning">
        <span>{{ toastMessage }}</span>
      </div>
    </div>
    
    <!-- 主游戏区域 -->
    <section class="flex-1 lg:h-full overflow-auto p-4">
      <!-- 准备阶段：显示房主设置 -->
      <div v-if="!isPlaying" class="space-y-4">
        <!-- 房主设置面板 -->
        <div v-if="isOwner" class="card bg-base-200">
          <div class="card-body">
            <h3 class="font-bold">游戏设置</h3>
            <div class="space-y-3">
              <div>
                <label class="label">
                  <span class="label-text">难度</span>
                </label>
                <select 
                  v-model="difficulty" 
                  @change="setDifficulty(difficulty)"
                  class="select select-bordered w-full"
                >
                  <option value="简单">简单</option>
                  <option value="中等">中等</option>
                  <option value="困难">困难</option>
                </select>
              </div>
              
              <div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text">禁止输入数字和字母</span>
                  <input 
                    v-model="restrictAlphanumeric"
                    @change="setRestrictAlphanumeric(restrictAlphanumeric)"
                    type="checkbox" 
                    class="checkbox checkbox-primary"
                  />
                </label>
                <div class="label">
                  <span class="label-text-alt text-base-content/60"> 开启后仅允许输入汉字</span>
                </div>
              </div>
            </div>
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
              <div class="text-xs text-base-content/60">难度：{{ article.difficulty }}</div>
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
            
            <!-- 文章来源（只在完成时显示） -->
            <div v-if="article.from && playerStatus === 'completed'" class="mt-3 pt-3 border-t border-base-content/10">
              <div class="text-xs text-base-content/60">来源</div>
              <div class="mt-1 text-sm break-all">
                <!-- <a 
                  v-if="article.from.includes('http')" 
                  :href="article.from.includes('Wikipedia:') ? article.from.split('Wikipedia: ')[1] : article.from"
                  target="_blank"
                  class="link link-primary hover:link-hover"
                >
                  {{ article.from }}
                </a> -->
                <span class="text-base-content/80">{{ article.from }}</span>
              </div>
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
              placeholder="输入一个字符后回车提交"
              class="input input-bordered flex-1 text-center text-2xl font-bold"
              :class="{ 'input-error': guessInput.trim().length > 1 }"
              :disabled="!canGuess"
            />
            <button 
              @click="handleGuessSubmit" 
              class="btn btn-primary"
              :disabled="!guessInput.trim() || guessInput.trim().length > 1"
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
          <div v-if="guessInput.trim().length > 1" class="mt-2 text-error text-sm">
            ⚠️ 只能提交一个字符，请删除多余的字符
          </div>
        </div>

        <!-- 输入历史 -->
        <div class="mb-4 p-4 bg-base-200 rounded-lg">
          <h3 class="font-bold mb-2">输入历史</h3>
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="(item, index) in guessHistory" 
              :key="`guess-${index}`"
              class="w-6 h-6 flex items-center justify-center rounded font-bold text-sm"
              :class="item.correct ? 'bg-success text-success-content' : 'bg-error text-error-content'"
            >
              {{ item.char }}
            </span>
            <span v-if="guessHistory.length === 0" class="text-base-content/60 text-sm">
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

        <!-- 倒计时显示 -->
        <div v-if="countdown > 0" class="mb-4 p-4 bg-primary/20 rounded-lg text-center">
          <div class="text-sm text-base-content/70 mb-1">下一轮即将开始</div>
          <div class="text-3xl font-bold text-primary">{{ countdown }}秒</div>
        </div>
      </div>
    </section>
    
    <!-- 侧边栏：玩家列表和聊天 -->
    <aside class="w-full lg:w-96 flex-none border-t lg:border-t-0 lg:border-l border-base-content/20 pt-4 lg:pt-0 lg:pl-4 space-y-4">
      <h3 class="font-bold text-lg">玩家列表 ({{ allPlayers.length }})</h3>
      
      <!-- 使用 PlayerList 组件，通过插槽自定义显示 -->
      <PlayerList :players="roomPlayer.room.players">
        <template #default="{ player }">
          <div 
            class="relative flex flex-col gap-2 p-3 bg-base-200 rounded-lg transition-all"
            :class="{
              'ring-2 ring-primary': player.name === roomPlayer.name
            }"
          >
            <button
              v-if="isOwner && player.id !== roomPlayer.id"
              class="btn btn-xs btn-ghost absolute top-2 right-2"
              title="踢出玩家"
              @click.stop.prevent="kickPlayer(player.id)"
            >
              <Icon icon="mdi:account-remove" />
            </button>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center font-bold text-sm">
                <span v-if="!player.attributes?.avatar">{{ player.name.substring(0, 1).toUpperCase() }}</span>
                <img v-else :src="player.attributes.avatar" alt="avatar" class="w-full h-full object-cover rounded-full" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold truncate">{{ player.name }}</div>
                <div class="text-xs" :class="{
                  'text-base-content/60': getPlayerGameStatus(player) === 'unready' || player.role === 'watcher',
                  'text-success': getPlayerGameStatus(player) === 'ready' || getPlayerGameStatus(player) === 'completed',
                  'text-info': getPlayerGameStatus(player) === 'waiting',
                  'text-warning': getPlayerGameStatus(player) === 'guessing',
                  'text-error': getPlayerGameStatus(player) === 'giveup',
                }">
                  {{ player.role === 'watcher' ? '围观中' : getStatusText(getPlayerGameStatus(player)) }}
                </div>
              </div>
            </div>
            
            <!-- 进度文本（仅在游戏中显示） -->
            <div v-if="player.role === 'player' && isPlaying" class="text-xs text-base-content/70">
              标题 {{ (getPlayerProgress(player).titleProgress || 0).toFixed(1) }}% · 正文 {{ (getPlayerProgress(player).contentProgress || 0).toFixed(1) }}%
            </div>
          </div>
        </template>
      </PlayerList>
      
      <!-- 聊天区域 - 使用框架自带组件 -->
      <div class="mt-4 border-t border-base-content/20 pt-4 flex flex-col max-h-[500px]">
        <div class="flex justify-between items-center mb-2 flex-none">
          <h3 class="font-bold text-lg">聊天</h3>
          <!-- 频道切换（仅游戏中且已完成玩家可见） -->
          <div v-if="isPlaying && playerStatus === 'completed'" class="tabs tabs-boxed tabs-xs">
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
        
        <!-- 通关频道提示 -->
        <div v-if="isPlaying && playerStatus === 'completed' && chatChannel === 'completed'" class="alert alert-info mb-2 py-2 text-xs flex-none">
          <Icon icon="mdi:information-outline" />
          <span>发送到通关频道，只有已完成的玩家能看到（消息有黄色边框标记）</span>
        </div>
        
        <!-- 使用框架的 GameChat 组件 -->
        <GameChat 
          :can-send="chatChannel === 'public' || (isPlaying && playerStatus === 'completed')"
          :placeholder="chatChannel === 'completed' ? '通关频道聊天...' : '随便聊聊'"
          :custom-send="true"
          @send="handleChatSend"
        >
          <template #rules>
            <ul class="space-y-2 text-sm">
              <li><strong>游戏目标：</strong>通过猜测字符，还原隐藏的文章标题和正文内容。</li>
              <li><strong>猜测规则：</strong>
                <ul class="pl-4 mt-1 list-disc">
                  <li>每次猜测一个汉字字符</li>
                  <li>猜对的字符会在标题和正文中同时显示</li>
                  <li>猜错的字符会记录在输入历史中</li>
                </ul>
              </li>
              <li><strong>通关条件：</strong>完全还原标题即可完成游戏</li>
            </ul>
          </template>
        </GameChat>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { useGuess, type GuessRoomPlayer } from './useGuess'
import PlayerList from '@/components/common/PlayerList.vue'
import GameChat from '@/components/common/GameChat.vue'
import type { Room } from 'tiaoom/client'
import { onMounted, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{
  game: any
  roomPlayer: GuessRoomPlayer & { room: Room }
}>()


const {
  article,
  guessHistory,
  correctChars,
  playerStatus,
  titleProgress,
  contentProgress,
  allPlayers,
  difficulty,
  restrictAlphanumeric,
  guessInput,
  countdown,
  isPlaying,
  isOwner,
  canGuess,
  toastMessage,
  showToast,
  giveup,
  setDifficulty,
  setRestrictAlphanumeric,
  handleGuessSubmit,
  kickPlayer,
} = useGuess(props.game, props.roomPlayer)

// 聊天频道状态
const chatChannel = ref<'public' | 'completed'>('public')

// 处理聊天发送
function handleChatSend(text: string) {
  if (chatChannel.value === 'completed') {
    // 发送到通关频道
    props.game.command(props.roomPlayer.room.id, { 
      type: 'say', 
      data: { 
        message: text,
        channel: 'completed'
      } 
    })
  } else {
    // 发送到公开频道
    props.game.command(props.roomPlayer.room.id, { 
      type: 'say', 
      data: text
    })
  }
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

// 从 RoomPlayer 中获取游戏状态
function getPlayerGameStatus(player: any): string {
  // 从 allPlayers 中查找对应玩家的状态信息
  const gamePlayer = allPlayers.value.find(p => p.name === player.name)
  return gamePlayer?.status || 'unready'
}

// 从 RoomPlayer 中获取进度信息
function getPlayerProgress(player: any): { titleProgress: number; contentProgress: number } {
  const gamePlayer = allPlayers.value.find(p => p.name === player.name)
  return {
    titleProgress: gamePlayer?.titleProgress || 0,
    contentProgress: gamePlayer?.contentProgress || 0
  }
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
