# 数据模型 (Models)

这里详细列出了 `tiaoom` 中使用的数据模型接口。

## Player (玩家)

### IPlayer

玩家的基本信息接口。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | `string` | 玩家的唯一标识符。 |
| `name` | `string` | 玩家的显示名称。 |
| `attributes` | `any` | 玩家的属性集合（可选）。 |
| `status` | [`PlayerStatus`](#playerstatus) | 玩家的当前状态。 |

### PlayerOptions

创建玩家时的选项接口。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | `string` | 玩家的唯一标识符。 |
| `name` | `string` | 玩家的显示名称。 |
| `attributes` | `any` | 玩家的属性集合（可选）。 |

### PlayerStatus

玩家的状态枚举。

| 枚举值 | 值 | 描述 |
| :--- | :--- | :--- |
| `online` | `'online'` | 玩家在线。 |
| `offline` | `'offline'` | 玩家离线。 |
| `ready` | `'ready'` | 玩家已准备。 |
| `unready` | `'unready'` | 玩家取消准备。 |
| `gaming` | `'gaming'` | 玩家正在游戏中。 |

## Room (房间)

### IRoom

房间的基本信息接口。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | `string` | 房间的唯一标识符。 |
| `name` | `string` | 房间的名称。 |
| `size` | `number` | 房间最大玩家数量。 |
| `minSize` | `number` | 房间最小玩家数量。 |
| `attrs` | `Record<string, any>` | 房间的自定义属性。 |
| `players` | [`IRoomPlayer[]`](#iroomplayer) | 房间内的玩家列表。 |

### IRoomOptions

创建房间时的选项接口。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | `string` | 房间的唯一标识符。 |
| `name` | `string` | 房间的名称。 |
| `size` | `number` | 房间最大玩家数量。 |
| `minSize` | `number` | 房间最小玩家数量。 |
| `attrs` | `Record<string, any>` | 房间的自定义属性。 |

### IRoomPlayer

房间内的玩家接口，继承自 [`IPlayer`](#iplayer)。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `isReady` | `boolean` | 玩家是否已准备。 |
| `isCreator` | `boolean` | 玩家是否是房主。 |
| `roomId` | `string` | 玩家所在的房间 ID。 |
| `isWatcher` | `boolean` (可选) | 玩家是否是旁观者。 |

### IRoomPlayerOptions

加入房间时的玩家选项接口，继承自 [`PlayerOptions`](#playeroptions)。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `roomId` | `string` | 要加入的房间 ID。 |
| `isWatcher` | `boolean` (可选) | 是否作为旁观者加入。 |

### RoomStatus

房间的状态枚举。

| 枚举值 | 值 | 描述 |
| :--- | :--- | :--- |
| `waiting` | `'waiting'` | 等待玩家加入。 |
| `ready` | `'ready'` | 所有玩家已准备。 |
| `playing` | `'playing'` | 游戏进行中。 |

## Message (消息)

### MessagePackage

消息包接口，用于在客户端和服务器之间传输数据。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `type` | [`MessageTypes`](#messagetypes) \| `string` | 消息类型。 |
| `data` | `any` (可选) | 消息数据，可以是 `PlayerOptions`, `IRoomOptions`, `IPlayer`, `IRoom`, `IRoomPlayer` 等。 |
| `sender` | [`IPlayer`](#iplayer) \| [`IRoom`](#iroom) \| [`IRoomPlayer`](#iroomplayer) (可选) | 消息发送者。 |

### MessageTypes

消息类型枚举。

| 枚举值 | 值 | 描述 |
| :--- | :--- | :--- |
| `RoomList` | `'room.list'` | 房间列表更新。 |
| `RoomCreate` | `'room.create'` | 创建房间。 |
| `RoomReady` | `'room.ready'` | 房间准备。 |
| `RoomStart` | `'room.start'` | 房间开始游戏。 |
| `RoomEnd` | `'room.end'` | 房间结束游戏。 |
| `RoomClose` | `'room.close'` | 房间关闭。 |
| `RoomAllReady` | `'room.allready'` | 房间内所有玩家已准备。 |
| `RoomCommand` | `'room.command'` | 房间命令。 |
| `RoomMessage` | `'room.message'` | 房间消息。 |
| `PlayerOffline` | `'player.offline'` | 玩家离线。 |
| `PlayerList` | `'player.list'` | 玩家列表更新。 |
| `PlayerLogin` | `'player.login'` | 玩家登录。 |
| `PlayerLogout` | `'player.logout'` | 玩家登出。 |
| `PlayerJoin` | `'player.join'` | 玩家加入房间。 |
| `PlayerLeave` | `'player.leave'` | 玩家离开房间。 |
| `PlayerReady` | `'player.ready'` | 玩家准备。 |
| `PlayerUnready` | `'player.unready'` | 玩家取消准备。 |
| `PlayerCommand` | `'player.command'` | 玩家命令。 |
