# 快速开始

本指南将通过一个简单的示例，演示如何添加一个新的游戏。

## 1. 创建后端逻辑

在 `game/backend/src/games` 目录下创建 `mygame.ts` 文件。

```typescript
import { GameRoom, IGameCommand } from '.';

// 定义游戏基本属性
export const name = '我的游戏'; // 游戏名称
export const minSize = 2; // 最小玩家数
export const maxSize = 2; // 最大玩家数
export const description = '这是一个示例游戏'; // 游戏描述

export default class MyGameRoom extends GameRoom {
  count = 0;

  // 游戏开始时调用
  onStart() {
    this.count = 0;
    // 广播初始状态
    this.room.emit('command', { type: 'update', data: { count: this.count } });
  }

  // 处理玩家指令
  onCommand(message: IGameCommand) {
    super.onCommand(message); // 处理通用指令
    if (message.type === 'click') {
      this.count++;
      // 广播新状态
      this.room.emit('command', { type: 'update', data: { count: this.count } });
      // 保存状态
      this.save();
    }
  }

  // 获取当前游戏状态（用于断线重连等）
  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      count: this.count,
    };
  }
}
```

## 2. 创建前端组件

在 `game/frontend/src/components/games` 目录下创建 `MygameRoom.vue` 文件。

```vue
<template>
  <div class="flex flex-col items-center justify-center h-full gap-4">
    <h1 class="text-4xl font-bold">{{ count }}</h1>
    <button class="btn btn-primary" @click="handleClick">点击 +1</button>
    
    <!-- 玩家列表 -->
    <PlayerList :players="roomPlayer.room.players" />
    
    <!-- 聊天窗口与游戏规则 -->
    <GameChat>
      <template #rules>
        <ul class="space-y-2 text-sm">
          <li>1. 游戏规则1</li>
          <li>2. 游戏规则2</li>
        </ul>
      </template>
    </GameChat>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>();

const count = ref(0);

function handleClick() {
  props.game.command({ type: 'click' });
}

onMounted(() => {
  // 监听后端消息
  props.game.on('command', (msg) => {
    if (msg.type === 'update') {
      count.value = msg.data.count;
    }
  });
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
