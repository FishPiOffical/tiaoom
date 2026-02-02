# 常见问题和故障排除

## 常见问题

### 基础问题

**Q: Tiaoom 是什么？**

A: Tiaoom 是一个开源的实时多人游戏框架，基于 Node.js + TypeScript + Vue 3。它提供了完整的后端游戏逻辑处理、WebSocket 实时通信、前端组件库等，让开发者能快速构建多人实时游戏。

**Q: 我需要学习多久才能开发一个游戏？**

A: 如果你已经懂 TypeScript 和 Vue，基础游戏（如抢数字、骰子游戏）可以在 1-2 小时内完成。复杂游戏（如棋牌游戏）可能需要 5-10 小时。关键是理解 GameRoom 的生命周期和通信模式。

**Q: 一个房间最多能支持多少玩家？**

A: 没有硬性限制，但实际受以下因素影响：
- 服务器性能（内存、CPU）
- 网络带宽
- 游戏逻辑复杂度
- 通信频率

通常建议 2-8 人游戏最佳，超过 10 人需要优化。

**Q: 如何部署到生产环境？**

A: 参考后端部署指南。基本步骤：
1. 配置环境变量（数据库、Redis 等）
2. 构建前后端代码
3. 使用 PM2/Docker 启动服务
4. 配置 nginx 反向代理
5. 配置 SSL 证书

**Q: 游戏支持多少并发玩家？**

A: 取决于服务器配置。单个 Node.js 实例通常可处理 10K+ 并发连接。建议使用负载均衡和消息队列来处理高并发。

### 开发问题

**Q: 如何在本地调试游戏？**

A: 使用以下工具：
```bash
# 后端调试
npm run dev:debug  # 启用调试模式，可在 VS Code 中设置断点

# 前端调试
# 在浏览器 DevTools 的 Console 中查看日志
game.on('*', (msg) => console.log(msg));

# 服务器端日志
tail -f logs/game.log
```

**Q: 如何测试联网游戏？**

A: 
1. 本地启动两个浏览器标签页
2. 使用 ngrok 映射本地服务器到公网进行测试
3. 邀请测试者连接到你的服务器

**Q: 游戏中如何处理随机数？**

A: 后端生成随机数并发送给前端，确保同步性。不要在前端生成关键随机数：
```typescript
// ✅ 正确 - 后端生成
onStart() {
  const random = Math.floor(Math.random() * 100);
  this.command('random', { value: random });
}

// ❌ 错误 - 前端生成关键值
const random = Math.random();
```

**Q: 如何实现游戏内商城/道具系统？**

A: 在 GameRoom 中实现 `IGameData` 接口，存储用户资产信息。例如：
```typescript
export interface IItem {
  id: string;
  userId: string;
  itemId: string;
  count: number;
}

export class ItemService extends BaseModel {
  async buy(userId: string, itemId: string) {
    // 检查用户金币
    // 扣除金币
    // 增加道具
  }
}
```

### 通信问题

**Q: 消息发送后没有响应怎么办？**

A: 检查以下几点：
1. 后端是否正确处理了该消息类型
2. 前端是否有监听该消息类型
3. 检查网络连接（开发者工具 Network 标签）
4. 查看服务器日志

```typescript
// 后端调试
onCommand(message: IGameCommand) {
  console.log('收到消息:', message.type, message.data);
  // 处理逻辑
  console.log('发送响应');
  this.command('response', { ... });
}

// 前端调试
game.on('response', (msg) => {
  console.log('收到响应:', msg);
});
```

**Q: 如何确保消息的可靠性？**

A: Tiaoom 基于 WebSocket，消息可靠性取决于连接状态。实现重试机制：
```typescript
// 前端
async function send(type: string, data: any, retries = 3) {
  try {
    game.command(type, data);
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return send(type, data, retries - 1);
    }
    throw e;
  }
}
```

**Q: 消息频率过高导致卡顿怎么办？**

A: 
1. 降低发送频率（如从 100ms 改为 200ms）
2. 合并多个小消息为一个大消息
3. 使用消息节流（throttle）或防抖（debounce）

```typescript
// 前端节流
let lastSend = 0;
const THROTTLE_DELAY = 100; // 毫秒

function sendOptimized(type: string, data: any) {
  const now = Date.now();
  if (now - lastSend < THROTTLE_DELAY) return;
  lastSend = now;
  game.command(type, data);
}
```

## 常见错误

### 错误 1: "GameRoom is not defined"

**原因：** 没有正确导入 GameRoom

**解决方案：**
```typescript
// ❌ 错误
export default class MyGame {
  // ...
}

// ✅ 正确
import { GameRoom } from '@tiaoom/sdk';

export default class MyGame extends GameRoom {
  // ...
}
```

