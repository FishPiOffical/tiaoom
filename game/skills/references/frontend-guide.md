# 前端开发指南

## 基本组件结构

```vue
<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <!-- 左侧：游戏显示区域 -->
    <div class="flex-1 flex flex-col items-center justify-center">
      <h1 class="text-4xl font-bold">{{ gameState.count }}</h1>
      <!-- 游戏内容 -->
    </div>

    <!-- 右侧：操作区域（可选） -->
    <template #actions>
      <button @click="sendAction" class="btn btn-primary">
        执行操作
      </button>
    </template>

    <!-- 游戏规则（可选） -->
    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>🎮 规则 1</li>
        <li>🎮 规则 2</li>
      </ul>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

// Props 定义
const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

// 游戏状态
const gameState = ref<any>(null);

// 处理后端发送的指令
function onCommand(msg: any) {
  switch(msg.type) {
    case 'gameStart':
      gameState.value = msg.data;
      break;
    case 'update':
      Object.assign(gameState.value, msg.data);
      break;
    case 'status':  // 断线重连时的完整状态
      gameState.value = msg.data.gameState;
      break;
  }
}

// 发送操作到后端
function sendAction() {
  props.game.command(props.roomPlayer.room.id, {
    type: 'myAction',
    data: { /* 操作数据 */ }
  });
}

// 计算属性示例
const isMyTurn = computed(() => {
  return gameState.value?.currentPlayer?.id === props.roomPlayer.id;
});
</script>

<style scoped>
/* 添加你的样式 */
</style>
```

## GameView 组件

`GameView` 是所有游戏的顶层容器，提供标准的游戏布局。

### Props

| Props | 类型 | 说明 |
|-------|------|------|
| `roomPlayer` | RoomPlayer & { room: Room } | 房间内的玩家信息 |
| `game` | GameCore | 游戏核心实例 |

### Events

| Event | 参数 | 说明 |
|-------|------|------|
| `@command` | msg | 接收后端发送的指令 |

### Slots

| Slot | 说明 |
|------|------|
| `default` | 游戏主内容（左侧） |
| `#actions` | 操作按钮区域（右侧） |
| `#rules` | 游戏规则说明 |

## 预置组件

无需手动导入，可直接使用这些组件：

### PlayerList - 玩家列表

```vue
<PlayerList :players="players" />

<!-- Props -->
- players: RoomPlayer[] - 玩家列表
```

### AchievementTable - 胜负展示

```vue
<AchievementTable :winners="winners" :achievements="achievements" />

<!-- Props -->
- winners: RoomPlayer[] - 获胜者
- achievements: Achievement[] - 成就列表
```

### GameChat - 游戏内聊天

```vue
<GameChat :messages="messages" @send="onSendMessage" />

<!-- Props -->
- messages: Message[] - 聊天历史
```

### Icon - 图标组件

```vue
<Icon icon="mdi:heart" />
<Icon icon="mdi:star" size="lg" />

<!-- Props -->
- icon: string - Iconify 图标名称
- size: string - 大小（sm, md, lg）
```

### MessageBox - 消息弹窗

```vue
<MessageBox 
  title="确认" 
  message="是否继续？"
  @confirm="handleConfirm"
  @cancel="handleCancel"
/>

<!-- Props -->
- title: string - 标题
- message: string - 内容
- confirmText: string - 确认按钮文本（默认：确认）
- cancelText: string - 取消按钮文本（默认：取消）
```

### Message - 消息提示

```vue
<Message type="success" text="操作成功" />
<Message type="error" text="操作失败" />

<!-- Props -->
- type: 'success' | 'error' | 'warning' | 'info'
- text: string - 消息内容
```

## 全局状态管理

### useGameStore

```typescript
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore();

// 常用属性
gameStore.game              // GameCore 实例
gameStore.player            // 当前登录用户
gameStore.players           // 在线玩家列表
gameStore.rooms             // 可用游戏房间
gameStore.games             // 游戏配置列表
gameStore.roomPlayer        // 当前房间内玩家信息
gameStore.playerStatus      // 玩家状态
```

## 事件处理

### 监听游戏事件

```typescript
import { useGameEvents } from '@/hook/useGameEvents';

useGameEvents(game, {
  'room.start': onRoomStart,
  'room.end': onRoomEnd,
  'player.command': onCommand,
  'room.command': onRoomCommand,
});

function onRoomStart() {
  console.log('游戏开始');
}

function onRoomEnd() {
  console.log('游戏结束');
}
```

## 完整示例

### 简单的计数器游戏

