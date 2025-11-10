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

## ⚙️ 调试
1. 执行`npm install`;
2. 使用 Visual Studio Code 运行调试（直接按下`F5`即可）。

## 📁 目录与文件
- .vscode - VSCode 调试配置
- lib - 核心类库
- game - 游戏示例入口

## 🚀 实现游戏

实现新的游戏只需编写三个文件：

- game/games/yourgame.js - 游戏逻辑入口文件；
- game/views/games/yourgame.ejs - 游戏视图文件；
- game/public/games/yourgame.js - 游戏前端脚本文件；