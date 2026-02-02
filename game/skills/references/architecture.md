# 架构指南

## 系统架构

```
┌──────────────────────────────────────────────┐
│        Tiaoom 竞技大厅平台                    │
├──────────────────────┬──────────────────────┤
│   🖥️ 后端服务器      │   🌐 前端应用        │
│  (Node.js + TS)     │  (Vue 3 + TS)        │
├──────────────────────┼──────────────────────┤
│ • GameRoom 类       │ • Vue 游戏组件       │
│ • 游戏逻辑实现       │ • 状态管理           │
│ • 玩家指令处理       │ • UI/交互实现        │
│ • 状态管理           │ • 实时状态显示       │
│ • WebSocket 通信     │ • 事件监听           │
│ • 倒计时管理         │ • 组件组合           │
│ • 数据持久化         │ • 样式布局           │
│ • 积分系统           │ • 消息提示           │
└──────────────────────┴──────────────────────┘
          ↕ WebSocket（双向实时通信）
          ↕ JSON 序列化消息
```

## 数据流向

### 1. 初始化流程

```
玩家加入房间
    ↓
后端调用 onStart()
    ↓
初始化游戏状态
    ↓
广播 'init' 指令给所有玩家
    ↓
前端接收 'init'，初始化本地状态
    ↓
显示游戏界面
```

### 2. 游戏进行流程

```
玩家操作（点击按钮等）
    ↓
前端发送 command（type: 'action'）
    ↓
后端 onCommand() 接收
    ↓
验证操作合法性
    ↓
更新游戏状态
    ↓
调用 save() 持久化
    ↓
广播 command 通知所有玩家
    ↓
前端接收 command，更新本地状态
    ↓
UI 自动重新渲染
```

### 3. 断线重连流程

```
玩家断线
    ↓
前端重新连接
    ↓
发送获取状态请求
    ↓
后端调用 getStatus() 返回完整状态
    ↓
前端收到 'status' 消息
    ↓
完全替换本地状态
    ↓
继续游戏
```

## 游戏状态机

```
创建房间
    ↓
等待玩家加入
    ↓
所有玩家准备
    ↓
游戏开始 → onStart() 调用
    ↓
游戏运行 → onCommand() 处理指令
    ↓
游戏结束 → 调用 room.end()
    ↓
保存成就和积分
    ↓
房间关闭
```

## 关键组件

### 后端核心类

#### GameRoom（基类）

所有游戏都必须继承此类。提供：

- **通信方法**
  - `command(type, data)` - 广播指令
  - `commandTo(type, data, player)` - 发送给特定玩家
  - `say(text)` - 聊天消息
  - `sayTo(text, player)` - 私聊

- **状态管理**
  - `save()` - 持久化状态
  - `saveAchievements(winners)` - 保存成就
  - `saveRecord(winners, score)` - 保存记录

- **倒计时**
  - `startTimer(callback, ms, name)` - 启动倒计时
  - `stopTimer(name)` - 停止倒计时
  - `restoreTimer(timers)` - 恢复倒计时

- **属性**
  - `room` - 房间实例
  - `beginTime` - 游戏开始时间戳
  - `messageHistory` - 聊天历史

#### Room（房间实例）

表示一个游戏房间。包含：

- `id` - 房间 ID
- `players` - 所有玩家列表
- `validPlayers` - 活跃玩家列表
- `status` - 房间状态（waiting, playing, ended）
- `end()` - 结束游戏

#### RoomPlayer（房间玩家）

表示房间内的玩家。包含：

- `id` - 玩家 ID
- `name` - 玩家名称
- `role` - 角色（player, spectator）
- `status` - 状态（ready, playing, etc.）

### 前端核心组件

#### GameView

所有游戏的顶层容器组件。

```vue
<GameView :room-player="roomPlayer" :game="game" @command="onCommand">
  <!-- 游戏内容插槽 -->
  <template #actions>
    <!-- 操作按钮 -->
  </template>
  <template #rules>
    <!-- 游戏规则 -->
  </template>
</GameView>
```

#### 预置组件

无需导入，直接使用：

- `PlayerList` - 玩家列表
- `AchievementTable` - 成就展示
- `GameChat` - 游戏聊天
- `Icon` - 图标组件
- `MessageBox` - 消息弹窗
- `Message` - 消息提示

