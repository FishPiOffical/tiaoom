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
      <section class="inline-flex flex-col gap-2 max-h-1/2">
        <!-- 操作按钮 -->
        <RoomControls
          :game="game"
          :room-player="roomPlayer"
          :game-status="gameStatus"
          :enable-draw-resign="false"
        >
          <!-- 发言控制 -->
          <div v-if="roomPlayer.role === 'player' && canSpeak && gameStatus === 'talking'" class="group flex flex-col gap-2">
            <button @click="sendTalked" class="btn block btn-accent">
              结束发言 {{ countdown > 0 ? `(${countdown}s)` : '' }}
            </button>
            <hr class="border-base-content/20" />
          </div>

          <!-- 投票倒计时 -->
          <div v-if="gameStatus === 'voting'" class="text-center p-2 bg-base-200 rounded-lg">
             <div class="text-sm opacity-70">投票倒计时</div>
             <div class="text-xl font-bold" :class="{'text-error': countdown < 30}">{{ countdown }}s</div>
          </div>
        </RoomControls>        
        <!-- 玩家列表 -->
        <PlayerList :players="roomPlayer.room.players.filter(p => p.role != 'player')" />
      </section>
      
      <GameChat 
        :can-send="canSpeak"
        placeholder="聊天或说明你的词语"
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
import type { GameCore } from '@/core/game'
import type { RoomPlayer, Room } from 'tiaoom/client';
import GameChat from '@/components/common/GameChat.vue'
import { useSpy } from './useSpy';

type SpyRoomPlayer = RoomPlayer & { isDead?: boolean }

interface SpyRoom extends Room {
  players: SpyRoomPlayer[]
}

const props = defineProps<{
  roomPlayer: SpyRoomPlayer & { room: SpyRoom }
  game: GameCore
}>()


const {
  canVotePlayer,
  currentTalkPlayer,
  voted,
  gameStatus,
  word,
  countdown,
  voting,
  canSpeak,
  sendTalked,
  votePlayer,
  kickPlayer,
  transferOwner
} = useSpy(props.game, props.roomPlayer)


function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting') return '准备好了'
  if (p.isDead) return '已出局'
  if (gameStatus.value === 'voting') return '投票中'
  if (p.id === currentTalkPlayer.value?.id) return '发言中'
  if (gameStatus.value === 'talking') return '等待发言'
  return '准备好了'
}


</script>
