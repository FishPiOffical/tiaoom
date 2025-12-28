# 快速开始

本指南将通过一个简单的示例，演示如何添加一个新的游戏。

## 1. 创建后端逻辑

在 `game/backend/src/games` 目录下创建 `click.ts` 文件。

```typescript
import { GameRoom, IGameCommand } from '.';
import { RoomPlayer, PlayerRole } from 'tiaoom';

// 定义游戏基本属性
export const name = '7 的倍数'; // 游戏名称
export const minSize = 2; // 最小玩家数
export const maxSize = 2; // 最大玩家数
export const description = '玩家轮流点击按钮增加计数，谁让计数变成 7 的倍数谁就获胜，计数超过 50 则失败。'; // 游戏描述

export default class ClickRoom extends GameRoom {
  count = 0;
  currentPlayer: RoomPlayer | undefined;

  // 游戏开始时调用
  onStart() {
    this.count = 0;
    // 广播初始状态
    this.currentPlayer = this.room.validPlayers[0];
    this.room.emit('command', { type: 'update', data: { count: this.count } });
    this.room.emit('command', { type: 'click', data: { player: this.currentPlayer } });
    this.save(); // 保存初始状态
  }

  // 处理玩家指令
  onCommand(message: IGameCommand) {
    super.onCommand(message); // 处理通用指令
    if (message.type === 'click') {
      this.count+= Number(message.data - 1) % 5 + 1; // 增加计数，确保增加量在 1-5 之间
      // 广播新状态
      this.room.emit('command', { type: 'update', data: { count: this.count } });
      // 保存状态
      this.save();
      if (this.count % 7 === 0) {
        this.saveAchievements(this.room.validPlayers.filter(p => p.id === message.sender.id));
        this.say(`${message.sender.name} 计数达到 ${this.count}，是 7 的倍数，获胜！`);
      } else if (this.count > 50) {
        // 先大于 50 分算输
        this.saveAchievements(this.room.validPlayers.filter(p => p.id !== message.sender.id));
        this.say(`${message.sender.name} 计数达到 ${this.count}，超过 50 分，惜败！`);
      } else {
        // 未大于 50 且不是 7 的倍数继续游戏
        this.currentPlayer = this.room.validPlayers.find(p => p.id !== message.sender.id);
        this.room.emit('command', { type: 'click', data: { player: this.currentPlayer } });
        return;
      }
      this.room.end();
    }
  }

  // 获取当前游戏状态（用于断线重连等）
  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      count: this.count,
      currentPlayer: this.currentPlayer,
    };
  }
}
```

## 2. 创建前端组件

在 `game/frontend/src/components/games` 目录下创建 `ClickRoom.vue` 文件。

```vue
<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <!-- 左侧：游戏区域 -->
    <div class="flex-1 flex flex-col items-center justify-center">
      <h1 class="text-[50px] font-bold p-4">{{ count }}</h1>
      <!-- 操作 -->
      <div class="join">
        <input
          type="number"
          v-model.number="clickNumber"
          class="input input-bordered w-24 text-center join-item"
          min="1"
          max="5"
        />
        <button
          class="btn btn-primary join-item"
          @click="handleClick"
          :disabled="!isPlaying"
        >
          点击 +{{ clickNumber }}
        </button>
      </div>
    </div>

    <!-- 右侧：侧边栏 -->
    <aside
      class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col"
    >
      
      <!-- 玩家列表 -->
      <PlayerList :players="roomPlayer.room.players" />

      <!-- 聊天窗口与游戏规则 -->
      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. 双方轮流点击按钮</li>
            <li>2. 当计数达到 7 的倍数时，当前玩家获胜</li>
            <li>3. 当计数大于 50 时，非当前玩家获胜</li>
          </ul>
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

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const count = ref(0);
const clickNumber = ref(1);

function handleClick() {
  props.game.command(props.roomPlayer.room.id, { type: "click", data: clickNumber.value });
}

const currentPlayer = ref<RoomPlayer | null>(null);
useGameEvents(props.game, {
  "player.command": onCommand,
  "room.command": onCommand,
});

function onCommand(msg: any) {
  switch(msg.type) {
    case "click":
      if (msg.data.player) {
        currentPlayer.value = msg.data.player;
      }
      break;
    case "update":
      count.value = msg.data.count;
      break;
    case "status":
      if (msg.data.currentPlayer) {
        currentPlayer.value = msg.data.currentPlayer;
      }
      break;
  }
}

const isPlaying = computed(() => {
  return (
    props.roomPlayer.role === "player" &&
    props.roomPlayer.room.status === "playing" &&
    currentPlayer.value?.id === props.roomPlayer.id
  );
});
</script>
```

## 3. 注册游戏

后端会自动扫描 `games` 目录下的文件，无需手动注册。

前端组件会自动根据后端返回的游戏类型加载对应的组件（命名需符合 `<Type>Room.vue` 规则）。

## 4. 运行测试

在 game 目录启动开发服务器：

```bash
npm run dev:frontend
npm run dev:backend # 或 VSCode 按下 F5 运行
```

访问前端页面，在`创建房间`选择 "我的游戏"，创建房间即可看到效果。
