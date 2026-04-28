# 完整示例：抢数字游戏

## 游戏概述

抢数字是一个简单但有趣的多人竞技游戏。主机会生成一个 1-100 之间的随机数字，玩家们轮流猜测，谁最先猜中就获胜。猜测过程中，主机会给出"太大"或"太小"的提示。

- **玩家数：** 2-4 人
- **难度：** 简单
- **游戏时长：** 2-5 分钟

## 后端实现

### GameRoom 类

```typescript
// Click.ts
import { GameRoom, RoomPlayer } from '@tiaoom/sdk';

interface IClickData {
  targetNumber: number;
  currentPlayer: RoomPlayer | null;
  guesses: Record<string, number[]>;
  hint: string;
  round: number;
}

export default class ClickRoom extends GameRoom {
  data: IClickData = {
    targetNumber: 0,
    currentPlayer: null,
    guesses: {},
    hint: '',
    round: 1,
  };

  /**
   * 游戏初始化
   * 恢复断线重连时的定时器
   */
  init() {
    this.restoreTimer({
      turnTimeout: () => this.onTurnTimeout(),
      roundTimeout: () => this.onRoundTimeout(),
    });
    return super.init();
  }

  /**
   * 游戏开始
   * 初始化数据并发送开始信息
   */
  onStart() {
    // 初始化每个玩家的猜测记录
    this.room.validPlayers.forEach(player => {
      this.data.guesses[player.id] = [];
    });

    // 生成目标数字
    this.data.targetNumber = Math.floor(Math.random() * 100) + 1;

    // 设置第一个玩家
    this.data.currentPlayer = this.room.validPlayers[0];

    // 发送游戏开始消息
    this.command('gameStart', {
      targetNumber: this.data.targetNumber,
      currentPlayer: this.data.currentPlayer,
      players: this.room.validPlayers.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
      })),
    });

    // 启动回合倒计时（30 秒）
    this.startTimer(
      () => this.onTurnTimeout(),
      30 * 1000,
      'turnTimeout'
    );
  }

  /**
   * 处理玩家猜测
   */
  onCommand(message: IGameCommand) {
    if (message.type === 'guess') {
      const guess = message.data.guess;

      // 验证是否轮到该玩家
      if (this.data.currentPlayer?.id !== message.sender.id) {
        this.say(`@${message.sender.name} 还不是你的回合！`);
        return;
      }

      // 验证猜测范围
      if (guess < 1 || guess > 100) {
        this.say(`@${message.sender.name} 请输入 1-100 的数字`);
        return;
      }

      // 记录猜测
      this.data.guesses[message.sender.id].push(guess);

      // 检查是否猜中
      if (guess === this.data.targetNumber) {
        this.say(
          `恭喜！@${message.sender.name} 猜中了数字 ${this.data.targetNumber}！`
        );

        // 停止倒计时
        this.stopTimer('turnTimeout');

        // 保存成就（赢家获得积分）
        this.saveAchievements([message.sender]);
        this.room.end();
        return;
      }

      // 生成提示
      if (guess < this.data.targetNumber) {
        this.data.hint = `${guess} 太小了，继续加油！`;
      } else {
        this.data.hint = `${guess} 太大了，继续加油！`;
      }

      // 广播提示和猜测历史
      this.command('guess', {
        playerId: message.sender.id,
        guess,
        hint: this.data.hint,
        guesses: this.data.guesses[message.sender.id],
      });

      // 切换到下一个玩家
      this.nextPlayer();

      // 重新启动倒计时
      this.stopTimer('turnTimeout');
      this.startTimer(
        () => this.onTurnTimeout(),
        30 * 1000,
        'turnTimeout'
      );
    }
  }

  /**
   * 获取当前游戏状态
   * 用于断线重连恢复
   */
  getData() {
    return {
      ...super.getData(),
      ...this.data,
    };
  }

  /**
   * 玩家超时处理
   */
  private onTurnTimeout() {
    this.say(`@${this.data.currentPlayer?.name} 超时，跳过本轮`);
    this.nextPlayer();

    // 如果所有玩家都超时 3 次，游戏结束
    const maxSkips = this.room.validPlayers.length * 3;
    const totalSkips = Object.values(this.data.guesses).reduce(
      (sum, guesses) => sum + guesses.length,
      0
    );

    if (totalSkips >= maxSkips) {
      this.say(`所有玩家都超时了，游戏结束！目标数字是 ${this.data.targetNumber}`);
      this.room.end();
    } else {
      // 重新启动倒计时
      this.startTimer(
        () => this.onTurnTimeout(),
        30 * 1000,
        'turnTimeout'
      );
    }
  }

  /**
   * 回合结束倒计时
   */
  private onRoundTimeout() {
    this.say('本回合时间已到，游戏结束！');
    this.room.end();
  }

  /**
   * 切换到下一个玩家
   */
  private nextPlayer() {
    const currentIndex = this.room.validPlayers.findIndex(
      p => p.id === this.data.currentPlayer?.id
    );
    const nextIndex = (currentIndex + 1) % this.room.validPlayers.length;
    this.data.currentPlayer = this.room.validPlayers[nextIndex];

    this.command('nextPlayer', {
      currentPlayer: this.data.currentPlayer,
    });
  }
}
```

