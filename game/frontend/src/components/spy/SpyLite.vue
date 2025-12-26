<template>
  <section class="flex flex-col items-center justify-center p-2 py-4 h-full overflow-auto" ref="containerRef">
     <!-- 你的词 -->
    <div v-if="gameStatus !== 'waiting' && roomPlayer.role === 'player'" class="mb-4 p-4 bg-base-300 rounded-lg border-2 border-primary/50 text-center shadow-lg w-full max-w-md">
      <span class="text-base-content/60 text-sm">你的词语</span>
      <div class="text-2xl font-bold text-primary mt-1 tracking-widest">{{ word }}</div>
    </div>

    <!-- 玩家列表 (作为游戏主区域) -->
    <div class="grid grid-cols-3 gap-3 w-full max-w-md">
      <div 
        v-for="p in roomPlayer.room.players.filter(p => p.role === 'player') as SpyRoomPlayer[]" 
        :key="p.id" 
        class="group relative bg-base-300 border border-base-content/20 p-2 rounded-lg shadow-md flex flex-col items-center gap-1 transition-all"
        :class="{ 
          'opacity-50 grayscale': p.isDead,
          'ring-2 ring-primary': currentTalkPlayer?.id === p.id,
          'hover:shadow-xl': !p.isDead
        }"
      >
        <!-- 头像/状态图标 -->
        <div class="w-10 h-10 rounded-full bg-base-200 border border-base-content/20 flex items-center justify-center text-lg font-bold relative">
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
            class="absolute -top-1 -right-1 text-[10px] px-1 rounded-full shadow-sm"
            title="房主"
          >
            👑
          </span>
        </div>
        
        <div class="text-center w-full overflow-hidden">
          <div class="font-bold truncate w-full text-sm" :class="{ 'line-through': p.isDead }">{{ p.name }}</div>
          <div class="text-[10px] text-base-content/60">
            <span v-if="p.role === 'player'">
              {{ 
                !p.isReady ? '未准备' :
                gameStatus === 'waiting' ? '准备好了' :
                p.isDead ? '已出局' :
                gameStatus === 'voting' ? '投票中' :
                p.id === currentTalkPlayer?.id ? '发言中' :
                gameStatus === 'talking' ? '等待发言' : '准备好了'
              }}
            </span>
            <span v-else>围观中</span>
          </div>
        </div>

        <!-- 投票按钮 -->
        <button
          v-if="!roomPlayer.isDead && roomPlayer.role === 'player' && p.role === 'player' && voting && !voted && canVotePlayer.includes(p.id)" 
          @click="votePlayer(p.id)"
          class="btn btn-xs btn-accent w-full mt-1"
        >
          投票
        </button>

        <!-- 房主操作按钮 -->
        <div 
          v-if="roomPlayer.isCreator && p.id !== roomPlayer.id && gameStatus === 'waiting'" 
          class="absolute top-1 right-1 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        >
          <button
            @click="transferOwner(p.id)"
            class="btn btn-xs btn-circle btn-ghost"
            title="转让房主"
          >
            <Icon icon="mdi:crown" />
          </button>
          <button
            @click="kickPlayer(p.id)"
            class="btn btn-xs btn-circle btn-ghost text-error"
            title="踢出玩家"
          >
            <Icon icon="mdi:account-remove" />
          </button>
        </div>
      </div>
    </div>

    <!-- 发言控制 (悬浮或底部) -->
    <div v-if="roomPlayer.role === 'player' && canSpeak && gameStatus === 'talking'" class="fixed bottom-20 z-50">
      <button @click="sendTalked" class="btn btn-accent shadow-lg">
        结束发言 {{ countdown > 0 ? `(${countdown}s)` : '' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { GameCore } from '@/core/game';
import { useSpy, SpyRoomPlayer, SpyRoom } from './useSpy';
import { onMounted, ref } from 'vue';

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

const containerRef = ref<HTMLElement>();
onMounted(() => {
  const rect = containerRef.value?.parentElement?.getBoundingClientRect();
  if (!rect) return;
  if (rect.height < window.innerHeight) {
    window.resizeTo(window.innerWidth, rect.height);
  }
})
</script>
