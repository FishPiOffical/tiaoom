# Tiaoom 竞技大厅游戏开发助手

## 简介

这是一个用于帮助开发者为 Tiaoom 竞技大厅（https://room.adventext.fun）开发新游戏的 Claude Skill。Tiaoom 是一个基于 Node.js、TypeScript、Vue 3 的实时多人在线游戏平台。

## 环境要求

- Node.js >= 20.x
- npm >= 9.x
- 推荐使用 VSCode 进行开发

## 核心概念

### 项目架构
- **后端**: TypeScript + Node.js + WebSocket + TypeORM + MySQL
- **前端**: Vue 3 + TypeScript + Vite + TailwindCSS + Pinia
- **通信**: WebSocket 实时通信
- **部署**: Monorepo (npm workspace)

### 游戏开发流程
1. 创建后端游戏逻辑类（继承 `GameRoom`）
2. 创建前端 Vue 游戏组件
3. 系统自动注册和加载游戏
4. 测试和部署

## 后端开发规范

### 文件命名
- 后端游戏逻辑文件：`backend/src/games/<GameName>.ts`
- 必须导出特定的配置和类

### 必需导出项

```typescript
import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

// 1. 基本配置（必需）
export const name = '游戏名称';          // 游戏显示名称
export const minSize = 2;                // 最小玩家数
export const maxSize = 2;                // 最大玩家数
export const description = '游戏描述';   // 游戏说明

// 2. 积分配置（可选）
export const points = {                  // 房间开局所需积分
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
};

// 3. 奖励倍率配置（可选）
// export const rates = {                   // 房间奖励积分倍率
//   '我就玩玩': 1,
//   '双倍奖励': 2,
//   '玩的就是心跳': 5,
// };

// 4. 自定义积分奖励说明（可选，仅当自行实现积分奖励时需要）
// export const rewardDescription = '自定义积分奖励规则说明';

// 5. 游戏扩展页面（可选）
// export const extendPages = [
//   { name: '投稿', component: 'SpyPost' }
// ];

// 5. 游戏逻辑类（必需）
export default class MyGameRoom extends GameRoom {
  // 游戏状态属性
  // ...

  // 初始化方法（可选）
  init() {
    // 监听房间事件
    // 注册倒计时恢复回调
    return super.init();
  }

  // 游戏开始（必需实现）
  onStart() {
    // 初始化游戏状态
    // 广播初始状态给所有玩家
  }

  // 处理玩家指令（必需实现）
  onCommand(message: IGameCommand) {
    super.onCommand(message); // 处理通用指令（聊天等）
    
    // 处理游戏特定指令
    switch(message.type) {
      case 'your-action':
        // 处理逻辑
        this.save(); // 保存状态
        break;
    }
  }

  // 获取游戏状态（用于断线重连）
  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      // 返回当前游戏状态
    };
  }

  // 获取游戏回放数据（可选）
  getData() {
    return {
      ...super.getData(),
      // 返回需要保存的回放数据
    };
  }
}
```

### GameRoom 核心方法

#### 通信方法
- `say(content: string, sender?: IRoomPlayer)`: 广播聊天消息
- `sayTo(content: string, receiver: RoomPlayer)`: 私聊消息
- `command(type: string, data?: any)`: 广播游戏指令
- `commandTo(type: string, data: any, receiver: RoomPlayer)`: 向指定玩家发送指令
- `virtualCommand(type: string, data: any, receiver: RoomPlayer)`: 模拟玩家发出房间指令

#### 状态管理
- `save()`: 手动保存游戏状态
- `saveAchievements(winner?: RoomPlayer[] | null, saveRecord: boolean = true)`: 保存成就和积分奖励
- `saveScore(score: number)`: 保存玩家分数
- `saveRecord(winners?: RoomPlayer[] | null, score?: number)`: 保存游戏记录

#### 倒计时功能
- `startTimer(callback, ms, name)`: 启动倒计时
- `stopTimer(name)`: 停止倒计时
- `restoreTimer(timer)`: 恢复倒计时（用于服务器重启）

#### 核心属性
- `room`: Room 实例
- `messageHistory`: 聊天历史
- `beginTime`: 游戏开始时间戳
- `saveIgnoreProps`: 不需要保存的属性列表

### 重要提醒
- **游戏结束必须调用 `this.room.end()`**，否则玩家无法离开房间。若该回合未结束，则不要调用。
- **必须实现 `getStatus()` 方法**，确保游戏状态能正确保存和恢复。
- 数据会自动持久化，不需要手动保存的属性添加到 `saveIgnoreProps`
- 使用 `this.save()` 手动保存状态，系统会在关键节点自动调用

