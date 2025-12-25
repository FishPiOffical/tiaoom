# 开发详解

可以通过在 `backend/src/games` 目录下添加新的游戏模块来扩展游戏内容。游戏界面组件位于 `frontend/src/components/` 目录下。

## 命名规范

游戏文件名需按照如下规则命名：

- 后端游戏逻辑文件：`<GameName>.ts`
- 前端游戏组件文件：`<GameName>Room.vue`
- 前端游戏小窗组件：`<GameName>Lite.ts`

## 后端开发

后端需暴露如下接口，并导出一个继承自 `GameRoom` 的类：

```typescript
import { GameRoom, IGameCommand } from '.';

export const name = '游戏名称';
export const minSize = 2; // 最小玩家数
export const maxSize = 2; // 最大玩家数
export const description = `游戏描述`;

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

### GameRoom 类详解

`GameRoom` 提供了游戏开发所需的基础功能。

#### 核心属性

- `room`: `Room` 实例，用于操作房间和玩家。
- `messageHistory`: 聊天消息历史。
- `achievements`: 玩家成就数据。
- `publicCommands`: 允许观众使用的指令列表，默认为 `['say', 'status']`。
- `saveIgnoreProps`: 保存状态时忽略的属性名列表。

#### 核心方法

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
- `save()`: 
  保存当前游戏状态。会自动保存类实例的所有属性（除了 `room` 和 `saveIgnoreProps` 中指定的属性）。可以在游戏逻辑中调用此方法以持久化数据。也可以等待服务自自动保存。自动保存节点：
  - 游戏开始/结束后
  - 玩家准备/取消准备时
  - 玩家加入/离开房间时
  - 收到消息时
  - 服务重启时
- `saveAchievements(winner?: RoomPlayer | null)`: 保存成就数据（胜/负/平）。
- `startTimer(callback, ms, name)`: 启动倒计时。
- `stopTimer(name)`: 停止倒计时。
- `restoreTimer(timer)`: 恢复倒计时（用于服务器重启后恢复状态）。

### 数据持久化

`GameRoom` 会自动处理数据持久化。当调用 `this.save()` 时，会将当前类实例的属性保存到数据库。

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

## 前端开发

### 组件 Props

前端组件包含如下属性：

```typescript
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()
```

### 状态管理

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
```

### 通用组件

前端可使用如下封装组件实现通用功能：

- `RoomControls`：房间控制面板，含开始游戏、准备等功能，会自动按照房间状态变化，有其他功能按钮，可以通过插槽插入。`RoomControlsLite` 为小窗版本。
- `PlayerList`：玩家列表
- `GameChat`：游戏内聊天
- `Icon`：图标组件，支持 Iconify 图标库
