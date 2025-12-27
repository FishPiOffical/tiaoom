# 开发详解

可以通过在 `backend/src/games` 目录下添加新的游戏模块来扩展游戏内容。游戏界面组件位于 `frontend/src/components/` 目录下。

## 命名规范

游戏文件名需按照如下规则命名：

- 后端游戏逻辑文件：`<GameName>.ts`
- 前端游戏组件文件：`<GameName>Room.vue`
- 前端游戏小窗组件(可选)：`<GameName>Lite.vue`

## 后端开发

后端需暴露如下接口，并导出一个继承自 `GameRoom` 的类：

```typescript
import { GameRoom, IGameCommand } from '.';

export const name = '游戏名称';
export const minSize = 2; // 最小玩家数
export const maxSize = 2; // 最大玩家数
export const description = `游戏描述`;
export const points = { // 可选，房间开局所需积分
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}
export const rates = { // 可选，房间奖励积分倍率
  '我就玩玩': 1,
  '双倍奖励': 2,
  '玩的就是心跳': 5,
}


export default class MyGameRoom extends GameRoom {
  // ... 实现游戏逻辑
  onStart() {
    // 游戏开始时调用
  }

  onCommand(message: IGameCommand) {
    // 处理玩家指令
    super.onCommand(message); // 处理通用指令
    // ...
  }
}
```

> [!IMPORTANT]
> 游戏结束一定要调用 `this.room.end()` 方法，否则房间状态没有变更，由此会导致玩家无法离开房间。

## 前端开发

前端游戏组件需接收如下 Props：

```typescript
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()
```

建议采用布局：

```vue
<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <!-- 左侧：游戏区域 -->
    <div class="flex-1 flex items-center justify-center">
      <!-- 游戏内容 -->
    </div>

    <!-- 右侧：侧边栏 -->
    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <!-- 聊天与游戏规则 -->
      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. 游戏规则。</li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>
```

## 数据持久化

`GameRoom` 会自动处理数据持久化。也可以调用 `this.save()` 方法，手动将当前类实例的属性保存到数据库。

在游戏恢复时（如服务器重启），系统会自动重新实例化 `GameRoom` 并将保存的数据赋值回实例属性。

如果某些属性不需要保存（例如临时的计算缓存），可以将其名称添加到 `saveIgnoreProps` 数组中。

```typescript
export default class MyGame extends GameRoom {
  score = 0; // 会被保存
  tempData = 'xxx'; // 也会被保存

  constructor(room: Room) {
    super(room);
    this.saveIgnoreProps.push('tempData'); // tempData 不会被保存
  }
  
  // ...
}
```

在如下节点，系统会自动调用 `this.save()` 保存数据：

- 游戏开始/结束后
- 玩家准备/取消准备后
- 玩家加入/离开房间后
- 收到消息后
- 服务重启前

## 前端状态管理

`useGameStore` 提供游戏状态管理，方便在组件间共享游戏状态。

| 属性/方法 | 类型 | 描述 |
| :--- | :--- | :--- |
| `game` | `GameCore` | 游戏核心实例，用于与服务器通信，继承自 Tiaoom |
| `player` | `User` | 当前登录的用户信息 |
| `players` | `Player[]` | 当前在线玩家列表 |
| `rooms` | `Room[]` | 当前房间列表 |
| `games` | `Record<string, GameConfig>` | 游戏配置信息 |
| `globalMessages` | `Message[]` | 全局聊天消息列表 |
| `roomPlayer` | `RoomPlayer` | 当前用户在房间中的玩家对象（含房间信息） |
| `playerStatus` | `string` | 当前用户的状态 |
| `initConfig()` | `Promise<void>` | 初始化加载游戏配置，游戏内无需调用 |
| `checkSession()` | `Promise<boolean>` | 检查用户登录会话状态，游戏内无需调用 |
| `initGame()` | `GameCore` | 初始化游戏连接，建立 WebSocket，游戏内无需调用 |
| `login(name)` | `Promise<boolean>` | 用户登录，游戏内无需调用 |
| `logout()` | `Promise<boolean>` | 用户登出，游戏内无需调用 |

