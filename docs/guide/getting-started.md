# 快速开始

Tiaoom 是一个轻量级的游戏房间引擎，专为构建多人回合制游戏而设计。它提供了一个强大的事件驱动架构，用于管理房间、玩家和游戏状态。

## 安装 {#installation}

```bash
npm install tiaoom
```

## 核心概念 {#core-concepts}

- **房间 (Room)**：玩家进行交互的容器。
- **玩家 (Player)**：连接到游戏的用户。
- **事件 (Events)**：客户端和服务器之间通信的主要方式。

## 最小示例 {#example}

以下是一个最简单的服务端初始化示例：

```typescript
import { Tiaoom } from "tiaoom";

// 1. 初始化游戏引擎
const game = new Tiaoom({
  // 这里可以传入配置，例如心跳间隔等
});

// 2. 监听全局事件
game.on("room.create", (room) => {
  console.log(`房间 ${room.id} 已创建`);
  
  // 监听房间内的事件
  room.on("join", (player) => {
    console.log(`玩家 ${player.name} 加入了房间`);
  });
});

console.log("Tiaoom 引擎已启动");
```

要构建完整的游戏应用，你需要结合网络层（如 WebSocket）和客户端 SDK。请参考 [游戏开发实战](./game-development.md) 章节获取完整指南。