```vue
<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <!-- 游戏显示 -->
    <div class="flex-1 flex flex-col items-center justify-center gap-8">
      <h1 class="text-6xl font-bold text-primary">
        {{ count }}
      </h1>
      <div class="text-xl">
        目标：{{ target }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #actions>
      <div class="flex gap-2">
        <button
          v-for="n in 4"
          :key="n"
          class="btn btn-primary btn-lg"
          @click="handleClick(n)"
          :disabled="!isMyTurn"
        >
          +{{ n }}
        </button>
      </div>
    </template>

    <!-- 游戏规则 -->
    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>🎮 轮流点击按钮增加计数</li>
        <li>🎯 达到目标数字时获胜</li>
        <li>💥 超过目标数字则平局</li>
      </ul>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const count = ref(0);
const target = ref(0);
const currentPlayerId = ref('');

function handleClick(n: number) {
  props.game.command(props.roomPlayer.room.id, {
    type: 'click',
    data: n
  });
}

function onCommand(msg: any) {
  switch(msg.type) {
    case 'gameStart':
      count.value = msg.data.count;
      target.value = msg.data.target;
      currentPlayerId.value = msg.data.currentPlayer.id;
      break;
    case 'update':
      count.value = msg.data.count;
      break;
    case 'turn':
      currentPlayerId.value = msg.data.currentPlayer.id;
      break;
    case 'status':
      count.value = msg.data.count;
      target.value = msg.data.target;
      currentPlayerId.value = msg.data.currentPlayer.id;
      break;
  }
}

const isMyTurn = computed(() => {
  return (
    props.roomPlayer.role === 'player' &&
    props.roomPlayer.room.status === 'playing' &&
    currentPlayerId.value === props.roomPlayer.id
  );
});
</script>

<style scoped>
:deep(.game-view) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
```

## 样式指南

### 使用 TailwindCSS

所有游戏都应使用 TailwindCSS 进行样式设计：

```vue
<template>
  <div class="flex flex-col items-center justify-center gap-4">
    <h1 class="text-4xl font-bold text-primary">标题</h1>
    <button class="btn btn-primary btn-lg">按钮</button>
    <p class="text-gray-600">描述文本</p>
  </div>
</template>
```

### 颜色主题

Tiaoom 使用 DaisyUI 主题，包含以下颜色变量：

- `primary` - 主色
- `secondary` - 副色
- `accent` - 强调色
- `success` - 成功
- `error` - 错误
- `warning` - 警告
- `info` - 信息

### 布局

推荐使用 Flexbox 进行布局：

```vue
<!-- 垂直居中布局 -->
<div class="flex flex-col items-center justify-center h-screen gap-4">
  <h1>标题</h1>
  <p>内容</p>
</div>

<!-- 网格布局 -->
<div class="grid grid-cols-3 gap-4">
  <div v-for="item in items" :key="item.id">{{ item }}</div>
</div>
```

## 最佳实践

### ✅ 推荐做法

1. **使用 computed 进行状态衍生**
   ```typescript
   const isMyTurn = computed(() => {
     return currentPlayerId.value === props.roomPlayer.id;
   });
   ```

2. **在 onCommand 中集中处理所有消息**
   ```typescript
   function onCommand(msg: any) {
     switch(msg.type) {
       case 'update':
         // 处理更新
         break;
     }
   }
   ```

3. **使用 :disabled 禁用非法操作**
   ```vue
   <button :disabled="!isMyTurn">操作</button>
   ```

4. **利用预置组件加快开发**
   ```vue
   <PlayerList :players="players" />
   <AchievementTable :winners="winners" />
   ```

### ❌ 避免做法

1. **不要频繁修改 props**
   ```typescript
   // ❌ 错误
   props.roomPlayer.id = 'new-id';
   ```

2. **不要跳过 @command 处理**
   ```typescript
   // ❌ 错误 - 后端消息无法接收
   // 必须绑定 @command
   ```

3. **不要在模板中进行复杂逻辑**
   ```vue
   <!-- ❌ 错误 -->
   <div v-if="players.filter(p => p.status === 'ready').length > 0">
   
   <!-- ✅ 正确 -->
   <div v-if="readyPlayers.length > 0">
   ```

4. **不要使用全局 CSS 污染其他组件**
   ```vue
   <style scoped>
   /* 总是使用 scoped -->
   </style>
   ```

## 调试技巧

### 在浏览器控制台查看消息

```typescript
function onCommand(msg: any) {
  console.log('Received message:', msg);
  // 处理消息
}
```

### 检查状态变化

```typescript
const gameState = ref<any>(null);

watch(() => gameState.value, (newVal) => {
  console.log('Game state changed:', newVal);
}, { deep: true });
```

### 验证事件发送

```typescript
function sendAction() {
  console.log('Sending command:', {
    type: 'myAction',
    data: { /* data */ }
  });
  props.game.command(props.roomPlayer.room.id, {
    type: 'myAction',
    data: { /* data */ }
  });
}
```

## 常见问题

### Q: 如何处理断线重连？

A: 在 onCommand 中处理 'status' 消息，它包含完整的游戏状态。

```typescript
case 'status':
  gameState.value = msg.data;
  break;
```

### Q: 如何显示倒计时？

A: 监听 'countdown' 消息并启动本地计时器。

```typescript
case 'countdown':
  countdown.value = msg.data.seconds;
  startLocalTimer();
  break;
```

### Q: 如何实现聊天功能？

A: 使用预置的 GameChat 组件，它自动处理消息显示。

```vue
<GameChat :messages="messages" @send="onSendMessage" />
```
