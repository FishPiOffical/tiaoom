---
name: tiaoom-game-development
description: Complete guide for developing multiplayer online games for Tiaoom competitive game platform. Use this skill when: (1) Developing new games using TypeScript, Node.js backend and Vue 3 frontend, (2) Implementing game logic, real-time WebSocket communication, and state management, (3) Building features like countdown timers, score systems, game replays, and persistence, (4) Debugging multiplayer game issues and optimizing performance, (5) Understanding Tiaoom architecture and best practices for game development.
---

# Tiaoom 竞技大厅游戏开发

为 Tiaoom 竞技大厅平台开发多人在线游戏的完整指南。

- **平台**：https://room.adventext.fun
- **仓库**：https://github.com/FishPiOffical/tiaoom
- **技术栈**：TypeScript、Node.js、Vue 3、WebSocket

---

## 快速开始

### 5 分钟了解 Tiaoom

**什么是 Tiaoom？**  
Tiaoom 是一个开放的多人在线游戏平台，支持开发和发布各种游戏。

**如何开发游戏？**  
创建两个文件：
1. **后端**：`backend/src/games/MyGame.ts` - 游戏逻辑
2. **前端**：`frontend/src/components/games/MyGameRoom.vue` - 游戏界面


## 架构概览

### 系统架构

```
┌─────────────────────────────────────────────┐
│      Tiaoom 竞技大厅平台                    │
├───────────────────────┬─────────────────────┤
│   🖥️ 后端服务器       │   🌐 前端应用       │
│  (Node.js)             │  (Vue 3)            │
├───────────────────────┼─────────────────────┤
│ • GameRoom 逻辑       │ • 游戏组件          │
│ • WebSocket 通信      │ • 状态管理          │
│ • 数据持久化          │ • UI/交互           │
│ • 倒计时管理          │ • 实时更新          │
│ • 积分系统            │ • 消息展示          │
└───────────────────────┴─────────────────────┘
          ↕ WebSocket（双向实时通信）
```

### 开发流程

```
需求分析 → 设计游戏规则 → 后端实现 → 前端实现 → 集成测试 → 优化部署
```

---

## 核心概念速查

| 概念 | 说明 |
|------|------|
| **GameRoom** | 游戏逻辑的基类，继承它来实现你的游戏 |
| **onStart()** | 游戏开始时调用，初始化游戏状态 |
| **onCommand()** | 接收玩家指令时调用，处理游戏逻辑 |
| **getStatus()** | 获取当前游戏状态，用于断线重连 |
| **command()** | 向所有玩家广播游戏指令 |
| **commandTo()** | 向指定玩家发送指令 |
| **Room** | 房间实例，代表一场游戏 |
| **RoomPlayer** | 房间内的玩家对象 |

---

## 学习路径

### 📚 路径 A：快速开发简单游戏
1. 查看 `references/quick-start.md` 中的 5 分钟示例
2. 参考 `references/examples.md` 中的完整示例代码
3. 本地测试并部署

### 📚 路径 B：深入学习架构
1. 阅读 `references/architecture.md` - 系统设计
2. 学习 `references/backend-guide.md` - 后端开发
3. 学习 `references/frontend-guide.md` - 前端开发
4. 研究 `references/examples.md` - 完整游戏实现

### 📚 路径 C：解决具体问题
1. 查看 `references/troubleshooting.md` - 常见问题
2. 查找相关 API 在 `references/api-reference.md` 中
3. 参考 `references/best-practices.md` 中的最佳实践

---

## 常用任务速查

### 🎮 我想创建第一个游戏

查看 `references/examples.md` 中的"完整示例：抢数字游戏"，这是一个完整的工作示例，包含：
- 后端完整实现
- 前端完整实现
- 测试步骤

### ⏱️ 我想实现倒计时功能

参考 `references/advanced-features.md` 的"倒计时实现"部分，包括：
- 后端倒计时启动和管理
- 前端倒计时显示
- 服务器重启后恢复

