<p align="center">
  <img width="200" src="logo.png">
</p>

<h1 align="center">Tiaoom - a Tiaoable project</h1>
<p align="center">组件化游戏房间管理系统</p>

## ✨功能
- 玩家注册与登录；
- 多人在线房间管理；
- 房间内玩家实时互动；
- 可扩展的游戏逻辑接口；

## 🎮 实现游戏

实现新的游戏只需编写三个文件：

- game/games/yourgame.js - 游戏逻辑入口；
- game/public/games/yourgame.js - 游戏前端组件；
- game/views/games/yourgame.ejs - 游戏视图；

完成后修改 game/public/main.js 载入编写的前端组件，以及在 game/views/index.ejs `我的房间`下方添加游戏组件，游戏前端组件在最下方添加 script 引入。

目前已内置：

- 五子棋
- 四子棋
- 黑白棋
- 谁是卧底
  
## ⚙️ 调试
1. 执行`npm install`;
2. 使用 Visual Studio Code 运行调试（直接按下`F5`即可）。

## 📁 目录与文件
- .vscode - VSCode 调试配置
- lib - 核心类库
  - events - 各个数据事件定义
  - models - 数据模型实现
    - message.ts - 消息基础模型
    - player.ts - 玩家基础模型
    - room.ts - 房间基础模型
  - index.ts - 类库入口
- game - 游戏示例入口
  - games - 各个游戏逻辑实现
  - src - 游戏后端服务
    - login - 登录服务
    - controller.ts - 游戏房间控制器
    - socket.ts - 游戏通信实现
    - index.ts - 游戏服务入口
  - views - 游戏视图文件
    - games - 各个游戏视图
    - index.ejs - 游戏主视图
    - login.ejs - 登录视图
  - public - 游戏前端脚本与样式
    - games - 各个游戏前端脚本