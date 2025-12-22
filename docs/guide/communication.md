# 通信实现

Tiaoom 的后端通信核心在于 [`IMessage`](./api/models#imessage) 接口的实现。通过实现该接口，你可以适配不同的通信协议（如 WebSocket、Socket.IO，RPC 等）。

## [`IMessage`](./api/models#imessage) 接口

[`IMessage`](./api/models#imessage) 接口定义了后端通信类必须具备的基本能力，包括事件监听、消息发送和连接管理。

```typescript
export interface IMessage extends EventEmitter<IMessageEmitterEvents> {
  /**
   * 监听消息事件，继承自 EventEmitter，无需手动实现
   * @param event 事件名，具体见 MessageEvents
   * @param listener 监听器
   */
  on<K extends keyof IMessageEvents>(event: K, listener: IMessageEvents[K]): this;
  
  /**
   * 触发消息事件，继承自 EventEmitter，无需手动实现
   * @param event 事件名，具体见 MessageEvents
   * @param args 参数
   */
  emit<K extends keyof IMessageEvents>(event: K, ...args: Parameters<IMessageEvents[K]>): boolean;
  
  /**
   * 关闭连接
   */
  close(): void;
  
  /**
   * 发送消息包
   * @param message 消息包
   */
  send(message: IMessagePackage): void;
}
```

## 接收前端消息

当后端收到来自前端的消息时，需要将其转换为 [`IMessageData`](./api/models#imessagedata) 格式，并通过 `this.emit('message', ...)` 触发 Tiaoom 库的内部处理逻辑。

**关键步骤：**

1.  **解析消息**：将收到的原始数据（如 JSON 字符串）解析为 [`IMessageData`](./api/models#imessagedata) 对象。
2.  **关联发送者**：除了登录消息外，其他消息都需要找到对应的 [`Player`](./api/models#player) 对象，并赋值给 `message.sender`。这是库识别消息来源的关键。
3.  **触发事件**：调用 `this.emit("message", message, callback)` 将消息交给 Tiaoom 处理。`callback` 用于处理库返回的响应结果。

```typescript
socket.on("message", (data: any) => {
  try {
    const packet = JSON.parse(data);
    let message: IMessageData = packet;
    
    if (message) {
      // 处理登录消息，记录 Socket 与 Player 的关联
      if (message.type == 'player.login') {
        this.sockets.push({ socket, player: message.data });
      } else {
        // 对于非登录消息，必须找到对应的 Player 并赋值给 sender
        const player = this.sockets.find(s => s.socket == socket)?.player;
        if (player) message.sender = player;
      }
      
      // 触发库内部处理
      this.emit("message", message, (err: Error | null, data?: any) => {
        if (err) return console.error(err); // 错误处理，会同步通过 global.error 事件通知到前端
        // 将处理结果返回给客户端
        else socket.send(JSON.stringify({ type: message.type, data }));
      });
    }
  } catch (err) {
    this.emit("error", err as Error);
  }
});
```

## 消息转发处理

在 `send` 方法的实现中，需要根据消息类型的不同前缀，将消息转发给不同的接收者。Tiaoom 约定了以下三种消息前缀：

### 1. 玩家消息 (`player.`)

当消息类型以 `player.` 开头时，表示该消息是发送给特定玩家的。`message.sender` 字段包含了目标玩家的信息，也就是 [`Player`](./api/models#player)。

**处理逻辑：**
- 查找所有属于该玩家 ID 的连接（Socket）。
- 将消息发送给这些连接。
- 这支持了多端登录场景，即同一个玩家在多个设备上登录都能收到消息。

```typescript
if (message.type.startsWith('player.') && message.sender) {
  const player = message.sender as Player;
  // 发送给该玩家的所有连接
  this.sockets.filter(s => s.player.id === player.id)
    .forEach(({ socket }) => {
      socket.send(JSON.stringify({ 
        type: message.type, 
        data: message.data, 
        sender: message.sender 
      }))
  });
}
```

### 2. 房间消息 (`room.`)

当消息类型以 `room.` 开头时，表示该消息是发送给特定房间内的所有玩家的。此时 `message.sender` 通常被视为房间对象（[`Room`](./api/models#room)）。

**处理逻辑：**
- 遍历房间内的所有玩家。
- 查找每个玩家对应的所有连接。
- 将消息发送给这些连接。

```typescript
else if (message.type.startsWith('room.') && message.sender) {
  const room = message.sender as Room;
  room.players.forEach(p => {
    this.sockets.filter(s => s.player.id === p.id).forEach(({ socket }) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          type: message.type, 
          data: message.data, 
          sender: p 
        }));
      }
    })
  });
}
```

### 3. 全局消息 (`global.` 或其他)

如果消息不属于上述两种类型（通常是 `global.` 开头），则视为全局广播消息。

**处理逻辑：**
- 将消息发送给当前所有连接的客户端。

```typescript
else {
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: message.type, data: message.data }));
    }
  });
}
```

## 玩家登出机制

为了支持多端登录并准确判断玩家是否离线，后端通信类需要在连接关闭时进行特殊处理。

**处理逻辑：**
1. 当某个 Socket 连接关闭时，将其从连接列表中移除。
2. 检查该玩家是否还有其他活跃的连接。
3. 如果该玩家没有任何活跃连接，则触发 `player.offline` 消息，通知系统玩家已完全下线。
4. 房间也会在一分钟后（避免因网络或刷新误判）收到该玩家的离线事件`player-offline`，不同游戏可触发相应的处理逻辑（如踢出房间，启动托管等）。

```typescript
socket.on("close", () => {
  // 移除断开的连接
  const index = this.sockets.findIndex((target) => target.socket == socket);
  const player = this.sockets[index]?.player;
  if (index > -1) {
    this.sockets.splice(index, 1);
  }
  
  // 检查玩家是否还有其他连接
  if (!this.sockets.some(s => s.player.id === player?.id)) {
    // 触发登出消息
    this.emit("message", { 
      type: MessageTypes.PlayerOffline, 
      data: player, 
      sender: player 
    });
  }
  
  this.emit("close");
});
```

## 前端通信

前端通信主要依赖于继承实现 [`tiaoom/client`](./api/client.md) 模块中的 `Tiaoom` 类中的两个抽象方法。

- `connect()`：用于建立与后端服务器的连接。
- `send(message: { type: `[`MessageTypes`](./api/models#messagetypes-client)`, data?: any })`：用于发送消息到服务器。