### 全局状态管理

#### useGameStore

```typescript
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore();

// 常用属性
gameStore.game           // GameCore 实例
gameStore.player         // 当前用户
gameStore.players        // 在线玩家列表
gameStore.rooms          // 房间列表
gameStore.roomPlayer     // 房间内玩家信息
```

## 通信协议

### 指令格式

```typescript
{
  type: string,          // 指令类型
  data?: any,            // 指令数据
  sender?: RoomPlayer    // 发送者信息
}
```

### 系统指令

- `init` - 游戏初始化
- `status` - 状态同步（断线重连）
- `countdown` - 倒计时更新
- `turn` - 玩家轮换
- `end` - 游戏结束

### 自定义指令

游戏可以定义任意的自定义指令类型，如：

- `click` - 玩家点击
- `move` - 玩家移动
- `action` - 玩家动作

## 文件组织

### 后端

```
backend/src/
├── games/
│   ├── MyGame.ts           # 游戏逻辑
│   ├── controller.ts       # 路由控制
│   └── ...
├── entities/               # 数据实体
├── routes/                 # 路由定义
├── socket.ts               # WebSocket 连接管理
└── index.ts                # 入口文件
```

### 前端

```
frontend/src/
├── components/
│   ├── games/
│   │   ├── MyGameRoom.vue      # 游戏主组件
│   │   ├── MyGameLite.vue      # 小窗组件
│   │   └── MyGameReplay.vue    # 回放组件
│   └── ...
├── stores/
│   └── game.ts             # Pinia 状态管理
├── hook/
│   └── useGameEvents.ts    # 游戏事件 hook
└── router/                 # 路由配置
```

## 设计模式

### 1. 命令模式

所有玩家操作都通过 `command()` 方法传递，实现：

- 操作历史记录（用于回放）
- 操作验证（防止作弊）
- 实时同步（所有玩家看到相同状态）

### 2. 观察者模式

前端通过事件监听器观察后端事件：

```typescript
game.on('command', (msg) => {
  // 处理指令
});
```

### 3. 发布-订阅模式

WebSocket 实现发布-订阅通信：

- 后端发布 command
- 所有连接的前端订阅并接收

## 关键概念

### 游戏状态 vs 本地状态

- **游戏状态**：由后端管理，是唯一的真实来源
- **本地状态**：前端缓存，用于 UI 渲染
- **同步**：通过 command 消息保持一致

### 断线重连

关键点：

1. 后端持久化完整的 `getStatus()`
2. 前端在接收 `status` 消息时完全替换本地状态
3. 不能有本地独立决策

### 倒计时恢复

关键点：

1. 后端在 `init()` 中调用 `restoreTimer()`
2. 服务器重启时自动恢复倒计时
3. `getStatus()` 中包含 `tickEndTime`

## 性能考虑

### 状态广播

❌ **不要做**：
```typescript
// 每帧都发送整个游戏状态
for (let i = 0; i < 60; i++) {
  this.command('update', largeGameState);
}
```

✅ **应该做**：
```typescript
// 只发送改变的部分
this.command('update', { changedField: newValue });
```

### 玩家特定数据

❌ **不要做**：
```typescript
// 广播所有玩家都能看到的私密数据
this.command('privateData', secretCard);
```

✅ **应该做**：
```typescript
// 只发送给需要的玩家
this.commandTo('privateData', secretCard, player);
```

## 安全性

### 验证所有操作

```typescript
onCommand(message: IGameCommand) {
  // 验证玩家身份
  if (!this.room.validPlayers.find(p => p.id === message.sender.id)) {
    return;
  }
  
  // 验证游戏状态
  if (this.room.status !== 'playing') {
    return;
  }
  
  // 验证操作数据
  const action = message.data;
  if (typeof action !== 'number' || action < 0) {
    return;
  }
}
```

## 可扩展性

### 添加新功能

1. **数据管理**：实现 `IGameData` 接口
2. **回放**：在 `getData()` 中记录行为
3. **倒计时**：使用 `startTimer()` 和 `restoreTimer()`
4. **自定义积分**：覆盖 `saveAchievements()`

### 集成第三方库

保持 GameRoom 的独立性，在组件中集成外部库。
