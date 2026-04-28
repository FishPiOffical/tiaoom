# 后端开发指南

## 基本游戏类结构

```typescript
import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

// ========== 配置导出 ==========

// 1. 游戏基本信息（必需）
export const name = '游戏名称';
export const minSize = 2;           // 最少玩家数
export const maxSize = 4;           // 最多玩家数
export const description = '游戏说明';

// 2. 积分配置（可选）
export const points = {
  '我就玩玩': 0,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
};

// 3. 奖励倍率（可选）
export const rates = {
  '我就玩玩': 1.0,
  '小博一下': 2,
  '大赢家': 5,
};

// ========== 游戏类实现 ==========

export default class MyGameRoom extends GameRoom {
  // 游戏状态属性
  gameState: any = {};
  currentPlayer: RoomPlayer | undefined;

  // 初始化（可选，用于倒计时恢复）
  init() {
    this.restoreTimer({
      turn: () => this.onTurnTimeout(),
    });
    return super.init();
  }

  // 游戏开始（必需）
  onStart() {
    // 初始化游戏状态
    this.gameState = { /* ... */ };
    this.currentPlayer = this.room.validPlayers[0];

    // 广播初始状态
    this.command('gameStart', {
      gameState: this.gameState,
      currentPlayer: this.currentPlayer,
    });

    this.save();
  }

  // 处理玩家指令（必需）
  onCommand(message: IGameCommand) {
    super.onCommand(message);  // 处理通用指令（聊天等）

    switch(message.type) {
      case 'myAction':
        this.handleAction(message);
        break;
    }
  }

  // 获取游戏状态（必需，用于断线重连）
  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      gameState: this.gameState,
      currentPlayer: this.currentPlayer,
    };
  }

  // 获取回放数据（可选）
  getData() {
    return {
      ...super.getData(),
      gameState: this.gameState,
    };
  }

  // 私有方法
  private handleAction(message: IGameCommand) {
    // 验证操作合法性
    if (this.currentPlayer?.id !== message.sender.id) {
      return;
    }

    // 更新游戏状态
    this.gameState.updated = true;
    this.save();

    // 通知所有玩家
    this.command('update', { gameState: this.gameState });
  }

  private onTurnTimeout() {
    this.say('时间到！');
    // 处理超时逻辑
  }
}
```

## GameRoom API 参考

### 通信方法

#### 广播指令

```typescript
this.command(type: string, data?: any): void

// 例如
this.command('gameStart', { count: 0 });
this.command('turn', { player: currentPlayer });
```

#### 广播聊天

```typescript
this.say(content: string, sender?: IRoomPlayer): void

// 例如
this.say('游戏开始！');
this.say(`${message.sender.name} 获胜！`, message.sender);
```

#### 发送给特定玩家

```typescript
this.commandTo(type: string, data: any, receiver: RoomPlayer): void

// 例如
this.commandTo('secretCard', card, player);
```

#### 私聊

```typescript
this.sayTo(content: string, receiver: RoomPlayer): void

// 例如
this.sayTo('这是你的秘密信息', player);
```

#### 模拟玩家指令

```typescript
this.virtualCommand(type: string, data: any, receiver: RoomPlayer): void

// 例如（用于 AI 玩家）
this.virtualCommand('play', move, aiPlayer);
```

### 状态管理方法

#### 保存状态

```typescript
this.save(): void

// 必须在关键位置调用，如：
this.gameState.count++;
this.save();
```

#### 保存成就和积分

```typescript
this.saveAchievements(winners?: RoomPlayer[] | null, saveRecord?: boolean): void

// 游戏结束时调用
this.saveAchievements([winner]);  // 指定获胜者
this.saveAchievements();           // 平局或无胜者
this.saveAchievements([winner], false);  // 不保存记录
```

#### 保存积分

```typescript
this.saveScore(score: number): void

// 单独保存分数
this.saveScore(100);
```

#### 保存记录

```typescript
this.saveRecord(winners?: RoomPlayer[] | null, score?: number): void

// 保存游戏记录
this.saveRecord([winner], 100);
```

### 倒计时方法

#### 启动倒计时

```typescript
this.startTimer(
  callback: () => void,
  ms: number,
  name: string
): void

// 例如
this.startTimer(
  () => this.handleTurnTimeout(),
  30000,  // 30 秒
  'turn'  // 倒计时名称
);
```

#### 停止倒计时

```typescript
this.stopTimer(name: string): void

// 例如
this.stopTimer('turn');
```

#### 恢复倒计时

```typescript
this.restoreTimer(callbacks: { [name: string]: () => void }): Promise<void>

// 在 init() 中调用，以便服务器重启后恢复
this.restoreTimer({
  turn: () => this.handleTurnTimeout(),
  round: () => this.handleRoundTimeout(),
});
```

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `room` | Room | 房间实例 |
| `room.players` | RoomPlayer[] | 所有玩家 |
| `room.validPlayers` | RoomPlayer[] | 活跃玩家 |
| `room.status` | string | 房间状态 |
| `messageHistory` | Message[] | 聊天历史 |
| `beginTime` | number | 游戏开始时间戳 |
| `saveIgnoreProps` | string[] | 不保存的属性 |

