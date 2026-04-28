# 高级功能

## 倒计时实现

### 后端实现

```typescript
export default class MyGame extends GameRoom {
  init() {
    // 注册倒计时恢复回调
    this.restoreTimer({
      turn: () => this.onTurnTimeout(),
      round: () => this.onRoundTimeout(),
    });
    return super.init();
  }

  startTurn() {
    // 启动 30 秒倒计时
    this.startTimer(
      () => this.onTurnTimeout(),
      30 * 1000,
      'turn'
    );
  }

  stopTurn() {
    this.stopTimer('turn');
  }

  onTurnTimeout() {
    this.say('玩家 ${currentPlayer.name} 超时！');
    this.handleTimeout();
  }

  onRoundTimeout() {
    this.say('本轮时间已到！');
    this.room.end();
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
    if (countdown.value <= 0) {
      clearInterval(timer);
    }
  }, 1000);
}

game.on('command', (msg) => {
  // 后端发送倒计时开始信号
  if (msg.type === 'countdown') {
    countdown.value = msg.data.seconds;
    startLocalTimer();
  }
  
  // 断线重连时恢复倒计时
  if (msg.type === 'status' && msg.data.tickEndTime?.['turn']) {
    countdown.value = Math.max(0, Math.ceil(
      (msg.data.tickEndTime['turn'] - Date.now()) / 1000
    ));
    startLocalTimer();
  }
});
```

### 前端模板

```vue
<template>
  <div class="timer">
    <div class="text-4xl font-bold" :class="{ 'text-error': countdown < 5 }">
      {{ countdown }}s
    </div>
    <progress :value="countdown" :max="30" class="progress"></progress>
  </div>
</template>
```

## 游戏数据管理

### 定义数据模型

```typescript
import { BaseModel } from '.';
import { Entity, Column } from 'typeorm';

@Entity({ name: 'my_game_data' })
export class MyGameData extends BaseModel {
  @Column({ comment: "数据字段 1" })
  field1: string = '';

  @Column({ comment: "数据字段 2" })
  field2: number = 0;
}
```

### 实现 IGameData 接口

```typescript
export default class MyGame extends GameRoom implements IGameData<MyGameData> {
  // 获取数据列表
  async getList(query: { 
    page: number; 
    count: number; 
    [key: string]: any 
  }) {
    const [records, total] = await MyGameData.getRepo<MyGameData>(
      MyGameData
    ).findAndCount({
      skip: (query.page - 1) * query.count,
      take: query.count,
    });
    return { records, total };
  }

  // 创建数据
  async insert(data: MyGameData): Promise<MyGameData> {
    return await MyGameData.getRepo<MyGameData>(MyGameData).save(
      MyGameData.getRepo<MyGameData>(MyGameData).create(data)
    );
  }

  // 更新数据
  async update(id: string, data: Partial<MyGameData>): Promise<void> {
    await MyGameData.getRepo<MyGameData>(MyGameData).update(id, data);
  }

  // 删除数据
  async delete(id: string): Promise<void> {
    await MyGameData.getRepo<MyGameData>(MyGameData).delete(id);
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
    @delete="handleDelete"
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
  { key: 'id', label: 'ID', type: 'text', readonly: true },
  { key: 'field1', label: '字段 1', type: 'text' },
  { key: 'field2', label: '字段 2', type: 'number' },
];

async function handleAdd(data: any) {
  // 添加数据
}

async function handleEdit(id: string, data: any) {
  // 编辑数据
}

async function handleDelete(id: string) {
  // 删除数据
}
</script>
```

## 游戏回放

### 后端记录数据

```typescript
export interface GameMove {
  playerId: string;
  type: string;
  data?: any;
  time: number;
}

export default class MyGame extends GameRoom {
  moves: GameMove[] = [];

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    
    // 记录所有游戏行为（不包括聊天）
    if (message.type !== 'chat') {
      this.moves.push({
        playerId: message.sender.id,
        type: message.type,
        data: message.data,
        time: Date.now() - this.beginTime  // 相对时间
      });
    }
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
  <div class="replay-container">
    <!-- 游戏画面 -->
    <div class="game-display flex-1">
      <!-- 回放当前状态 -->
    </div>

    <!-- 回放控制 -->
    <div class="controls p-4 bg-gray-100">
      <div class="flex gap-4 items-center">
        <button @click="play" class="btn btn-primary">
          ▶ 播放
        </button>
        <button @click="pause" class="btn">
          ⏸ 暂停
        </button>
        <input 
          v-model="progress" 
          type="range" 
          min="0" 
          :max="totalDuration"
          class="flex-1"
        />
        <span>{{ currentTime }} / {{ totalDuration }}s</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface GameMove {
  playerId: string;
  type: string;
  data?: any;
  time: number;
}

const props = defineProps<{
  moves: GameMove[];
  beginTime: number;
}>();

const progress = ref(0);
const isPlaying = ref(false);
let playbackInterval: any = null;

const totalDuration = computed(() => {
  if (props.moves.length === 0) return 0;
  return Math.ceil(props.moves[props.moves.length - 1].time / 1000);
});

const currentTime = computed(() => Math.floor(progress.value));

function play() {
  isPlaying.value = true;
  playbackInterval = setInterval(() => {
    progress.value += 0.1;
    if (progress.value >= totalDuration.value) {
      pause();
    }
  }, 100);
}

function pause() {
  isPlaying.value = false;
  if (playbackInterval) {
    clearInterval(playbackInterval);
  }
}

// 获取当前时间点的游戏状态
function getStateAtTime(time: number) {
  const timeMs = time * 1000;
  return props.moves.filter(m => m.time <= timeMs);
}
</script>

<style scoped>
.replay-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.game-display {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.controls {
  border-top: 1px solid #ddd;
}
</style>
```

## 积分系统

### 自定义积分奖励

```typescript
export const rewardDescription = '获胜者获得对手投入积分的 2 倍';

export default class MyGame extends GameRoom {
  async saveAchievements(winners?: RoomPlayer[] | null) {
    if (winners && winners.length > 0) {
      // 计算奖励
      const loser = this.room.validPlayers.find(
        p => !winners.some(w => w.id === p.id)
      );
      
      if (loser) {
        const reward = loser.score * 2;
        // 颁发奖励...
      }
    }
    
    // 保存成就记录
    await super.saveAchievements(winners);
  }
}
```

### 分数管理

```typescript
// 在游戏逻辑中更新分数
this.saveScore(100);  // 保存分数

// 或在 getData 中包含分数用于回放
getData() {
  return {
    ...super.getData(),
    score: this.calculateScore(),
  };
}
```

## 自定义规则页面

```typescript
export const extendPages = [
  { name: '投稿', component: 'MyGamePost' },
  { name: '排行榜', component: 'MyGameLeaderboard' }
];

// 在路由中添加对应的组件
```

## AI 玩家集成

```typescript
export default class MyGame extends GameRoom {
  private aiPlayer: RoomPlayer | undefined;

  onStart() {
    // 检查是否需要 AI 玩家
    if (this.room.validPlayers.length < this.room.players.length) {
      this.aiPlayer = this.room.players.find(p => p.role === 'ai');
    }
    
    this.playRound();
  }

  private async playRound() {
    if (this.currentPlayer === this.aiPlayer) {
      // AI 玩家思考
      await this.delay(1000);
      
      // AI 做出决策
      const move = this.makeAIMove();
      
      // 模拟 AI 发送指令
      this.virtualCommand('play', move, this.aiPlayer!);
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private makeAIMove(): any {
    // 实现 AI 决策逻辑
    return { /* AI 的移动 */ };
  }
}
```