## 前端开发规范

### 文件命名
- 游戏主组件：`frontend/src/components/games/<GameName>Room.vue`
- 游戏小窗组件（可选）：`frontend/src/components/games/<GameName>Lite.vue`
- 游戏回放组件（可选）：`frontend/src/components/games/<GameName>Replay.vue`

### 组件结构

```vue
<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <!-- 左侧：游戏区域 -->
    <div class="flex-1 flex flex-col items-center justify-center">
      <!-- 游戏界面 -->
    </div>

    <!-- 右侧：操作区域 -->
    <template #actions>
      <p>操作按钮和控制</p>
    </template>

    <!-- 游戏规则 -->
    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>游戏规则说明</li>
      </ul>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>();

// 游戏逻辑
function onCommand(msg: any) {
  switch(msg.type) {
    case 'your-action':
      // 更新本地状态
      break;
    case 'status':
      // 恢复游戏状态
      break;
  }
}

// 发送指令到后端
function sendAction(data: any) {
  props.game.command(props.roomPlayer.room.id, {
    type: 'your-action',
    data
  });
}
</script>
```

### 前端状态管理

使用 `useGameStore` 获取游戏状态：

```typescript
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore();

// 常用属性
gameStore.game           // 游戏核心实例
gameStore.player         // 当前用户信息
gameStore.players        // 在线玩家列表
gameStore.rooms          // 房间列表
gameStore.games          // 游戏配置
gameStore.roomPlayer     // 当前用户在房间中的信息
gameStore.playerStatus   // 当前用户状态
```

### 游戏事件监听

使用 `useGameEvents` 自动管理事件：

```typescript
import { useGameEvents } from '@/hook/useGameEvents';

useGameEvents(game, {
  'room.start': onRoomStart,
  'room.end': onRoomEnd,
  'player.command': onCommand,
  'room.command': onCommand,
});
```

### 前端通用组件

无需手动引入，可直接使用：
- `GameView`: 游戏视图布局
- `PlayerList`: 玩家列表
- `AchievementTable`: 胜负展示
- `GameChat`: 游戏内聊天
- `Icon`: 图标组件（支持 Iconify）
- `MessageBox`: 消息弹窗
- `Message`: 消息提醒

## 倒计时实现

### 后端实现

```typescript
export default class MyGame extends GameRoom {
  init() {
    // 注册倒计时恢复回调
    this.restoreTimer({
      turn: () => this.handleTurnTimeout(),
    });
    return super.init();
  }

  startTurn() {
    // 启动 30 秒倒计时，自动广播 countdown 指令
    this.startTimer(() => {
      this.handleTurnTimeout();
    }, 30 * 1000, 'turn');
  }

  handleTurnTimeout() {
    // 倒计时结束的处理
    this.say('时间到！');
  }
}
```

### 前端实现

```typescript
const countdown = ref(0);
let timer: any = null;

function startLocalTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) clearInterval(timer);
  }, 1000);
}

game.on('command', (msg) => {
  if (msg.type === 'countdown') {
    countdown.value = msg.data.seconds;
    startLocalTimer();
  }
  if (msg.type === 'status' && msg.data.tickTimeEnd['turn']) {
    countdown.value = Math.max(0, Math.ceil(
      (msg.data.tickTimeEnd['turn'] - Date.now()) / 1000
    ));
    startLocalTimer();
  }
});
```

## 游戏数据管理

### 后端实现 IGameData

```typescript
import { BaseModel } from '.';
import { Entity, Column } from 'typeorm';

@Entity({ name: 'my_game_data' })
export class Model extends BaseModel {
  @Column({ comment: "数据字段" })
  field: string = '';
}

export default class MyGameRoom extends GameRoom implements IGameData<Model> {
  async getList(query: { page: number; count: number; [key: string]: any }) {
    const [records, total] = await Model.getRepo<Model>(Model).findAndCount({
      skip: (query.page - 1) * query.count,
      take: query.count,
    });
    return { records, total };
  }

  async insert(data: Model): Promise<Model> {
    return await Model.getRepo<Model>(Model).save(
      Model.getRepo<Model>(Model).create(data)
    );
  }

  async update(id: string, data: Partial<Model>): Promise<void> {
    await Model.getRepo<Model>(Model).update(id, data);
  }

  async delete(id: string): Promise<void> {
    await Model.getRepo<Model>(Model).delete(id);
  }
}
```

### 前端管理界面