### 错误 2: "Cannot read property 'id' of undefined"

**原因：** 玩家对象为 undefined，通常是在玩家还未连接时访问

**解决方案：**
```typescript
// ❌ 错误
onStart() {
  const player = this.room.validPlayers[0];
  console.log(player.id); // 如果没有玩家会报错
}

// ✅ 正确
onStart() {
  if (this.room.validPlayers.length === 0) {
    console.log('等待玩家连接');
    return;
  }
  const player = this.room.validPlayers[0];
  console.log(player.id);
}
```

### 错误 3: "Message of type 'xyz' not handled"

**原因：** 前端发送了后端没有处理的消息类型

**解决方案：**
```typescript
// 后端需要添加对应的处理
onCommand(message: IGameCommand) {
  switch(message.type) {
    case 'xyz':
      // 添加处理逻辑
      break;
    default:
      console.warn('未处理的消息类型:', message.type);
  }
}
```

### 错误 4: "Cannot find module '@tiaoom/sdk'"

**原因：** 没有安装依赖

**解决方案：**
```bash
# 在项目根目录
npm install

# 或只安装后端依赖
cd game/backend
npm install
```

### 错误 5: "Port 3000 already in use"

**原因：** 端口被占用

**解决方案：**
```bash
# 找出占用的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或改变端口
PORT=3001 npm run dev
```

### 错误 6: "WebSocket connection failed"

**原因：** 前后端连接失败

**排查步骤：**
1. 检查后端是否启动
2. 检查前端是否连接到正确的服务器地址
3. 检查防火墙设置
4. 查看浏览器网络标签中的 WebSocket 连接

```typescript
// 前端调试
console.log('连接到:', process.env.VITE_API_URL);
game.on('connected', () => console.log('已连接'));
game.on('disconnected', () => console.log('已断开'));
```

### 错误 7: "玩家数据不同步"

**原因：** 客户端和服务器的状态不一致

**解决方案：**
```typescript
// 后端发送完整状态
getData() {
  return {
    ...super.getData(),
    // 包含所有关键游戏状态
    players: this.room.validPlayers.map(p => ({
      id: p.id,
      name: p.name,
      score: this.scores[p.id],
    })),
  };
}

// 前端断线重连时恢复状态
onCommand(msg: any) {
  if (msg.type === 'status') {
    // 重新初始化游戏状态
    Object.assign(gameState, msg.data);
  }
}
```

### 错误 8: "内存泄漏导致进程崩溃"

**原因：** 事件监听器未正确清理

**解决方案：**
```typescript
// ✅ 正确的清理方式
onDestroy() {
  // 移除所有事件监听
  game.off('message', onMessage);
  
  // 清理定时器
  if (this.timer) {
    clearInterval(this.timer);
  }
}

// 在 Vue 中
onBeforeUnmount(() => {
  // 清理逻辑
});
```

## 调试技巧

### 1. 启用详细日志

```typescript
// 后端
process.env.DEBUG = 'tiaoom:*';

// 前端
localStorage.setItem('debug', 'tiaoom:*');
```

### 2. 使用浏览器开发者工具

```javascript
// 在控制台输入以下命令查看游戏状态
game.room.players  // 查看所有玩家
game.room.validPlayers  // 查看有效玩家
game.getData()  // 查看游戏数据
```

### 3. 监控网络流量

```typescript
// 前端拦截所有通信
game.on('*', (msg) => {
  console.log(`[${new Date().toLocaleTimeString()}]`, msg.type, msg.data);
});
```

### 4. 性能分析

```javascript
// Chrome DevTools Performance 标签
// 记录游戏帧率
setInterval(() => {
  console.log('FPS:', 1000 / (Date.now() - lastTime));
}, 1000);
```

### 5. 远程调试

```bash
# 使用 node 调试
node --inspect-brk server.js

# 或使用 VS Code 附加调试器
# .vscode/launch.json
{
  "type": "node",
  "request": "attach",
  "name": "Attach",
  "port": 9229
}
```

## 性能优化建议

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| 延迟高 | 消息过于频繁 | 降低发送频率，合并消息 |
| 内存泄漏 | 事件未清理 | 及时移除监听器，清理定时器 |
| 网络波动 | 连接不稳定 | 实现重连机制，消息队列 |
| CPU 占用高 | 游戏逻辑复杂 | 优化算法，使用 Web Worker |
| 前端卡顿 | 渲染过多 | 虚拟列表，减少 DOM 操作 |

## 获取帮助

- 📖 查看[官方文档](/)
- 🐛 提交 bug 报告
- 💬 加入讨论社群
- 📧 发送邮件给开发者

