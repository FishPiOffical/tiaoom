<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <!-- 左侧：游戏区域 -->
    <div class="flex-1 flex flex-col items-center justify-center">
      <h1 class="text-[50px] font-bold p-4">
        {{ count }} {{ count == target ? "=" : "!" }}= {{ target }}
      </h1>
      <!-- 操作 -->
      <div class="join">
        <button
          v-for="n in 4"
          :key="n"
          class="btn btn-primary join-item"
          @click="handleClick(n)"
          :disabled="!isPlaying"
        >
          +{{ n }}
        </button>
      </div>
    </div>

    <!-- 游戏规则 -->
    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>1. 双方轮流点击按钮加1~4。</li>
        <li>2. 当计数达到目标数字时，当前玩家获胜。</li>
        <li>3. 当计数大于目标数字时，则打成平手。</li>
      </ul>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { RoomPlayer, Room } from "tiaoom/client";
import { GameCore } from "@/core/game";
import { useClick } from "./useClick";

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const { onCommand, handleClick, isPlaying, count, target } = useClick(props.game, props.roomPlayer);
</script>
