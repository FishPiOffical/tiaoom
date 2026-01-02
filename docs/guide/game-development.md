# 游戏开发实战

本指南将带你深入了解如何使用 Tiaoom 构建完整的游戏应用。我们将涵盖从网络层适配到游戏逻辑实现的各个方面。

## 1. 服务端：实现 Socket 通信层 {#server-socket}

Tiaoom 不绑定具体的网络协议，你需要实现 `Message` 接口来适配你的网络层（如 WebSocket）。以下是一个使用 `ws` 库的完整示例：

```typescript
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import { IMessage, MessageTypes, IMessagePackages, MessageEvents, Player, Room } from "tiaoom";

export class SocketManager extends EventEmitter implements IMessage {
  sockets: Array<{ socket: WebSocket; player: Player }> = [];

  constructor(server: any) {
    super();
    const wsServer = new WebSocketServer({ server });
    
    wsServer.on("connection", (socket) => {
      this.emit("ready");
      
      socket.on("message", (data: any) => {
        try {
          const packet = JSON.parse(data);
          // 处理登录消息，绑定 socket 和 player
          if (packet.type == 'player.login') {
            this.sockets.push({ socket, player: packet.data });
          } else {
            // 为其他消息附加发送者信息
            const player = this.sockets.find(s => s.socket == socket)?.player;
            packet.sender = player;
          }
          
          // 触发 message 事件供 Tiaoom 处理
          this.emit("message", packet, (err, data) => {
            if (err) console.error(err); // 消息处理错误，会通过 global.error 事件通知到前端
            else socket.send(JSON.stringify({ type: packet.type, data }));
          });
        } catch (err) {
          this.emit("error", err as Error);
        }
      });

      socket.on("close", () => {
        // 处理断开连接逻辑
        const index = this.sockets.findIndex((s) => s.socket == socket);
        if (index > -1) {
          const { player } = this.sockets[index];
          this.sockets.splice(index, 1);
          // 如果玩家所有连接都断开，通知 Tiaoom
          if (!this.sockets.some(s => s.player.id === player.id)) {
            this.emit("message", { type: MessageTypes.PlayerLogout, data: player });
          }
        }
        this.emit("close");
      });
    });
  }

  // 实现 send 方法，将消息路由到正确的客户端，message 的 senderIds 指定接收者
  send(message: IMessagePackages) {
    // send a message to the client
    this.sockets
      .forEach(({ socket, player }) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        if (!message.senderIds.includes(player.id)) return;
        socket.send(JSON.stringify({
          type: message.type,
          data: message.data,
          sender: player
        }));
      });
  }
  
  close() { 
    /* 关闭服务器逻辑 */
  }
}
```

## 2. 服务端：编写游戏逻辑 {#server-logic}

你可以通过监听房间事件来编写具体的游戏逻辑。

```typescript
import { Room, RoomPlayer } from "tiaoom";

export default function setupGame(room: Room) {
  // 监听自定义游戏命令
  room.on('command', (cmd) => {
    if (cmd.type === 'talk') {
      // 处理玩家发言
      room.emit('message', `玩家 ${cmd.sender.name} 说: ${cmd.data}`);
    }
  });

  // 监听游戏开始事件
  room.on('start', () => {
    room.emit('message', '游戏开始！');
    startTurn(room.players[0]);
  });

  function startTurn(player: RoomPlayer) {
    // 发送命令给客户端，通知轮到某人发言
    room.emit('command', { type: 'turn', data: { playerId: player.id } });
    
    // 设置超时逻辑
    setTimeout(() => {
      room.emit('message', `玩家 ${player.name} 超时`);
      // 下一个玩家...
    }, 30000);
  }
}
```

## 3. 客户端：集成与扩展 {#client-integration}

在客户端，你需要继承 `Tiaoom` 类并实现连接逻辑。