### 类型定义

```typescript
// types.ts
import { IGameCommand } from '@tiaoom/sdk';

export interface GuessCommand extends IGameCommand {
  type: 'guess';
  data: {
    guess: number;
  };
}

export interface ClickGameData {
  targetNumber: number;
  currentPlayer: {
    id: string;
    name: string;
    avatar: string;
  };
  guesses: Record<string, number[]>;
  hint: string;
  round: number;
}
```

## 前端实现

### 主游戏组件

```vue
<!-- ClickRoom.vue -->
<template>
  <GameView :room-player="roomPlayer" @command="onCommand">
    <!-- 游戏信息区 -->
    <template #header>
      <div class="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div>
          <h1 class="text-2xl font-bold">抢数字</h1>
          <p class="text-sm opacity-90">轮流猜测隐藏的数字</p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-bold">第 {{ gameData?.round || 1 }} 回合</div>
          <div class="text-sm">{{ players.length }} 位玩家</div>
        </div>
      </div>
    </template>

    <!-- 游戏内容区 -->
    <template #default>
      <div class="p-8 space-y-8">
        <!-- 当前状态 -->
        <div v-if="gameData" class="space-y-6">
          <!-- 当前玩家信息 -->
          <div class="card bg-white shadow-lg p-6">
            <div class="text-center space-y-3">
              <div class="text-xl font-semibold">
                当前轮到：<span class="text-blue-600 text-2xl">{{ currentPlayerName }}</span>
              </div>
              <div v-if="isMyTurn" class="badge badge-lg badge-success animate-pulse">
                🎮 该你了！
              </div>
              <div class="countdown text-4xl font-bold text-red-500">
                ⏱️ {{ countdown }}s
              </div>
            </div>
          </div>

          <!-- 提示信息 -->
          <div v-if="gameData.hint" class="alert alert-info shadow-lg">
            <div class="flex items-center gap-4">
              <span class="text-3xl">💡</span>
              <div>
                <h3 class="font-bold">上一次猜测的提示</h3>
                <div class="text-lg">{{ gameData.hint }}</div>
              </div>
            </div>
          </div>

          <!-- 猜测输入 -->
          <div v-if="isMyTurn" class="card bg-blue-50 shadow-lg p-6">
            <h2 class="text-xl font-bold mb-4">输入你的猜测（1-100）</h2>
            <div class="flex gap-3">
              <input
                v-model.number="myGuess"
                type="number"
                placeholder="输入数字..."
                class="input input-bordered input-lg flex-1"
                min="1"
                max="100"
                @keyup.enter="submitGuess"
              />
              <button
                @click="submitGuess"
                :disabled="isSubmitting"
                class="btn btn-primary btn-lg"
              >
                <span v-if="!isSubmitting">🎯 猜测</span>
                <span v-else class="loading loading-spinner"></span>
              </button>
            </div>
            <div v-if="myGuesses.length" class="mt-4">
              <h3 class="text-sm font-bold mb-2">你已猜过的数字：</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="guess in myGuesses"
                  :key="guess"
                  class="badge badge-lg badge-outline"
                >
                  {{ guess }}
                </span>
              </div>
            </div>
          </div>

          <!-- 等待状态 -->
          <div v-else class="alert shadow-lg">
            <div class="flex items-center gap-3">
              <span class="loading loading-spinner"></span>
              <span>等待 {{ currentPlayerName }} 进行猜测...</span>
            </div>
          </div>

          <!-- 所有玩家的猜测历史 -->
          <div v-if="Object.keys(gameData.guesses).length" class="card bg-base-100 shadow-lg p-6">
            <h2 class="text-xl font-bold mb-4">猜测历史</h2>
            <div class="space-y-3">
              <div
                v-for="player in players"
                :key="player.id"
                class="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <img
                    :src="player.avatar || ''"
                    :alt="player.name"
                    class="w-8 h-8 rounded-full"
                  />
                  <span class="font-semibold">{{ player.name }}</span>
                </div>
                <div class="flex gap-2 flex-wrap justify-end">
                  <span
                    v-for="guess in gameData.guesses[player.id] || []"
                    :key="guess"
                    class="badge badge-sm"
                  >
                    {{ guess }}
                  </span>
                  <span
                    v-if="!gameData.guesses[player.id]?.length"
                    class="text-gray-400 text-sm"
                  >
                    尚未猜测
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 游戏未开始 -->
        <div v-else class="text-center py-12">
          <div class="text-6xl mb-4">⏳</div>
          <p class="text-2xl font-bold">游戏加载中...</p>
        </div>
      </div>
    </template>

    <!-- 玩家列表 -->
    <template #aside>
      <PlayerList :room-player="roomPlayer" />
      <div class="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 class="font-bold mb-2">游戏规则</h3>
        <ul class="text-sm space-y-1">
          <li>✓ 轮流猜测隐藏的数字</li>
          <li>✓ 根据提示调整范围</li>
          <li>✓ 首先猜中者获胜</li>
          <li>✓ 30 秒内需完成猜测</li>
        </ul>
      </div>
    </template>

    <!-- 结果页面 -->
    <template #gameover>
      <div class="space-y-4">
        <div class="text-center py-8">
          <div class="text-6xl mb-4">🎉</div>
          <h2 class="text-3xl font-bold">游戏结束！</h2>
        </div>

        <div class="card bg-yellow-50 shadow-lg p-6">
          <div class="text-center space-y-3">
            <div class="text-2xl font-bold">
              🏆 获胜者：<span class="text-yellow-600">{{ winner?.name }}</span>
            </div>
            <div class="text-lg">
              在 {{ gameData?.guesses[winner?.id || '']?.length || 0 }} 次猜测后赢得游戏
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <button @click="playAgain" class="btn btn-primary w-full">
            🔄 再来一局
          </button>
          <button @click="leaveGame" class="btn btn-outline w-full">
            👋 离开游戏
          </button>
        </div>
      </div>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGame } from '@/hook';
import GameView from '@/components/game/GameView.vue';
import PlayerList from '@/components/game/PlayerList.vue';

const props = defineProps<{
  roomPlayer: any;
}>();

const emit = defineEmits<{
  playAgain: [];
  leaveGame: [];
}>();

const {
  game,
  gameData,
  players,
  isMyTurn,
  currentPlayerId,
} = useGame();

// 游戏状态
const myGuess = ref<number | null>(null);
const myGuesses = ref<number[]>([]);
const isSubmitting = ref(false);
const countdown = ref(30);
let countdownTimer: any = null;

// 计算属性
const currentPlayerName = computed(() => {
  const player = players.value.find(
    p => p.id === gameData.value?.currentPlayer?.id
  );
  return player?.name || '未知玩家';
});

const winner = computed(() => {
  return players.value[0]; // 实际应从游戏结果获取
});

// 监听游戏开始
watch(
  () => gameData.value,
  (newData) => {
    if (newData?.currentPlayer) {
      resetCountdown();
    }
  },
  { deep: true }
);

// 倒计时逻辑
function resetCountdown() {
  countdown.value = 30;
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
    }
  }, 1000);
}

// 提交猜测
async function submitGuess() {
  if (!myGuess.value || myGuess.value < 1 || myGuess.value > 100) {
    alert('请输入 1-100 之间的有效数字');
    return;
  }

  isSubmitting.value = true;
  try {
    game.command('guess', { guess: myGuess.value });
    myGuesses.value.push(myGuess.value);
    myGuess.value = null;
  } finally {
    isSubmitting.value = false;
  }
}

// 处理游戏命令
function onCommand(msg: any) {
  if (msg.type === 'gameStart') {
    myGuesses.value = [];
    resetCountdown();
  } else if (msg.type === 'nextPlayer') {
    resetCountdown();
  }
}

// 再来一局
async function playAgain() {
  emit('playAgain');
}

// 离开游戏
async function leaveGame() {
  emit('leaveGame');
}

// 清理
watch(
  () => props.roomPlayer,
  () => {
    clearInterval(countdownTimer);
  }
);
</script>

<style scoped>
.countdown {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
```

