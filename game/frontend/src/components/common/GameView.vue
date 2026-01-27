<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full" :class="{ 'h-[200%]': !lite }">
    <!-- 左侧：游戏区域 -->
    <slot></slot>

    <!-- 右侧：侧边栏 -->
    <aside v-if="!lite" class="w-full md:w-96 md:flex-none flex-1 max-h-1/2 md:max-h-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
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
          <AchievementTable :achievements="achievements" :show-draw="showDraw" />
        </div>
        
        <!-- 玩家列表 -->
        <div v-if="activeTab === 'players'">
          <PlayerList :players="roomPlayer.room.players">
            <template v-if="playerStatus || $slots.player || $slots['player-badge']" #default="{ player: p }">
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
      
      <GameChat v-if="chat" :canSend="canChat">
        <template #rules>
          <slot name="rules"></slot>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RoomPlayer, Room } from "tiaoom/client";
import { GameCore } from "@/core/game";
import { useGameEvents } from "@/hook/useGameEvents";

const props = withDefaults(defineProps<{
  /**
   * 当前玩家在房间中的信息
   */
  roomPlayer: RoomPlayer & { room: Room };
  /**
   * 游戏实例
   */
  game: GameCore;
  /**
   * 自定义玩家状态显示
   * @param player 玩家信息
   */
  playerStatus?: (player: RoomPlayer) => string;
  /**
   * 自定义围观者状态显示
   * @param player 围观者信息
   */
  watcherStatus?: (player: RoomPlayer) => string;
  /**
   * 是否显示战绩
   */
  achievements?: boolean;
  /**
   * 是否显示聊天框
   */
  chat?: boolean;
  /**
   * 当前激活的标签页
   */
  activeTab?: string;
  /**
   * 自定义标签页
   */
  tabs?: Record<string, { name: string; icon: string }>;
  /**
   * 战绩是否显示平局
   */
  showDraw?: boolean;
  /**
   * 是否为简化模式（隐藏侧边栏）
   */
  lite?: boolean;
  /**
   * 聊天框是否允许发送消息
   */
  canChat?: boolean;
}>(), {
  chat: true,
  showDraw: true,
  achievements: true,
  lite: false,
  canChat: true,
});

const emit = defineEmits<{
  (e: "command", msg: { type: string; data: any }): void;
  (e: "loaded"): void;
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

onMounted(() => {
  emit("loaded");
});
</script>
