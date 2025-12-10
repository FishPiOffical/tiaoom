<template>
  <div class="flex flex-col gap-2">
    <!-- Waiting: Player Actions -->
    <div v-if="gameStatus === 'waiting' && roomPlayer.role === 'player'" class="group flex gap-2">
      <button class="btn" 
        @click="game?.leaveRoom(roomPlayer.room.id)"
        :disabled="roomPlayer.isReady"
      >
        离开房间
      </button>
      <button class="btn" 
        @click="game?.leaveSeat(roomPlayer.room.id)"
        :disabled="roomPlayer.isReady"
      >
        离开座位
      </button>
      <button class="btn btn-accent" 
        @click="game?.ready(roomPlayer.room.id, !roomPlayer.isReady)"
      >
        {{ roomPlayer.isReady ? '取消' : '准备' }}
      </button>
      <button class="btn btn-primary" 
        @click="game?.startGame(roomPlayer.room.id)" 
        :disabled="!isAllReady"
      >
        开始游戏
      </button>
    </div>

    <!-- Watcher Actions -->
    <div v-if="roomPlayer.role === 'watcher'" class="group flex gap-2">
      <button class="btn" 
        @click="game?.leaveRoom(roomPlayer.room.id)"
        :disabled="roomPlayer.isReady"
      >
        离开房间
      </button>
      <button class="btn" 
        v-if="!isRoomFull && gameStatus === 'waiting'" 
        @click="game?.joinRoom(roomPlayer.room.id)"
      >
        加入游戏
      </button>
    </div>

    <!-- Playing: Player Actions (Draw/Resign) -->
    <div v-if="gameStatus === 'playing' && roomPlayer.role === 'player'" class="group flex gap-2">
       <slot name="playing-actions">
          <button class="btn" 
            v-if="enableDrawResign"
            @click="$emit('draw')"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            请求和棋
          </button>
          <button class="btn" 
            v-if="enableDrawResign"
            @click="$emit('lose')"
            :disabled="currentPlayer?.id !== roomPlayer.id"
          >
            认输
          </button>
       </slot>
    </div>
    
    <!-- Extra Slot -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { GameCore } from '@/core/game';
import { RoomPlayer, Player, Room } from 'tiaoom/client';

defineProps<{
  roomPlayer: RoomPlayer & { room: Room },
  game: GameCore,  
  gameStatus: string,
  isAllReady: boolean,
  isRoomFull: boolean,
  currentPlayer?: Player | null,
  enableDrawResign?: boolean
}>()

defineEmits(['draw', 'lose'])
</script>
