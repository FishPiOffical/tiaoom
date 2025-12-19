# 客户端 API

`tiaoom/client` 中的 `Tiaoom` 类提供了与游戏服务器交互的方法。

## 类: `Tiaoom`

### 构造函数

```typescript
constructor()
```

### 抽象方法

你必须在子类中实现这些方法：

#### `connect(): void` {#connect}

建立连接。

#### `send(message: { type: MessageTypes, data?: any }): void` {#send}

发送消息到服务器。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `message` | `{ type: `[`MessageTypes`](./models.md#messagetypes-client)`, data?: any }` | 要发送的消息对象。 |

### 方法

#### `run(): this` {#run}

启动游戏客户端，建立连接并初始化监听器。

**返回:** `this`

#### `login(player: Player): this` {#login}

登录玩家。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | [`Player`](./models.md#iplayer) | 玩家信息对象。 |

**返回:** `this`

#### `createRoom(options: IRoomOptions): Promise<void>` {#createroom}

请求创建房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `options` | [`IRoomOptions`](./models.md#iroomoptions) | 房间选项。 |

**返回:** `Promise<void>`

#### `joinRoom(roomId: string): this` {#joinroom}

请求加入房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `roomId` | `string` | 房间 ID。 |
| `params` | `any` (可选) | 额外参数。 |

**返回:** `this`

#### `leaveRoom(roomId: string): this` {#leaveroom}

请求离开房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `roomId` | `string` | 房间 ID。 |
| `params` | `any` (可选) | 额外参数。 |

**返回:** `this`

#### `leaveSeat(roomId: string, params?: any): this` {#leaveseat}

请求离开座位（变为观众）。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `roomId` | `string` | 房间 ID。 |
| `params` | `any` (可选) | 额外参数。 |

**返回:** `this`

#### `kickPlayer(roomId: string, playerId: string): this` {#kickplayer}

将玩家踢出房间（仅限房主或管理员）。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `roomId` | `string` | 房间 ID。 |
| `playerId` | `string` | 目标玩家 ID。 |
| `params` | `any` (可选) | 额外参数。 |

**返回:** `this`

#### `transferRoom(roomId: string, playerId: string): this` {#transferroom}

转让房主权限（仅限房主或管理员）。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `roomId` | `string` | 房间 ID。 |
| `playerId` | `string` | 目标玩家 ID。 |
| `params` | `any` (可选) | 额外参数。 |

**返回:** `this`

#### `closeRoom(id: string): this` {#closeroom}

请求关闭房间（仅限房主或管理员）。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | `string` | 房间 ID。 |
| `params` | `any` (可选) | 额外参数。 |

**返回:** `this`

#### `startGame(id: string): this` {#startgame}

请求开始游戏（仅限房主或管理员）。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | `string` | 房间 ID。 |
| `params` | `any` (可选) | 额外参数。 |

**返回:** `this`

#### `ready(roomId: string, isReady?: boolean): this` {#ready}

设置玩家准备状态。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `roomId` | `string` | 房间 ID。 |
| `isReady` | `boolean` (可选) | 是否准备，默认为 `true`。 |
| `params` | `any` (可选) | 额外参数。 |

**返回:** `this`

#### `command(command: any): this` {#command}
#### `command(roomId: string, command: any): this` {#command-overload}

发送游戏命令。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `roomId` | `string` (可选) | 房间 ID。如果不提供，则发送全局命令。 |
| `command` | `any` | 命令数据。 |

**返回:** `this`

### 事件监听方法

#### `onReady(cb: (...args: any[]) => void): this` {#onready}

监听连接准备就绪事件。

#### `onPlayerList(cb: (players: Player[]) => void): this` {#onplayerlist}

监听玩家列表变更事件。

#### `onRoomList(cb: (rooms: Room[]) => void): this` {#onroomlist}

监听房间列表变更事件。

### 事件

`Tiaoom` 客户端类自行实现了简易的 `EventEmitter`，并会转发来自服务器的事件。请参考 [事件文档](./events.md)。

> [!NOTE]
> 服务端与客户端的事件定义均为 `TiaoomEvents` ，但内容并不完全相同。

#### `on(event: TiaoomEvents, listener: Function): this` {#on}

监听事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof TiaoomEvents`](./events.md#client-tiaoom-events) | 事件名称。 |
| `listener` | `Function` | 监听函数。 |

**返回:** `this`

#### `off(event: TiaoomEvents, listener: Function): this` {#off}

取消监听事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof TiaoomEvents`](./events.md#client-tiaoom-events) | 事件名称。 |
| `listener` | `Function` | 监听函数。 |

**返回:** `this`

#### `emit(event: ClientTiaoomEvents, ...args: any[]): this` {#emit}

触发事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof ClientTiaoomEvents`](./events.md#client-tiaoom-events) | 事件名称。 |
| `args` | `any[]` | 参数。 |

**返回:** `this`
