# 调试部署

## 安装依赖

使用 npm workspace 统一管理依赖：

```bash
# 在项目根目录安装所有依赖
cd game
npm install
```

## 开发模式

```bash
# 方式1: 同时启动前后端（推荐）
npm run dev

# 方式2: 分别启动
npm run dev:backend    # 仅启动后端
npm run dev:frontend   # 仅启动前端
```

- 后端 API: `http://127.0.0.1:27015`
- 前端应用: `http://localhost:5174`
- WebSocket: `ws://127.0.0.1:27015`

VSCode 按下 F5 可直接启动调试后端。

## 生产构建

```bash
# 构建前后端
npm run build

# 或分别构建
npm run build:backend
npm run build:frontend
```

## 部署

生产构建后运行 `node index.js` 即可。

可使用 PM2 等进程管理工具进行部署和守护。

```base
pm2 start -n game-room node -- index.js
```