```vue
<template>
  <DataForm
    ref="dataFormRef"
    :game-key="gameKey"
    :columns="columns"
    @add="handleAdd"
    @edit="handleEdit"
  >
    <template #search="{ query }">
      <input
        v-model="query.keyword"
        class="input input-bordered"
        placeholder="搜索..."
      />
    </template>
  </DataForm>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DataForm, { Field } from '@/components/common/DataForm.vue';

const gameKey = 'mygame';
const columns: Field[] = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'field', label: '字段', type: 'text' },
];
</script>
```

## 游戏回放

### 后端实现

```typescript
export default class MyGame extends GameRoom {
  moves: Array<{ action: string; time: number }> = [];

  onCommand(message: IGameCommand) {
    // 记录行为和时间
    this.moves.push({
      action: message.type,
      time: new Date().getTime() - this.beginTime
    });
  }

  getData() {
    return {
      ...super.getData(),
      moves: this.moves,
    };
  }
}
```

### 前端回放组件

```vue
<template>
  <div>
    <!-- 回放界面 -->
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  moves: Array<{ action: string; time: number }>;
  beginTime: number;
}>();

// 根据 moves 和 time 实现回放逻辑
</script>
```

## 开发调试

### 安装依赖

```bash
cd game
npm install
```

### 启动开发服务器

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend    # 后端 http://127.0.0.1:27015
npm run dev:frontend   # 前端 http://localhost:5174
```

VSCode 按 F5 可直接调试后端。

### 测试游戏

完成游戏开发后，按以下步骤进行测试：

1. **安装依赖**
   ```bash
   cd game
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```
   等待两个服务都启动成功：
   - 后端服务: http://127.0.0.1:27015
   - 前端服务: http://127.0.0.1:5173

3. **打开浏览器访问游戏**
   
   在浏览器中打开 http://127.0.0.1:5173

4. **本地登录**
   
   在登录页面输入任意用户名（用于本地测试）进行登录。

5. **创建游戏房间**
   
   登录后，在游戏大厅中选择你开发的游戏，创建对应的房间即可进行测试。
   
   > **提示**: 如果需要多人测试，可以在另一个浏览器窗口（或使用隐私模式）以不同用户名登录，加入同一房间进行联机测试。

### 生产构建

```bash
npm run build
```

### 部署

```bash
node index.js
# 或使用 PM2
pm2 start -n game-room node -- index.js
```

## 完整示例：抢数字游戏

### 后端 (backend/src/games/click.ts)

```typescript
import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

export const name = '抢数字';
export const minSize = 2;
export const maxSize = 2;
export const description = '玩家轮流点击按钮增加计数，谁让计数变成指定数字谁就获胜。';

export default class ClickRoom extends GameRoom {
  count = 0;
  currentPlayer: RoomPlayer | undefined;
  target = 0;
  history: { playerId: string; increment: number; time: number }[] = [];

  onStart() {
    this.count = 0;
    this.history = [];
    this.currentPlayer = this.room.validPlayers[0];
    this.target = Math.floor(Math.random() * 40) + 20;
    
    this.command('update', { count: this.count, target: this.target });
    this.command('turn', { player: this.currentPlayer });
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    
    if (message.type === 'click') {
      const increment = Number(message.data - 1) % 4 + 1;
      this.count += increment;
      this.history.push({
        playerId: message.sender.id,
        increment,
        time: Date.now() - this.beginTime
      });
      
      this.command('update', { count: this.count });
      this.save();

      if (this.count === this.target) {
        this.saveAchievements([message.sender]);
        this.say(`${message.sender.name} 获胜！`);
        this.room.end();
      } else if (this.count > this.target) {
        this.saveAchievements();
        this.say('平局！');
        this.room.end();
      } else {
        this.currentPlayer = this.room.validPlayers.find(
          p => p.id !== message.sender.id
        );
        this.command('turn', { player: this.currentPlayer });
      }
    }
  }

  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      count: this.count,
      target: this.target,
      currentPlayer: this.currentPlayer,
    };
  }

  getData() {
    return {
      ...super.getData(),
      target: this.target,
      history: this.history,
    };
  }
}
```

### 前端 (frontend/src/components/games/ClickRoom.vue)

```vue
<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center">
      <h1 class="text-[50px] font-bold p-4">
        {{ count }} {{ count == target ? "=" : "≠" }} {{ target }}
      </h1>
      <div class="join">
        <button
          v-for="n in 4"
          :key="n"
          class="btn btn-primary join-item"
          @click="handleClick(n)"
          :disabled="!isPlaying"
        >
          +{{ n }}
        </button>
      </div>
    </div>

    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>1. 双方轮流点击按钮加1~4。</li>
        <li>2. 当计数达到目标数字时，当前玩家获胜。</li>
        <li>3. 当计数大于目标数字时，则打成平手。</li>
      </ul>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { RoomPlayer, Room } from "tiaoom/client";
