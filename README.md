<p align="center">
  <img width="200" src="logo.png">
</p>

<h1 align="center">Tiaoom - a Tiaoable project</h1>
<p align="center">组件化游戏房间管理开发包</p>

[📃在线文档](https://room-docs.adventext.fun)

## ✨功能
- 玩家注册与登录；
- 多人在线房间管理；
- 房间内玩家实时互动；
- 可扩展的游戏逻辑接口；

## 🚀 快速开始

- 安装包 `tiaoom`：

```bash
npm install tiaoom
```

后端从 `tiaoom` 引入 `Tiaoom`，并继承实现通信方法：

```typescript
import { Tiaoom } from 'tiaoom';

class YourGameServer extends Tiaoom {
  // 实现通信方法
}
```
> 具体见 `game/backend/src/controller.ts`

前端则从 `tiaoom/client` 引入 `Tiaoom`，并继承实现通信方法：

```typescript
import { Tiaoom } from 'tiaoom/client';
class YourGameClient extends Tiaoom {
  // 实现通信方法
}
``` 
> 具体见 `game/frontend/src/core/game.ts`

## 🎮 实现游戏示例

本仓库内置一个基于 Websocket 为通信协议的游戏服务，实现新的游戏只需编写两个文件：

- game/backend/src/games/yourgame.js - 游戏逻辑入口与配置信息；
- game/frontend/src/components/yourgame/YourGameRoom.vue - 游戏前端组件；

完成后重启服务即可在前端选择运行游戏。

目前已内置：

- 五子棋
- 四子棋
- 黑白棋
- 谁是卧底
  
## ⚙️ 调试/运行
1. cd 到 `game`, 执行 `npm install`;
2. 使用 Visual Studio Code 运行调试（直接按下`F5`即可），或执行 `npm run dev:backend` 启动后端开发服务器。
3. 执行 `npm run dev:frontend` 启动前端开发服务器，访问 `http://localhost:5173`。

> 本地调试可修改 `game/frontend/src/views/Login.vue` 中的`const loginType = ref('fishpi')` 为 `normal`，即可切换为用户名登录模式。

## 📁 目录与文件
- .vscode - VSCode 调试配置
- lib - 核心类库
  - events - 各个数据事件定义
  - models - 数据模型实现
    - message.ts - 消息基础模型
    - player.ts - 玩家基础模型
    - room.ts - 房间基础模型
  - client - 前端类库入口
  - index.ts - 后端类库入口
- game - 游戏示例
  - backend - 后端实现
    - src
      - controller.ts - 后端控制器实现
      - index.ts - 后端入口
      - games - 游戏逻辑实现
  - frontend - 前端实现
    - public - 静态资源
    - src
      - assets - 资源文件
      - components - 游戏组件文件
      - core - 前端核心类库实现
      - views - 视图文件
      - App.vue - 根组件
      - main.ts - 前端入口