#### 使用示例

```typescript
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore();

// 获取当前用户信息
const myId = gameStore.player?.id;

// 获取当前房间信息
const currentRoom = gameStore.roomPlayer?.room;

// 判断是否为房主
const isOwner = gameStore.roomPlayer?.isCreator;

// 获取游戏核心实例
const game = gameStore.game;
```

## 前端游戏事件监听

有时候我们需要监听 `game` 对象的事件，以便处理一些自定义逻辑。可以通过如下方式监听：

```typescript
function onCommand(msg: IGameCommand) {
  // 处理消息
}
function onRoomStart() {
  // 游戏开始
}
function onRoomEnd() {
  // 游戏结束
}
game.on('player.command', onCommand);
game.on('room.command', onCommand);
game.on('room.start', onRoomStart);
game.on('room.end', onRoomEnd);
// ...等等
```

当游戏组件卸载时，则需要调用 `off` 方法移除监听：

```typescript
game.off('player.command', onCommand);
game.off('room.command', onCommand);
game.off('room.start', onRoomStart);
game.off('room.end', onRoomEnd);
```

为了方便开发，可以使用 `useGameEvents` 组合函数来自动管理事件监听：

```typescript
import { useGameEvents } from '@/hook/useGameEvents';

useGameEvents(game, {
  'room.start': onRoomStart,
  'room.end': onRoomEnd,
  'player.command': onCommand,
  'room.command': onCommand,
});
```

## 倒计时

`GameRoom` 内置了倒计时功能，可用于限制玩家操作时间。

### 创建与使用

使用 `startTimer` 方法启动倒计时，使用 `stopTimer` 方法停止倒计时。

```typescript
// 启动名为 'turn' 的倒计时，时长 30 秒
// 会自动广播 { type: 'countdown', data: { name: 'turn', seconds: 30 } }
this.startTimer(() => {
  this.handleTurnTimeout();
}, 30 * 1000, 'turn');

// 停止倒计时
this.stopTimer('turn');
```

### 响应倒计时

后端调用 `startTimer` 时，会自动向房间广播 `countdown` 指令。前端需监听该指令并显示倒计时。

```typescript
game.on('command', (msg) => {
  if (msg.type === 'countdown') {
    // 设置倒计时，有需要可根据 name 字段区分不同倒计时
    const { seconds, name } = msg.data;
    countdown.value = seconds;
    
    // 启动本地计时器递减
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) clearInterval(timer);
    }, 1000);
  }
});
```

### 初始化与恢复

为了防止服务器重启导致倒计时丢失，需要在 `init` 方法中注册恢复回调。同时，在 `getStatus` 中返回剩余时间，以便玩家重连时同步。

```typescript
init() {
  // 注册倒计时恢复回调（用于服务器重启后恢复）
  this.restoreTimer({
    turn: () => this.handleTurnTimeout(),
  });
  return super.init();
}
```

前端可以从 `status` 指令中获取结束时间来计算剩余时间：

```typescript
game.on('command', (msg) => {
  if (msg.type === 'status') {
    countdown.value = msg.data.tickTimeEnd['turn'] 
      ? Math.max(0, Math.ceil((msg.data.tickTimeEnd['turn'] - Date.now()) / 1000)) 
      : 0;
    
    // 启动本地计时器递减
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) clearInterval(timer);
    }, 1000);
  }
});
```

### 完整示例

后端代码

```typescript
export default class MyGame extends GameRoom {
  // ...

  init() {
    // 注册倒计时恢复回调
    this.restoreTimer({
      turn: () => this.handleTurnTimeout(),
    });
    return super.init();
  }

  startTurn() {
    this.startTimer(() => {
      this.handleTurnTimeout();
    }, 30 * 1000, 'turn');
  }

  handleTurnTimeout() {
    this.room.emit('message', { content: '时间到！' });
  }

  stopTurn() {
    this.stopTimer('turn');
  }
}
```