```typescript
import { Tiaoom, TiaoomEvents, MessageTypes } from 'tiaoom/client';
import ReconnectingWebSocket from 'reconnecting-websocket';

export class GameClient extends Tiaoom {
  private socket?: ReconnectingWebSocket;

  constructor(private url: string) {
    super();
  }

  connect() {
    this.socket = new ReconnectingWebSocket(this.url);
    
    this.socket.onopen = () => this.emit('sys.ready');
    
    this.socket.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      // 将 WebSocket 消息转发给 Tiaoom 事件系统
      this.emit(msg.type as keyof TiaoomEvents, msg.data, msg.sender);
    };
    
    this.socket.onclose = () => this.emit('sys.close');
  }

  send(msg: { type: MessageTypes; data?: any }) {
    this.socket?.send(JSON.stringify(msg));
  }

  // 扩展自定义方法
  say(content: string, roomId: string) {
    this.command(roomId, { type: 'talk', data: content });
  }
}

// 使用示例
const client = new GameClient('ws://localhost:3000');
client.connect();

client.on('sys.ready', () => {
  client.login({ id: '1', name: 'Player1' });
});

client.on('room.message', (msg) => {
  console.log('收到消息:', msg);
});
```
## 4. 其他接口示例 {#other-examples}

以下是一些常见的前端功能实现示例，包括房间列表、玩家列表和聊天功能。

### 获取房间列表 {#room-list}

客户端可以通过监听 `room.list` 事件来获取实时更新的房间列表。

```typescript
// 监听房间列表更新
client.on('room.list', (rooms) => {
  console.log('当前房间列表:', rooms);
  // 更新 UI
  updateRoomListUI(rooms);
});

// 主动请求房间列表（通常在连接建立后会自动推送，也可以手动触发）
// 值会在 `room.list` 事件中返回
client.send({ type: 'room.list' });

// 获取当前房间列表的快照
console.log(client.rooms);
```

### 获取在线玩家列表 {#player-list}

类似地，可以通过监听 `player.list` 事件获取在线玩家列表。

```typescript
// 监听玩家列表更新
client.on('player.list', (players) => {
  console.log('当前在线玩家:', players);
  // 更新 UI
  updatePlayerListUI(players);
});

// 主动请求玩家列表（通常在连接建立后会自动推送，也可以手动触发）
// 值会在 `player.list` 事件中返回
client.send({ type: 'player.list' });

// 获取当前在线玩家的快照
console.log(client.players);
```

### 实现聊天功能 {#chat}

聊天功能通常分为“大厅聊天”（全局）和“房间聊天”。

#### 全局聊天 {#global-chat}

```typescript
// 发送全局消息
function sendGlobalMessage(text) {
  // 发送一个类型为 'say' 的全局命令
  client.command({ type: 'say', data: text });
}

// 监听全局消息
client.on('global.command', (cmd) => {
  if (cmd.type === 'say') {
    console.log(`[全服] ${cmd.sender.name}: ${cmd.data}`);
    // 显示在聊天窗口
    appendChatMessage('全服', cmd.sender.name, cmd.data);
  }
});
```

#### 房间聊天 {#room-chat}

```typescript
// 发送房间消息
function sendRoomMessage(roomId, text) {
  // 发送一个类型为 'say' 的房间命令
  client.command(roomId, { type: 'say', data: text });
}

// 监听房间消息（需要在服务端处理转发，或者使用 room.message 事件）
// 如果服务端将 'say' 命令转换为 'message' 事件广播：
client.on('room.message', (msg) => {
   console.log(`[房间] ${msg.sender.name}: ${msg.data}`);
});

// 或者监听房间命令（如果服务端直接转发命令）：
client.on('room.command', (cmd) => {
  if (cmd.type === 'say') {
    console.log(`[房间] ${cmd.sender.name}: ${cmd.data}`);
  }
});
```

## 房间管理 {#room-management}

Tiaoom 处理了房间管理的繁重工作：

- **创建**: [`createRoom(options)`](./api/client.md#createroom)
- **加入**: [`joinRoom(roomId)`](./api/client.md#joinroom)
- **离开**: [`leaveRoom(roomId)`](./api/client.md#leaveroom)
- **准备状态**: [`ready(roomId, isReady)`](./api/client.md#ready)
- **踢人**: [`kickPlayer(roomId, playerId)`](./api/client.md#kickplayer)
- **转让房主**: [`transferRoom(roomId, playerId)`](./api/client.md#transferroom)