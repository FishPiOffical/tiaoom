# 快速开始

本指南将通过一个简单的示例，演示如何添加一个新的游戏。

## 1. 创建后端逻辑

在 `game/backend/src/games` 目录下创建 `click.ts` 文件。

```typescript
import { GameRoom, IGameCommand } from '.';
import { RoomPlayer, PlayerRole } from 'tiaoom';

// 定义游戏基本属性
export const name = '抢数字'; // 游戏名称
export const minSize = 2; // 最小玩家数
export const maxSize = 2; // 最大玩家数
export const description = '玩家轮流点击按钮增加计数，谁让计数变成指定数字谁就获胜。'; // 游戏描述

export default class ClickRoom extends GameRoom {
  count = 0;
  currentPlayer: RoomPlayer | undefined;
  target = 0;
  history: { playerId: string; increment: number; time: number }[] = [];

  // 游戏开始时调用
  onStart() {
    this.count = 0;
    this.history = [];

    this.currentPlayer = this.room.validPlayers.find(p => p.id !== this.currentPlayer?.id);
    this.target = Math.floor(Math.random() * 40) + 20; // 随机目标数字在 20-60 之间
    
    // 广播初始状态
    this.room.emit('command', { type: 'update', data: { count: this.count, target: this.target } });
    this.room.emit('command', { type: 'click', data: { player: this.currentPlayer } });
  }

  // 处理玩家指令
  onCommand(message: IGameCommand) {
    super.onCommand(message); // 处理通用指令
    if (message.type === 'click') {
      // 计算增加的数值，确保在 1-4 之间
      const increment = Number(message.data - 1) % 4 + 1;
      this.count += increment;

      // 记录历史
      this.history.push({ playerId: message.sender.id, increment, time: Date.now() - this.beginTime });
      
      // 广播新状态
      this.room.emit('command', { type: 'update', data: { count: this.count } });

      // 保存状态
      this.save();
      if (this.count  === this.target) {
        this.saveAchievements(this.room.validPlayers.filter(p => p.id === message.sender.id));
        this.say(`${message.sender.name} 计数达到 ${this.count}，获胜！`);
      } else if (this.count > this.target) {
        // 大于目标分算平，无胜者
        this.saveAchievements();
        this.say(`${message.sender.name} 计数达到 ${this.count}，超过目标分，打平！`);
      } else {
        // 未达到目标数字继续游戏
        this.currentPlayer = this.room.validPlayers.find(p => p.id !== message.sender.id);
        this.room.emit('command', { type: 'click', data: { player: this.currentPlayer } });
        return;
      }
      // 大于等于目标数字，游戏结束
      this.room.end();
    }
  }

  // 获取当前游戏状态（用于断线重连等）
  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      count: this.count,
      target: this.target,
      currentPlayer: this.currentPlayer,
    };
  }

  getData() {
    return {
      ...super.getData(),
      target: this.target,
      history: this.history,
      players: this.room.validPlayers.map(p => ({ id: p.id, name: p.name })),
    };
  }
}
```

## 2. 创建前端组件

在 `game/frontend/src/components/click` 目录下创建 `useClick.ts` 文件，编写游戏前端逻辑。

```typescript
import { GameCore } from "@/core/game";
import { Room, RoomPlayer } from "tiaoom/client";
import { computed, ref } from "vue";

export function useClick(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const count = ref(0);
  const target = ref(0);

  // 处理按钮点击
  function handleClick(n: number) {
    game.command(roomPlayer.room.id, { type: "click", data: n });
  }

  // 当前操作的玩家
  const currentPlayer = ref<RoomPlayer | null>(null);

  // 处理来自后端的指令
  function onCommand(msg: any) {
    switch(msg.type) {
      // 点击用户切换
      case "click":
        if (msg.data.player) {
          currentPlayer.value = msg.data.player;
        }
        break;
      // 更新计数
      case "update":
        count.value = msg.data.count;
        if (msg.data.target) {
          target.value = msg.data.target;
        }
        break;
      // 游戏状态恢复
      case "status":
        currentPlayer.value = msg.data.currentPlayer;
        target.value = msg.data.target || 0;
        count.value = msg.data.count || 0;
        break;
    }
  }

  // 判断当前玩家是否可以操作
  const isPlaying = computed(() => {
    return (
      roomPlayer.role === "player" &&
      roomPlayer.room.status === "playing" &&
      currentPlayer.value?.id === roomPlayer.id
    );
  });

  return {
    onCommand,
    handleClick,
    isPlaying,
    count,
    target,
    currentPlayer,
  }
}
```

然后创建 `ClickRoom.vue` 组件，编写游戏界面。

```vue
<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <!-- 左侧：游戏区域 -->
    <div class="flex-1 flex flex-col items-center justify-center">
      <h1 class="text-[50px] font-bold p-4">
        {{ count }} {{ count == target ? "=" : "!" }}= {{ target }}
      </h1>
      <!-- 操作按钮 -->
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

访问前端页面，在`创建房间`选择 "抢数字"，创建房间即可看到效果。