## 部署说明

### 后端部署

1. **将游戏文件放在正确的位置**

```bash
# 复制后端文件
cp Click.ts /path/to/tiaoom/game/backend/src/games/Click.ts
cp types.ts /path/to/tiaoom/game/backend/src/games/click/types.ts

# 注册游戏路由
# 编辑 /path/to/tiaoom/game/backend/src/routes/index.ts
# 在 games 对象中添加：
# import Click from '../games/Click';
# games['Click'] = Click;
```

2. **启动后端服务**

```bash
cd /path/to/tiaoom/game/backend
npm install
npm run dev
```

### 前端部署

1. **将游戏组件放在正确的位置**

```bash
# 复制前端文件
cp ClickRoom.vue /path/to/tiaoom/game/frontend/src/components/game/rooms/ClickRoom.vue

# 注册游戏路由
# 编辑 /path/to/tiaoom/game/frontend/src/router/index.ts
# 在路由配置中添加：
# { path: '/game/click', component: ClickRoom }
```

2. **启动前端开发服务器**

```bash
cd /path/to/tiaoom/game/frontend
npm install
npm run dev
```

3. **访问游戏**

打开浏览器访问 `http://localhost:5173/game/click`

## 测试清单

- [ ] 游戏能成功启动
- [ ] 多个玩家能连接到游戏
- [ ] 轮到你时，能看到"该你了"提示
- [ ] 猜测数字后能收到正确/错误的反馈
- [ ] 计时器能正常工作
- [ ] 猜中数字后游戏结束并显示获胜者
- [ ] 玩家掉线后能重新连接和恢复游戏状态
- [ ] 所有玩家都超时时游戏结束

## 常见问题

**Q: 游戏如何处理玩家断线？**
A: 通过 `getData()` 方法保存完整的游戏状态，玩家重新连接时会自动恢复。

**Q: 如何修改游戏时间限制？**
A: 修改 `onStart()` 中的 `this.startTimer()` 的第二个参数（毫秒）。

**Q: 如何添加更多游戏模式？**
A: 创建新的 GameRoom 子类，实现不同的 `onCommand()` 逻辑。

