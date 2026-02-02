# 快速开始

## 3 步环境设置

### Step 1: 克隆仓库并安装依赖

```bash
git clone https://github.com/FishPiOffical/tiaoom.git
cd tiaoom/game
npm install
```

### Step 2: 启动开发服务

```bash
npm run dev
```

等待两个服务都启动成功：
- 后端服务: http://127.0.0.1:27015
- 前端服务: http://localhost:5173

### Step 3: 打开浏览器

访问 http://localhost:5173，你应该看到 Tiaoom 游戏大厅首页。

✅ **完成！** 现在你可以开始开发游戏了。

---

## 最小化游戏示例（30 行代码）

### 后端：`backend/src/games/Ping.ts`

```typescript
import { GameRoom, IGameCommand } from '.';

export const name = 'Ping';
export const minSize = 2;
export const maxSize = 2;
export const description = '一个最小化的示例游戏';

export default class PingRoom extends GameRoom {
  pings = 0;

  onStart() {
    this.pings = 0;
    this.command('reset', { pings: this.pings });
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    if (message.type === 'ping') {
      this.pings++;
      this.command('update', { pings: this.pings });
      this.save();
      
      if (this.pings >= 10) {
        this.saveAchievements([message.sender]);
        this.say(`${message.sender.name} 赢了！`);
        this.room.end();
      }
    }
  }

  getStatus(sender: any) {
    return { ...super.getStatus(sender), pings: this.pings };
  }
}
```

### 前端：`frontend/src/components/games/PingRoom.vue`

```vue
<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center">
      <h1 class="text-6xl font-bold">{{ pings }}</h1>
      <button 
        @click="sendPing" 
        class="btn btn-primary btn-lg mt-8"
        :disabled="!isMyTurn"
      >
        Ping!
      </button>
    </div>
  </GameView>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const pings = ref(0);

function sendPing() {
  props.game.command(props.roomPlayer.room.id, {
    type: 'ping'
  });
}

function onCommand(msg: any) {
  if (msg.type === 'reset' || msg.type === 'update' || msg.type === 'status') {
    pings.value = msg.data.pings;
  }
}

const isMyTurn = computed(() => {
  return props.roomPlayer.room.status === 'playing';
});
</script>
```

---

## 下一步

1. ✅ 创建上述两个文件
2. ✅ 运行 `npm run dev`
3. ✅ 在浏览器中测试你的游戏
4. ✅ 查看 `architecture.md` 深入理解架构
5. ✅ 查看 `examples.md` 学习更复杂的游戏

---

## 常见错误排查

### ❌ 后端服务启动失败

```bash
# 清除缓存并重新安装
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### ❌ 前端无法访问

- 确保 npm run dev 已启动
- 检查是否监听在 http://localhost:5173
- 尝试手动刷新浏览器（Ctrl+R）

### ❌ WebSocket 连接失败

- 检查后端是否正在运行
- 查看浏览器开发者工具 (F12) 中的 Network 标签
- 检查防火墙设置

---

## 验证环境

运行此命令验证所有依赖都已正确安装：

```bash
npm run dev
```

你应该看到类似的输出：

```
✅ 后端服务已启动: http://127.0.0.1:27015
✅ 前端服务已启动: http://localhost:5173
```

现在你可以在浏览器中打开游戏了！
