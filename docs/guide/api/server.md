# 服务端 API

`Tiaoom` 类是服务端逻辑的主要入口点。此外，服务端还扩展了 `Room` 和 `Player` 类以提供游戏逻辑支持。

## `Tiaoom` {#tiaoom}

### 构造函数 {#constructor}

```typescript
constructor(options: ITiaoomOptions)
```

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `options` | `ITiaoomOptions` | 初始化选项。 |

### 方法 {#methods}

#### `run()` {#run}

启动游戏引擎并设置事件监听器。

**返回:** `this`

#### `on(event: TiaoomEvents, listener: Function): this` {#on}

监听服务器事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof TiaoomEvents`](./events.md#tiaoom-events) | 事件名称。 |
| `listener` | `Function` | 事件回调函数。 |

**返回:** `this`

#### `emit(event: TiaoomEvents, ...args: any[]): boolean` {#emit}

触发服务器事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof TiaoomEvents`](./events.md#tiaoom-events) | 事件名称。 |
| `args` | `any[]` | 事件参数。 |

**返回:** `boolean`

#### `searchPlayer(player: string | PlayerOptions | IRoomPlayerOptions): Player | undefined` {#searchplayer}

搜索玩家。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | `string` \| [`PlayerOptions`](./models.md#playeroptions) \| [`IRoomPlayerOptions`](./models.md#iroomplayeroptions) | 玩家 ID 或玩家选项对象。 |

**返回:** [`Player`](#player) \| `undefined`

#### `searchRoom(room: string | Partial<IRoomOptions>): Room | undefined` {#searchroom}

搜索房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `room` | `string` \| <code>Partial<[IRoomOptions](./models.md#iroomoptions)></code> | 房间 ID 或房间选项对象。 |

**返回:** [`Room`](#room) \| `undefined`

#### `createRoom(sender: IPlayer, options: IRoomOptions): Room` {#create-room}

创建一个新房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 创建房间的玩家。 |
| `options` | [`IRoomOptions`](./models.md#iroomoptions) | 房间选项。 |

**返回:** [`Room`](#room)

#### `startRoom(sender: IPlayer, room: IRoom): boolean` {#start-room}

开始房间游戏。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 发起操作的玩家。 |
| `room` | [`IRoom`](./models.md#iroom) | 要开始的房间。 |

**返回:** `boolean`

#### `closeRoom(sender: IPlayer, room: IRoom): Room` {#close-room}

关闭房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 发起操作的玩家（必须是房主）。 |
| `room` | [`IRoom`](./models.md#iroom) | 要关闭的房间。 |

**返回:** [`Room`](#room)

#### `kickPlayer(sender: IPlayer, data: { roomId: string, playerId: string }): IRoomPlayer | undefined` {#kick-player}

将玩家踢出房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 发起操作的玩家（必须是房主）。 |
| `data` | `{ roomId: string, playerId: string }` | 包含房间 ID 和目标玩家 ID 的对象。 |

**返回:** [`IRoomPlayer`](./models.md#iroomplayer) \| `undefined`

#### `transferOwner(sender: IPlayer, data: { roomId: string, playerId: string }): Room | undefined` {#transfer-owner}

转让房主权限。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 发起操作的玩家（必须是房主）。 |
| `data` | `{ roomId: string, playerId: string }` | 包含房间 ID 和目标玩家 ID 的对象。 |

**返回:** [`Room`](#room) \| `undefined`

#### `loginPlayer(player: PlayerOptions, cb?: (data: { player: Player }) => void): Player` {#login-player}

玩家登录。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | [`PlayerOptions`](./models.md#playeroptions) | 玩家选项。 |
| `cb` | `(data: { player: Player }) => void` (可选) | 回调函数。 |

**返回:** [`Player`](#player)

#### `joinPlayer(sender: IPlayer, player: IRoomPlayerOptions, isCreator?: boolean): IRoomPlayer | undefined` {#join-player}

玩家加入房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 发起操作的玩家。 |
| `player` | [`IRoomPlayerOptions`](./models.md#iroomplayeroptions) | 加入房间的选项。 |
| `isCreator` | `boolean` (可选) | 是否作为房主加入（默认为 `false`）。 |

**返回:** [`IRoomPlayer`](./models.md#iroomplayer) \| `undefined`

#### `leavePlayer(sender: IPlayer, player: IRoomPlayerOptions): IRoomPlayer | undefined` {#leave-player}

玩家离开房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 发起操作的玩家。 |
| `player` | [`IRoomPlayerOptions`](./models.md#iroomplayeroptions) | 离开房间的选项。 |

**返回:** [`IRoomPlayer`](./models.md#iroomplayer) \| `undefined`

#### `readyPlayer(sender: IPlayer, player: IRoomPlayer): this` {#ready-player}

玩家准备。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 发起操作的玩家。 |
| `player` | [`IRoomPlayer`](./models.md#iroomplayer) | 玩家对象。 |

**返回:** `this`

#### `unReadyPlayer(sender: IPlayer, player: IRoomPlayer): this` {#unready-player}

玩家取消准备。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 发起操作的玩家。 |
| `player` | [`IRoomPlayer`](./models.md#iroomplayer) | 玩家对象。 |

**返回:** `this`

#### `removePlayer(sender: IPlayer): Player | undefined` {#remove-player}

移除玩家（完全登出）。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | [`IPlayer`](./models.md#iplayer) | 要移除的玩家。 |

**返回:** [`Player`](#player) \| `undefined`

#### `toJSON(): { players: Player[]; rooms: Room[] }` {#room-tojson}

序列化当前服务器状态。

**返回:** <code>{ players: [`Player`](#player)[]; rooms: [`Room`](#room)[] }</code>

#### `loadFrom(data: { players: PlayerOptions[]; rooms: IRoomOptions[] }): this` {#loadfrom}

从序列化数据加载服务器状态。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `data` | <code>{ players: [Player](./models.md#player)[]; rooms: [Room](./models.md#room)[] }</code> | 序列化数据。 |

**返回:** `this`

#### `isAdmin(player: IPlayer): Promise<boolean>` {#is-admin}
检查玩家是否为管理员。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | [`IPlayer`](./models.md#iplayer) | 目标玩家。 |

**返回:** `Promise<boolean>` 默认返回 `false`。若有配置管理员需求，需重写此方法。

#### `isBanned(player: IPlayer): Promise<boolean>` {#is-banned}
检查玩家是否被封禁。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | [`IPlayer`](./models.md#iplayer) | 目标玩家。 |

**返回:** `Promise<boolean>` 默认返回 `false`。若有封禁需求，需重写此方法。

### 事件 {#room-events}

请参考 [事件文档](./events.md#tiaoom-events)。

## `Room` {#room}

服务端房间类，继承自 `EventEmitter` 并实现了 [`IRoom`](./models.md#iroom) 接口。

### 方法 {#room-methods}

#### `on(event: RoomEvents, listener: Function): this` {#room-on}

监听房间事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof RoomEvents`](./events.md#roomevents) | 事件名称。 |
| `listener` | `Function` | 事件回调函数。 |

**返回:** `this`

#### `emit(event: RoomEvents, ...args: any[]): boolean` {#room-emit}

触发房间事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof RoomEvents`](./events.md#roomevents) | 事件名称。 |
| `args` | `any[]` | 事件参数。 |

**返回:** `boolean`

#### `setCreator(player: Player): this` {#set-creator}

设置房主。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | [`Player`](#player) | 目标玩家。 |

**返回:** `this`

#### `addPlayer(player: Player, isCreator?: boolean): RoomPlayer` {#add-player}

添加玩家到房间。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | [`Player`](#player) | 要添加的玩家。 |
| `isCreator` | `boolean` (可选) | 是否设为房主。 |

**返回:** [`RoomPlayer`](./models.md#iroomplayer)

#### `kickPlayer(player: IPlayer | string): RoomPlayer` {#room-kick-player}

从房间踢出玩家。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | [`IPlayer`](./models.md#iplayer) \| `string` | 玩家对象或玩家 ID。 |

**返回:** [`RoomPlayer`](./models.md#iroomplayer)

#### `searchPlayer(player: IPlayer | string): RoomPlayer | undefined` {#room-search-player}

在房间内搜索玩家。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | [`IPlayer`](./models.md#iplayer) \| `string` | 玩家对象或玩家 ID。 |

**返回:** [`RoomPlayer`](./models.md#iroomplayer) \| `undefined`

#### `start(): boolean` {#start}

开始游戏。

**返回:** `boolean` (是否有监听器被触发)

#### `end(): boolean` {#end}

结束游戏。

**返回:** `boolean` (是否有监听器被触发)

#### `setSender(sender: (type: string, ...message: any) => void): this` {#room-set-sender}

设置房间的消息发送器。⚠️ **内部调用，一般不要使用。**

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | `Function` | 发送函数。 |

**返回:** `this`

### 属性 {#room-properties}

- `validPlayers`: [`RoomPlayer[]`](./models.md#iroomplayer) - 有效玩家列表（非旁观者）。
- `watchers`: [`RoomPlayer[]`](./models.md#iroomplayer) - 旁观者列表。
- `owner`: <code>[RoomPlayer](./models.md#iroomplayer) | undefined</code> - 房主玩家。
- `isReady`: `boolean` - 房间是否已准备好（人数满足且所有玩家已准备）。
- `status`: [`RoomStatus`](./models.md#roomstatus) - 房间状态。
- `isPlaying`: `boolean` - 是否正在游戏中。
- `isFull`: `boolean` - 房间是否已满。

## `Player` {#player}

服务端玩家类，继承自 `EventEmitter` 并实现了 [`IPlayer`](./models.md#iplayer) 接口。

### 方法 {#player-methods}

#### `on(event: PlayerEvents, listener: Function): this` {#player-on}

监听玩家事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof PlayerEvents`](./events.md#playerevents) | 事件名称。 |
| `listener` | `Function` | 事件回调函数。 |

**返回:** `this`

#### `emit(event: PlayerEvents, ...args: any[]): boolean` {#player-emit}

触发玩家事件。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `event` | [`keyof PlayerEvents`](./events.md#playerevents) | 事件名称。 |
| `args` | `any[]` | 事件参数。 |

**返回:** `boolean`

#### `setSender(sender: (type: string, ...message: any) => void): this` {#player-set-sender}

设置玩家的消息发送器。⚠️ **内部调用，一般不要使用。**

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `sender` | `Function` | 发送函数。 |

**返回:** `this`
