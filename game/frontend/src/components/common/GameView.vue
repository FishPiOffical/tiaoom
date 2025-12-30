<template>
  <section class="flex flex-col md:flex-row gap-4 h-full">
    <!-- 左侧：游戏区域 -->
    <slot></slot>

    <!-- 右侧：侧边栏 -->
    <aside v-if="!lite" class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <section class="inline-flex flex-col gap-2 max-h-1/2">
        <div role="tablist" class="tabs tabs-lift">
          <a 
            v-for="(t, name) in tabs" 
            role="tab" 
            class="tab tooltip tooltip-bottom" 
            :class="{ 'tab-active': activeTab === name }" 
            @click="activeTab = name">
            <Icon :icon="t.icon" />
            <span class="ml-2">{{ t.name }}</span>
          </a>
          <a 
            role="tab" 
            class="tab tooltip tooltip-bottom" 
            :class="{ 'tab-active': activeTab === 'players' }" 
            @click="activeTab = 'players'">
            <Icon icon="fluent:people-16-filled" />
            <span class="ml-2">玩家列表</span>
          </a>
          <a 
            v-if="achievements && Object.keys(achievements).length > 0" 
            role="tab" 
            class="tab tooltip tooltip-bottom" 
            :class="{ 'tab-active': activeTab === 'achievements' }" 
            @click="activeTab = 'achievements'">
            <Icon icon="ri:sword-fill" />
            <span class="ml-2">战绩</span>
          </a>
        </div>

        <!-- 成就表 -->
        <div v-if="activeTab === 'achievements'">
          <AchievementTable :achievements="achievements" show-draw />
        </div>
        
        <!-- 玩家列表 -->
        <div v-if="activeTab === 'players'">
          <PlayerList :players="roomPlayer.room.players">
            <template v-if="playerStatus || $slots.player" #default="{ player: p }">
              <slot name="player" :player="p">
                <span v-if="p.role === 'player'" class="inline-flex gap-2 items-center">
                  <span>[{{ playerStatus?.(p) || getPlayerStatus(p) }}]</span>
                  <slot name="player-badge" :player="p"></slot>
                </span>
                <span v-else>{{ watcherStatus?.(p) || '[围观中]' }}</span>
                <span>{{ p.name }}</span>
              </slot>
            </template>
          </PlayerList>
        </div>

        <template v-for="(_, name) in tabs" :key="name">
          <div v-show="activeTab === name">
            <slot :name="`tab-${name}`"></slot>
          </div>
        </template>
        
        <!-- 操作按钮 -->
        <slot name="actions" :isPlaying="isPlaying"></slot>
        
        <hr v-if="$slots.actions" class="border-base-content/20" />
        
      </section>
      
      <GameChat v-if="chat">
        <template #rules>
          <slot name="rules"></slot>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { RoomPlayer, Room } from "tiaoom/client";
import { GameCore } from "@/core/game";
import { useGameEvents } from "@/hook/useGameEvents";

const props = withDefaults(defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
  playerStatus?: (player: RoomPlayer) => string;
  watcherStatus?: (player: RoomPlayer) => string;
  achievements?: boolean;
  chat?: boolean;
  activeTab?: string;
  tabs?: Record<string, { name: string; icon: string }>;
  showDraw?: boolean;
  lite?: boolean;
}>(), {
  chat: true,
  showDraw: true,
  achievements: true,
  lite: false,
});

const emit = defineEmits<{
  (e: "command", msg: { type: string; data: any }): void;
}>();


useGameEvents(props.game, {
  "player.command": onCommand,
  "room.command": onCommand,
});

const achievements = ref<Record<string, any>>({});
function onCommand(msg: { type: string; data: any }) {
  if (msg.type === 'status') {
    achievements.value = msg.data.achievements || {};
  }
  emit("command", msg);
}

const isPlaying = computed(() => {
  return (
    props.roomPlayer.role === "player" &&
    props.roomPlayer.room.status === "playing"
  );
});

function getPlayerStatus(p: RoomPlayer): string {
  if (isPlaying.value) {
    return '游戏中';
  } else if (p.isReady) {
    return '已准备';
  } else {
    return '未准备';
  }
}

const activeTab = ref<string>(props.activeTab || 'players')
</script>
