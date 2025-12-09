# 事件 (Events)

这里详细列出了 `tiaoom` 中使用的事件接口。

## TiaoomEvents (服务器事件) {#tiaoom-events}

服务器实例 `Tiaoom` 触发的事件。

| 事件名 | 参数 | 描述 |
| :--- | :--- | :--- |
| `room` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 当创建新房间时触发。 |
| `player` | <code>(player: <a href="./server.md#类-player">Player</a>, isLogin: boolean)</code> | 当玩家登录或登出时触发。`isLogin` 为 `true` 表示登录，`false` 表示登出。 |
| `room-player` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 当房间内的玩家状态发生变化（加入、离开、准备等）时触发。 |
| `rooms` | <code>(rooms: <a href="./server.md#类-room">Room</a>[])</code> | 当房间列表发生变化时触发。 |
| `command` | <code>(data: any & { sender: <a href="./server.md#类-player">Player</a> })</code> | 全局命令事件。 |
| `message` | <code>(data: string, sender?: <a href="./server.md#类-player">Player</a>)</code> | 全局聊天事件。 |

## RoomEvents (房间事件) {#roomevents}

房间实例 `Room` 触发的事件。

| 事件名 | 参数 | 描述 |
| :--- | :--- | :--- |
| `join` | <code>(player: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 当玩家加入房间时触发。 |
| `leave` | <code>(player: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 当玩家离开房间时触发。 |
| `ready` | <code>(player: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 当玩家准备时触发。 |
| `unready` | <code>(player: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 当玩家取消准备时触发。 |
| `start` | <code>(room: <a href="./models.md#iroom">IRoom</a>, sender: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 当房间开始游戏时触发。 |
| `end` | <code>(room: <a href="./models.md#iroom">IRoom</a>)</code> | 当房间关闭时触发。 |
| `message` | <code>(data: string, sender?: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 当房间收到消息时触发。 |
| `player-command` | <code>(message: <a href="./models.md#imessagepackage">IMessagePackage</a>)</code> | 玩家发送的房间命令。 |
| `command` | <code>(message: any)</code> | 房间命令。 |
| `update` | <code>(room: <a href="./models.md#iroom">IRoom</a>)</code> | 房间更新。 |
| `player-ready` | <code>(player: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 当玩家准备时触发（包含玩家信息）。 |
| `player-unready` | <code>(player: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 当玩家取消准备时触发（包含玩家信息）。 |
| `all-ready` | <code>(players: <a href="./models.md#iroomplayer">IRoomPlayer</a>[])</code> | 当房间内所有玩家都已准备时触发。 |

## PlayerEvents (玩家事件) {#playerevents}

玩家实例 `Player` 触发的事件。

| 事件名 | 参数 | 描述 |
| :--- | :--- | :--- |
| `status` | <code>(status: <a href="./models.md#playerstatus">PlayerStatus</a>)</code> | 当玩家状态发生变化时触发。 |
| `message` | <code>(message: any)</code> | 当玩家收到消息时触发。 |

## MessageEvents (消息事件) {#messageevents}

消息实例 `Message` 触发的事件。

| 事件名 | 参数 | 描述 |
| :--- | :--- | :--- |
| `message` | <code>(message: <a href="./models.md#imessagedata">IMessageData</a>)</code> | 当收到消息包时触发。 |
| `ready` | <code>()</code> | 当连接建立完成时触发。 |
| `close` | <code>()</code> | 当连接关闭时触发。 |
| `error` | <code>(error: Error)</code> | 当发生错误时触发。 |

## TiaoomEvents (客户端事件) {#client-tiaoom-events}

客户端实例 `Tiaoom` 触发的事件。

| 事件名 | 参数 | 描述 |
| :--- | :--- | :--- |
| `sys.ready` | <code>()</code> | 连接准备就绪事件。 |
| `sys.error` | <code>(error: any)</code> | 连接错误事件。 |
| `sys.close` | <code>()</code> | 连接关闭事件。 |
| `global.error` | <code>(error: Error)</code> | 全局错误事件。 |
| `global.command` | <code>(data: any & { sender: <a href="./server.md#类-player">Player</a> })</code> | 全局命令事件。 |
| `player.list` | <code>(players: <a href="./server.md#类-player">Player</a>[])</code> | 玩家列表更新事件。 |
| `player.login` | <code>(player: <a href="./server.md#类-player">Player</a>)</code> | 玩家登录事件。 |
| `player.logout` | <code>(player: <a href="./server.md#类-player">Player</a>)</code> | 玩家登出事件。 |
| `player.status` | <code>(player: <a href="./server.md#类-player">Player</a>, status: string, roomId?: string)</code> | 玩家状态更新事件。 |
| `player.command` | <code>(command: any & { sender: <a href="./server.md#类-player">Player</a> })</code> | 玩家命令事件。 |
| `player.message` | <code>(message: string, sender?: <a href="./server.md#类-player">Player</a>)</code> | 玩家消息事件。 |
| `room.list` | <code>(rooms: <a href="./server.md#类-room">Room</a>[])</code> | 房间列表更新事件。 |
| `room.create` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间创建事件。 |
| `room.update` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间更新事件。 |
| `room.close` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间关闭事件。 |
| `room.join` | <code>(room: <a href="./server.md#类-room">Room</a>, player: <a href="./server.md#类-player">Player</a>)</code> | 玩家加入房间事件。 |
| `room.leave` | <code>(room: <a href="./server.md#类-room">Room</a>, player: <a href="./server.md#类-player">Player</a>)</code> | 玩家离开房间事件。 |
| `room.start` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间开始游戏事件。 |
| `room.end` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间结束游戏事件。 |
| `room.all-ready` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间玩家全部准备事件。 |
| `room.command` | <code>(command: any & { sender: <a href="./server.md#类-player">Player</a> })</code> | 房间命令事件。 |
| `room.message` | <code>(message: string, sender?: <a href="./models.md#iroomplayer">IRoomPlayer</a>)</code> | 房间消息事件。 |
| `room.player-ready` | <code>(player: <a href="./server.md#类-player">Player</a>, roomId?: string)</code> | 房间玩家准备事件。 |
| `room.player-unready` | <code>(player: <a href="./server.md#类-player">Player</a>, roomId?: string)</code> | 房间玩家取消准备事件。 |
| `onPlayerList` | <code>(players: <a href="./server.md#类-player">Player</a>[])</code> | 玩家列表更新事件(内部)。 |
| `onRoomList` | <code>(rooms: <a href="./server.md#类-room">Room</a>[])</code> | 房间列表更新事件(内部)。 |
| `onRoomStart` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间开始游戏事件(内部)。 |
| `onRoomEnd` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间结束游戏事件(内部)。 |
| `onRoomAllReady` | <code>(room: <a href="./server.md#类-room">Room</a>)</code> | 房间玩家全部准备事件(内部)。 |
