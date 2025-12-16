# 摸鱼棋牌室

这是基于 [tiaoom](https://tiaoom.com) 开发的游戏项目。

## 项目结构

```
game/
├── package.json          # 根项目配置（npm workspace）
├── backend/              # 后端服务器
│   ├── src/             # 源代码（从原项目复制）
│   ├── games/           # 游戏逻辑（从原项目复制）
│   ├── sessions/        # 会话存储（从原项目复制）
│   ├── index.ts         # 后端入口
│   ├── package.json     # 后端依赖
│   └── tsconfig.json
└── frontend/            # 前端应用
    ├── src/
    │   ├── api/              # API 请求
    │   ├── components/       # Vue 组件
    │   │   └── games/       # 游戏组件
    │   ├── core/            # 核心游戏逻辑
    │   ├── stores/          # Pinia 状态管理
    │   ├── types/           # TypeScript 类型
    │   ├── views/           # 页面组件
    │   ├── router/          # 路由配置
    │   └── main.ts          # 入口文件
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

## 依赖管理

本项目使用 **npm workspace** 管理 monorepo：

- 公共依赖（如 TypeScript、@types/node）在根目录管理
- 各子包保持独立的 dependencies
- 使用 `npm install` 一次性安装所有依赖
- 使用 `npm run <script> --workspace=<package>` 操作特定包

## 快速开始

### 安装依赖

使用 npm workspace 统一管理依赖：

```bash
# 在项目根目录安装所有依赖
cd game
npm install
```

### 开发模式

```bash
# 方式1: 同时启动前后端（推荐）
npm run dev

# 方式2: 分别启动
npm run dev:backend    # 仅启动后端
npm run dev:frontend   # 仅启动前端
```

- 后端 API: http://127.0.0.1:27015
- 前端应用: http://localhost:5174
- WebSocket: ws://127.0.0.1:27015

VSCode 按下 F5 可直接启动调试后端。

### 生产构建

```bash
# 构建前后端
npm run build

# 或分别构建
npm run build:backend
npm run build:frontend
```

### 部署

生产构建后运行 `node index.js` 即可。

## 贡献

可以通过在 `backend/src/games` 目录下添加新的游戏模块来扩展游戏内容。游戏界面组件位于 `frontend/src/components/` 目录下。

游戏文件名需按照如下规则命名：

- 后端游戏逻辑文件：`<GameName>.ts`
- 前端游戏组件文件：`<GameName>Room.vue`
- 前端游戏小窗组件：`<GameName>Lite.ts`

后端需暴露如下：

```typescript
export default (room: Room, { save, restore }: IGameMethod) => void
export const name = '游戏名称';
export const minSize = 2; // 最小玩家数
export const maxSize = 2; // 最大玩家数
export const description = `游戏描述`;
```

若要实现游戏游戏数据持久化，请使用 `save` 和 `restore` 方法，例如。

```typescript
// 保存游戏状态
save({ gameData1: 'xxx', gameData2: 123 });

// 恢复游戏状态
const state = restore();
const gameData1 = state?.gameData1 || 'defaultValue';
const gameData2 = state?.gameData2 || 0;
```

前端组件包含如下属性：

```typescript
const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>()
```

前端可使用如下封装组件实现通用功能：

- `RoomControls`：房间控制面板
- `PlayerList`：玩家列表
- `GameChat`：游戏内聊天
- `Icon`：图标组件，支持 Iconify 图标库

## 其他

- 参考 [tiaoom 文档](https://tiaoom.com/) 了解更多 API 和使用方法。
- [游戏状态嵌入脚本](./embed/README.md) 提供将游戏状态嵌入到任意网页中的能力。