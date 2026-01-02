# 摸鱼竞技大厅

这是基于 [tiaoom](https://tiaoom.com) 开发的游戏项目。访问地址: [https://room.adventext.fun](https://room.adventext.fun)。你可以通过本文档了解如何运行和开发新的游戏。

## 项目结构 {#project-structure}

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
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── api/              # API 请求
│   │   ├── components/       # Vue 组件
│   │   │   └── games/       # 游戏组件
│   │   ├── core/            # 核心游戏逻辑
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── types/           # TypeScript 类型
│   │   ├── views/           # 页面组件
│   │   ├── router/          # 路由配置
│   │   └── main.ts          # 入口文件
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── embed/               # 游戏状态嵌入脚本
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   ├── tsdown.config.ts
│   └── tsconfig.json
└── README.md            # 本文件
```

## 依赖管理 {#dependency-management}

本项目使用 **npm workspace** 管理 monorepo：

- 公共依赖（如 TypeScript、@types/node）在根目录管理
- 各子包保持独立的 dependencies
- 使用 `npm install` 一次性安装所有依赖
- 使用 `npm run <script> --workspace=<package>` 操作特定包

## 环境要求 {#environment-requirements}

- Node.js >= 20.x
- npm >= 9.x
- MySQL >= 7.0
- 推荐使用 VSCode 进行开发