### 💾  我想实现游戏数据持久化

查看 `references/advanced-features.md` 的"游戏数据管理"部分：
- 如何实现 IGameData 接口
- 数据库模型定义
- CRUD 操作示例

### 🔄 我想实现游戏回放功能

参考 `references/advanced-features.md` 的"游戏回放"部分：
- 后端回放数据记录
- 前端回放组件实现
- 数据存储和检索

### 🐛 游戏无法通信或状态混乱

查看 `references/troubleshooting.md` 中的：
- "WebSocket 连接失败"
- "前端无法接收后端消息"
- "断线重连时状态混乱"

### ⚡ 我想优化游戏性能

参考 `references/best-practices.md` 的"性能优化"部分：
- 避免频繁的状态广播
- 使用 commandTo 发送玩家特定数据
- 合理使用 saveIgnoreProps

---

## 关键文件参考

### 📖 references/ 目录

- **quick-start.md** - 最小化示例和 3 步环境设置
- **architecture.md** - 系统架构、数据流、关键术语
- **backend-guide.md** - 后端开发规范、GameRoom API、实现指南
- **frontend-guide.md** - 前端结构、Vue 组件、预置组件
- **advanced-features.md** - 倒计时、数据管理、游戏回放
- **examples.md** - 完整的游戏示例代码（抢数字游戏）
- **best-practices.md** - 代码组织、性能优化、安全性
- **troubleshooting.md** - 常见问题和解决方案

---

## 最小化示例

### 后端最小实现

```typescript
import { GameRoom, IGameCommand } from '.';

export const name = 'MinGame';
export const minSize = 2;
export const maxSize = 2;
export const description = 'Minimal game example';

export default class MinGameRoom extends GameRoom {
  gameState: any = {};

  onStart() {
    // 初始化游戏状态
    this.gameState = { count: 0 };
    this.command('init', this.gameState);
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    // 处理游戏逻辑
  }

  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      gameState: this.gameState,
    };
  }
}
```

### 前端最小实现

```vue
<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center">
      <!-- 游戏显示 -->
    </div>
  </GameView>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const gameState = ref<any>(null);

function onCommand(msg: any) {
  if (msg.type === 'init' || msg.type === 'status') {
    gameState.value = msg.data.gameState;
  }
}
</script>
```

---

## 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | >= 20.x |
| npm | >= 9.x |
| 编辑器 | VS Code（推荐） |
| 浏览器 | Chrome/Firefox（需支持 WebSocket） |

---

## 项目结构

```
tiaoom/game/
├── backend/
│   ├── src/games/
│   │   └── MyGame.ts              # 你的游戏逻辑
│   └── ...
└── frontend/
    └── src/components/games/
        ├── MyGameRoom.vue         # 游戏主组件
        ├── MyGameLite.vue         # 小窗组件（可选）
        └── MyGameReplay.vue       # 回放组件（可选）
```

---

## 获取帮助

### 📚 官方资源

- **项目仓库**：https://github.com/FishPiOffical/tiaoom
- **在线体验**：https://room.adventext.fun
- **完整文档**：https://github.com/FishPiOffical/tiaoom/tree/main/docs

### 🔍 查找信息

1. **对于快速答案**：查看本文档的"常用任务速查"
2. **对于详细指南**：阅读 references/ 中的相应模块
3. **对于完整代码**：参考 references/examples.md
4. **对于问题排查**：查看 references/troubleshooting.md

### 🤝 寻求支持

- 提交 Issue：在 GitHub 上报告问题
- 参与讨论：在 GitHub Discussions 中交流
- 分享游戏：展示你的作品

---

## 下一步

1. ✅ 阅读本文档快速了解架构
2. ✅ 查看 `references/quick-start.md` 进行 3 步环境设置
3. ✅ 研究 `references/examples.md` 中的完整游戏示例
4. ✅ 根据学习路径选择深度方向
5. ✅ 开始开发你的第一个游戏！

---

**立即开始开发你的 Tiaoom 游戏吧！** 🚀
