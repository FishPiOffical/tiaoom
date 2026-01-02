<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand" lite>
    <!-- 左侧：游戏区域 -->
    <div class="flex-1 flex flex-col items-center justify-center">
      <h1 class="text-4xl font-bold">
        {{ count }} {{ count == target ? "=" : "≠" }} {{ target }}
      </h1>
    </div>

    <section class="flex justify-center fixed bottom-4 w-full">
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
    </section>
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
