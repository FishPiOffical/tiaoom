# Game Frontend

基于 Vue3 + TailwindCSS 的游戏房间前端应用

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- TypeScript - 类型安全
- Vite - 快速的前端构建工具
- TailwindCSS - 实用优先的 CSS 框架
- Pinia - Vue 3 状态管理
- Vue Router - 路由管理
- Axios - HTTP 客户端
- ReconnectingWebSocket - WebSocket 自动重连

## 安装依赖

```bash
# 在项目根目录执行
npm install
```

## 开发

```bash
# 在项目根目录执行
npm run dev:frontend

# 或在 frontend 目录执行
npm run dev
```

开发服务器会在 http://localhost:5174 启动

## 构建

```bash
npm run build
```

构建产物会生成在 `dist` 目录

## 预览构建产物

```bash
npm run preview
```

## 项目结构

```
src/
├── api/              # API 请求封装
├── components/       # 组件，含游戏组件
├── core/            # 核心游戏逻辑
├── stores/          # Pinia 状态管理
├── types/           # TypeScript 类型定义
├── views/           # 页面组件
├── router/          # 路由配置
├── layout/          # 布局组件
├── App.vue          # 根组件
├── main.ts          # 入口文件
└── style.css        # 全局样式
```

## 功能特性

- ✅ 用户登录/登出
- ✅ 实时玩家列表
- ✅ 实时房间列表
- ✅ 创建/加入/离开房间
- ✅ 房间内聊天
- ✅ 全局聊天
- ✅ WebSocket 实时通信
- ✅ 游戏组件系统

## 注意事项

1. 前端默认连接到 `http://127.0.0.1:27015` 的后端 API
2. WebSocket 地址从后端配置中获取
3. 需要先启动后端服务器才能正常使用