## 完整实现示例

### 简单的轮流制游戏

```typescript
import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

export const name = '轮流点击';
export const minSize = 2;
export const maxSize = 2;
export const description = '两个玩家轮流点击，先到 10 次的赢';

export default class TurnClickRoom extends GameRoom {
  clicks = { [playerId: string]: 0 };
  currentPlayer: RoomPlayer | undefined;
  winner: RoomPlayer | undefined;

  onStart() {
    this.currentPlayer = this.room.validPlayers[0];
    for (const player of this.room.validPlayers) {
      this.clicks[player.id] = 0;
    }

    this.command('turnStart', {
      currentPlayer: this.currentPlayer,
      clicks: this.clicks,
    });
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);

    if (message.type === 'click') {
      // 验证是否轮到该玩家
      if (this.currentPlayer?.id !== message.sender.id) {
        return;
      }

      // 更新点击计数
      this.clicks[message.sender.id]++;
      this.save();

      // 检查是否赢了
      if (this.clicks[message.sender.id] >= 10) {
        this.winner = message.sender;
        this.saveAchievements([this.winner]);
        this.say(`${this.winner.name} 获胜！`);
        this.room.end();
        return;
      }

      // 切换到下一个玩家
      this.currentPlayer = this.room.validPlayers.find(
        p => p.id !== this.currentPlayer?.id
      );

      this.command('turnChange', {
        currentPlayer: this.currentPlayer,
        clicks: this.clicks,
      });
    }
  }

  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      currentPlayer: this.currentPlayer,
      clicks: this.clicks,
      winner: this.winner,
    };
  }

  getData() {
    return {
      ...super.getData(),
      clicks: this.clicks,
      winner: this.winner,
    };
  }
}
```

## 最佳实践

### ✅ 必须做

1. **实现完整的 getStatus()**
   ```typescript
   getStatus(sender: any) {
     return {
       ...super.getStatus(sender),
       // 返回所有需要恢复的状态
       gameState: this.gameState,
     };
   }
   ```

2. **在关键位置调用 save()**
   ```typescript
   this.gameState.updated = true;
   this.save();  // 立即保存
   ```

3. **验证所有操作**
   ```typescript
   if (this.currentPlayer?.id !== message.sender.id) {
     return;  // 拒绝非法操作
   }
   ```

4. **游戏结束时调用 room.end()**
   ```typescript
   this.saveAchievements([winner]);
   this.room.end();  // 必须调用！
   ```

### ❌ 避免做

1. **不要在 getData() 中包含临时数据**
   ```typescript
   // ❌ 错误
   getData() {
     return {
       ...super.getData(),
       tempMessages: this.tempMessages,  // 临时数据不应保存
     };
   }
   ```

2. **不要频繁创建大对象**
   ```typescript
   // ❌ 错误
   onCommand() {
     const largeState = generateLargeObject();  // 性能问题
     this.command('update', largeState);
   }
   ```

3. **不要忘记设置 minSize/maxSize**
   ```typescript
   // ❌ 错误
   export const minSize = 1;  // 单人游戏不适合 Tiaoom
   ```

4. **不要直接修改 players**
   ```typescript
   // ❌ 错误
   this.room.players[0].score = 100;  // 使用 save() 保存
   ```

## 调试技巧

### 查看游戏日志

```typescript
console.log('Current state:', this.gameState);
console.log('Players:', this.room.validPlayers);
```

### 验证指令

```typescript
onCommand(message: IGameCommand) {
  console.log('Received command:', message.type, message.data);
  // 处理指令
}
```

### 检查状态同步

```typescript
getStatus(sender: any) {
  console.log('Returning status for:', sender.name);
  return {
    ...super.getStatus(sender),
    gameState: this.gameState,
  };
}
```

## 常见错误

### 错误 1：游戏结束后无法离开房间

**原因**：未调用 `this.room.end()`

**解决**：
```typescript
if (gameOver) {
  this.saveAchievements([winner]);
  this.room.end();  // 添加这一行
}
```

### 错误 2：断线重连后状态混乱

**原因**：`getStatus()` 不完整或 `getData()` 包含不应保存的数据

**解决**：检查 getStatus() 返回的数据是否完整

### 错误 3：倒计时在重连后不工作

**原因**：未在 init() 中调用 `restoreTimer()`

**解决**：
```typescript
init() {
  this.restoreTimer({
    turn: () => this.onTurnTimeout(),
  });
  return super.init();
}
```

### 错误 4：性能问题（帧率卡顿）

**原因**：频繁发送大量数据或频繁保存

**解决**：
- 只发送改变的部分
- 使用节流/防抖
- 减少保存频率