import { GameCore } from "@/core/game";
import { computed, ref } from "vue";

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const count = ref(0);
const target = ref(0);
const currentPlayer = ref<RoomPlayer | null>(null);

function handleClick(n: number) {
  props.game.command(props.roomPlayer.room.id, {
    type: "click",
    data: n
  });
}

function onCommand(msg: any) {
  switch(msg.type) {
    case 'turn':
      currentPlayer.value = msg.data.player;
      break;
    case 'update':
      count.value = msg.data.count;
      if (msg.data.target) target.value = msg.data.target;
      break;
    case 'status':
      currentPlayer.value = msg.data.currentPlayer;
      target.value = msg.data.target || 0;
      count.value = msg.data.count || 0;
      break;
  }
}

const isPlaying = computed(() => {
  return (
    props.roomPlayer.role === "player" &&
    props.roomPlayer.room.status === "playing" &&
    currentPlayer.value?.id === props.roomPlayer.id
  );
});
</script>
```

## 最佳实践

### 1. 状态同步
- 使用 `command` 广播状态变化
- 实现完整的 `getStatus` 方法支持断线重连
- 及时调用 `save()` 保存关键状态

### 2. 用户体验
- 提供清晰的游戏规则说明
- 使用倒计时限制操作时间
- 实现友好的错误提示

### 3. 性能优化
- 避免频繁广播大量数据
- 使用 `commandTo` 发送玩家特定信息
- 合理使用 `saveIgnoreProps` 减少持久化数据

### 4. 安全性
- 验证玩家操作的合法性
- 检查玩家回合和状态
- 防止作弊和非法操作

### 5. 可维护性
- 代码模块化，逻辑清晰
- 添加必要的注释
- 遵循命名规范

## 扩展功能

### 游戏扩展页面

```typescript
// 后端配置
export const extendPages = [
  { name: '投稿', component: 'MyGamePost' }
];

// 添加路由
get Routers() {
  const router = Router();
  router.post('/post', async (req, res) => {
    // 处理投稿
    res.json({ code: 0, message: '成功' });
  });
  return router;
}
```

```vue
<!-- MyGamePost.vue -->
<template>
  <div class="p-4">
    <h2>我要投稿</h2>
    <!-- 表单 -->
  </div>
</template>
```

### 自定义积分奖励

```typescript
export const rewardDescription = '获胜者获得对手投入积分的双倍';

export default class MyGame extends GameRoom {
  async saveAchievements(winner: RoomPlayer[] | null = null) {
    // 自定义积分奖励逻辑
    if (winner) {
      const reward = this.calculateReward();
      // 奖励积分...
    }
    // 保存成就记录
  }
}
```

## 常见问题

### Q: 游戏结束后玩家无法离开房间？
A: 确保调用了 `this.room.end()` 方法。

### Q: 服务器重启后游戏状态丢失？
A: 检查是否正确实现了 `getData()` 和 `getStatus()` 方法，并且没有将关键属性添加到 `saveIgnoreProps`。

### Q: 倒计时在重连后不准确？
A: 确保在 `init()` 中调用了 `restoreTimer()`，并在 `getStatus()` 中返回了 `tickTimeEnd`。

### Q: 前端无法接收到后端消息？
A: 检查事件监听是否正确，使用 `@command="onCommand"` 或 `game.on('command', onCommand)`。

### Q: 如何调试游戏？
A: 使用 VSCode 按 F5 调试后端，使用浏览器开发者工具调试前端。后端日志会显示在控制台。

## 资源链接

- 项目仓库: https://github.com/FishPiOffical/tiaoom
- 在线体验: https://room.adventext.fun
- 文档地址: https://github.com/FishPiOffical/tiaoom/tree/main/docs/game

## 总结

使用此 Skill 可以快速开发 Tiaoom 平台的多人在线游戏：

1. **后端**: 继承 `GameRoom`，实现游戏逻辑
2. **前端**: 创建 Vue 组件，使用 `GameView` 布局
3. **通信**: WebSocket 实时同步游戏状态
4. **持久化**: 自动保存游戏状态和回放数据
5. **扩展**: 支持数据管理、积分系统、回放等功能

遵循规范和最佳实践，即可创建出高质量的多人在线游戏！