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
  send(message: IMessagePackages): void;
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

在 `send` 方法的实现中，会接收一个 [`IMessagePackages`](./api/models#imessagepackages) 对象。该对象包含消息类型、数据以及接收者 ID 列表。

**关键步骤：**
1. **遍历连接**：遍历所有已建立的 Socket 连接。
2. **检查连接状态**：确保只向处于打开状态的连接发送消息。
3. **过滤接收者**：根据 `message.senderIds` 过滤出需要接收该消息的玩家连接。
4. **发送消息**：将消息通过对应的 Socket 发送给客户端，同时附加发送者信息。

```typescript
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
- <code>send(message: { type: [MessageTypes](./api/models#messagetypes-client), data?: any })</code>：用于发送消息到服务器。