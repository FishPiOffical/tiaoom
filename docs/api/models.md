# 数据模型 (Models)

这里详细列出了 `tiaoom` 中使用的数据模型接口。

## Player (玩家) {#player}

### IPlayer

玩家的基本信息接口。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | `string` | 玩家的唯一标识符。 |
| `name` | `string` | 玩家的显示名称。 |
| `attributes` | `any` | 玩家的属性集合（可选）。 |
| `status` | [`PlayerStatus`](#playerstatus) | 玩家的当前状态。 |

### IPlayerOptions

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

## Room (房间) {#room}

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

## IMessage (消息) {#imessage}

### IMessagePackage

消息包接口，用于在服务器给客户发送数据。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `type` | [`MessageTypes`](#messagetypes-server) \| `string` | 消息类型。 |
| `data` | `any` (可选) | 消息数据，可以是 `PlayerOptions`, `IRoomOptions`, `IPlayer`, `IRoom`, `IRoomPlayer` 等。 |
| `sender` | [`IPlayer`](#iplayer) \| [`IRoom`](#iroom) \| [`IRoomPlayer`](#iroomplayer) (可选) | 消息发送者。 |

### IMessageData

消息包接口，用于在服务器接收客户端发送的数据。（必定包含发送者信息）

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `type` | [`MessageTypes`](#messagetypes-client) \| `string` | 消息类型。 |
| `data` | `any` (可选) | 消息数据，可以是 `PlayerOptions`, `IRoomOptions`, `IPlayer`, `IRoom`, `IRoomPlayer` 等。 |
| `sender` | [`IPlayer`](#iplayer) \| [`IRoom`](#iroom) \| [`IRoomPlayer`](#iroomplayer) | 消息发送者。 |

### MessageTypes (Server) {#messagetypes-server}

消息类型枚举（服务端定义，用于 `tiaoom` 包）。

| 枚举值 | 值 | 描述 |
| :--- | :--- | :--- |
| `RoomList` | `'room.list'` | 房间列表更新。 |
| `RoomCreate` | `'room.create'` | 创建房间。 |
| `RoomUpdate` | `'room.update'` | 更新房间信息。 |
| `RoomReady` | `'room.ready'` | 房间准备就绪。 |
| `RoomStart` | `'room.start'` | 房间开始游戏。 |
| `RoomEnd` | `'room.end'` | 房间结束游戏。 |
| `RoomClose` | `'room.close'` | 房间关闭。 |
| `RoomAllReady` | `'room.all-ready'` | 房间内所有玩家已准备。 |
| `RoomCommand` | `'room.command'` | 房间命令。 |
| `RoomPlayerCommand` | `'room.player-command'` | 房间内玩家命令。 |
| `RoomMessage` | `'room.message'` | 房间消息。 |
| `RoomJoin` | `'room.join'` | 玩家加入房间。 |
| `RoomLeave` | `'room.leave'` | 玩家离开房间。 |
| `RoomKick` | `'room.kick'` | 房间踢出玩家。 |
| `RoomTransfer` | `'room.transfer'` | 房间转移。 |
| `RoomPlayerReady` | `'room.player-ready'` | 房间内玩家准备。 |
| `RoomPlayerUnready` | `'room.player-unready'` | 房间内玩家取消准备。 |
| `PlayerList` | `'player.list'` | 玩家列表更新。 |
| `PlayerLogin` | `'player.login'` | 玩家登录。 |
| `PlayerLogout` | `'player.logout'` | 玩家登出。 |
| `PlayerMessage` | `'player.message'` | 玩家消息。 |
| `PlayerCommand` | `'player.command'` | 玩家命令。 |
| `PlayerReady` | `'player.ready'` | 玩家准备。 |
| `PlayerUnready` | `'player.unready'` | 玩家取消准备。 |
| `GlobalCommand` | `'global.command'` | 全局命令。 |
| `GlobalMessage` | `'global.message'` | 全局消息。 |
| `GlobalError` | `'global.error'` | 全局错误。 |
| `SysReady` | `'sys.ready'` | 连接准备就绪。 |
| `SysClose` | `'sys.close'` | 连接关闭。 |
| `SysError` | `'sys.error'` | 连接错误。 |

### MessageTypes (Client) {#messagetypes-client}

消息类型枚举（客户端定义，用于 `tiaoom/client` 包）。

| 枚举值 | 值 | 描述 |
| :--- | :--- | :--- |
| `RoomList` | `'room.list'` | 请求房间列表。 |
| `PlayerList` | `'player.list'` | 请求玩家列表。 |
| `RoomCreate` | `'room.create'` | 请求创建房间。 |
| `PlayerJoin` | `'player.join'` | 请求加入房间。 |
| `PlayerLeave` | `'player.leave'` | 请求离开房间。 |
| `RoomGet` | `'room.get'` | 请求获取房间信息。 |
| `RoomStart` | `'room.start'` | 请求开始游戏。 |
| `RoomKick` | `'room.kick'` | 请求踢出玩家。 |
| `RoomTransfer` | `'room.transfer'` | 请求转让房主。 |
| `RoomClose` | `'room.close'` | 请求关闭房间。 |
| `PlayerLogin` | `'player.login'` | 请求登录。 |
| `PlayerLogout` | `'player.logout'` | 请求登出。 |
| `PlayerReady` | `'player.ready'` | 请求准备。 |
| `PlayerUnready` | `'player.unready'` | 请求取消准备。 |
| `RoomPlayerCommand` | `'room.player-command'` | 发送房间内玩家命令。 |
| `GlobalCommand` | `'global.command'` | 发送全局命令。 |
