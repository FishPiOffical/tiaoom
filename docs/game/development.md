# 开发详解

可以通过在 `backend/src/games` 目录下添加新的游戏模块来扩展游戏内容。游戏界面组件位于 `frontend/src/components/` 目录下。

## 命名规范

游戏文件名需按照如下规则命名：

- 后端游戏逻辑文件：`<GameName>.ts`
- 前端游戏组件文件：`<GameName>Room.vue`
- 前端游戏小窗组件：`<GameName>Lite.ts`

## 后端开发

后端需暴露如下接口：

```typescript
import { Room, IGameMethod } from 'tiaoom';

export default (room: Room, { save, restore }: IGameMethod) => void
export const name = '游戏名称';
export const minSize = 2; // 最小玩家数
export const maxSize = 2; // 最大玩家数
export const description = `游戏描述`;
```

### 数据持久化

若要实现游戏游戏数据持久化，请使用 `save` 和 `restore` 方法。

```typescript
// 保存游戏状态
save({ gameData1: 'xxx', gameData2: 123 });

// 恢复游戏状态
const state = restore();
const gameData1 = state?.gameData1 || 'defaultValue';
const gameData2 = state?.gameData2 || 0;
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