前端代码

```typescript
// useGame.ts
import { ref } from 'vue';

export function useGame(game: GameCore) {
  const countdown = ref(0);
  let timer: any = null;

  function startLocalTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) clearInterval(timer);
    }, 1000);
  }

  game.on('command', (msg) => {
    switch(msg.type) {
      case 'countdown':
        countdown.value = msg.data.seconds;
        startLocalTimer();
        break;
      case 'status':
        if (msg.data.tickTimeEnd['turn']) {
          countdown.value = msg.data.tickTimeEnd['turn'] 
            ? Math.max(0, Math.ceil((msg.data.tickTimeEnd['turn'] - Date.now()) / 1000)) 
            : 0;
          startLocalTimer();
        }
        break;
    }
  });

  return { countdown };
}
```

## GameRoom 核心属性与方法

### 核心属性

- `room`: `Room` 实例，用于操作房间和玩家。
- `messageHistory`: 聊天消息历史。
- `achievements`: 玩家成就数据。
- `publicCommands`: 允许观众使用的指令列表，默认为 `['say', 'status']`。
- `saveIgnoreProps`: 保存状态时忽略的属性名列表。

### 核心方法

- `init()`: 
  初始化游戏房间。可在此监听房间事件（如 `join`, `player-offline`）。需调用 `super.init()`。
- `onStart()`: 
  **[必须实现]** 游戏开始时调用。
- `onCommand(message: IGameCommand)`: 
  处理玩家指令。建议调用 `super.onCommand(message)` 以处理通用指令（如聊天）。
- `onSay(message: IGameCommand)`: 
  处理玩家聊天消息。
- `getStatus(sender: IRoomPlayer)`: 
  获取当前游戏状态。用于玩家重连或获取最新状态。需调用 `super.getStatus(sender)` 并合并自定义状态。在玩家登录或进入房间时前端会通过 `status` 指令获取到此状态。
- `say(content: string, sender?: IRoomPlayer)`: 
  广播聊天消息。
- `sayTo(content: string, receiver: RoomPlayer)`: 
  向指定玩家发送私聊消息。
- `command(type: string, data?: any)`: 
  向所有玩家发送游戏指令。
- `commandTo(type: string, data: any, receiver: RoomPlayer)`: 
  向指定玩家发送游戏指令。
- `virtualCommand(type: string, data: any, receiver: RoomPlayer)`: 
  模拟玩家发出房间指令，用于模拟触发玩家行为。
- `save()`: 
  保存当前游戏状态。可以在游戏逻辑中调用此方法以持久化数据。
- `saveAchievements(winner?: RoomPlayer | null)`: 
  保存成就数据（胜/负/平），不传则表示平局。若有胜负且配置了积分奖励，将会执行积分奖励。
- `saveScore(score: number)`: 
  保存玩家分数，若保存分数，则个人页面将不会显示胜负数据，而只会显示历史最高得分。
- `getMaxScore(player: RoomPlayer)`: 
  获取玩家历史最高分数。
- `startTimer(callback, ms, name)`: 
  启动倒计时。
- `stopTimer(name)`: 
  停止倒计时。
- `restoreTimer(timer)`: 
  恢复倒计时（用于服务器重启后恢复状态）。

## 前端通用组件

前端可使用如下封装组件实现通用功能：

- [`PlayerList`](./components/PlayerList.md)：玩家列表
- [`AchievementTable`](./components/AchievementTable.md)：胜负展示
- [`GameChat`](./components/GameChat.md)：游戏内聊天
- [`Icon`](./components/Icon.md)：图标组件，支持 Iconify 图标库
- [`MessageBox`](./components/MessageBox.md)：消息弹窗
- [`Message`](./components/Message.md)：消息提醒

> 这些组件无需手动引入，可直接通过组件名使用。