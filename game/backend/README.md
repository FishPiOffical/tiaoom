# Game Backend Server

游戏房间后端 API 服务器

## 安装依赖

```bash
# 在项目根目录执行
npm install
```

## 开发

```bash
# 在项目根目录执行
npm run dev:backend

# 或在 backend 目录执行
npm run dev
```

## 构建

```bash
npm run build
```

## 运行

```bash
npm start
```

## API 端点

- `GET /api/config` - 获取配置信息（WebSocket 地址和游戏列表）
- `GET /api/session` - 获取当前会话信息
- `POST /api/login` - 用户登录
- `GET /api/login/fishpi` - 摸鱼派登录
- `POST /api/logout` - 用户登出
- `GET /api/rooms` - 获取房间列表
- `GET /api/rooms/:id` - 获取指定房间信息
- `GET /api/players` - 获取玩家列表
- `GET /api/players/:id` - 获取指定玩家信息

## WebSocket

WebSocket 服务器地址：`ws://127.0.0.1:27016`
