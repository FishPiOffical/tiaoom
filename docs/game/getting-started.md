# 快速开始

本指南将通过一个简单的示例，演示如何添加一个新的游戏。

## 1. 创建后端逻辑

在 `game/backend/src/games` 目录下创建 `mygame.ts` 文件。

```typescript
import { Room, IGameMethod } from 'tiaoom';

export const name = '我的游戏';
export const minSize = 2;
export const maxSize = 2;
export const description = '这是一个示例游戏';

export default (room: Room, { save, restore }: IGameMethod) => {
  // 恢复游戏状态
  const state = restore();
  let count = state?.count || 0;

  // 监听房间事件
  room.on('join', (player) => {
    // 发送当前状态给新加入的玩家
    player.emit('command', { type: 'update', data: { count } });
  });

  // 监听玩家指令
  room.on('player-command', (msg) => {
    if (msg.type === 'click') {
      count++;
      // 广播新状态
      room.emit('command', { type: 'update', data: { count } });
      // 保存状态
      save({ count });
    }
  });
};
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
    
    <!-- 房间控制 -->
    <RoomControls 
      :game="game" 
      :room-player="roomPlayer" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import PlayerList from '@/components/player-list/PlayerList.vue';
import RoomControls from '@/components/common/RoomControls.vue';

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

启动开发服务器：

```bash
npm run dev
```

访问前端页面，创建一个新房间，选择 "我的游戏"，即可看到效果。
